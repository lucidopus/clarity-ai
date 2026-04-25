import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { parseJsonBody, isErrorResponse } from '@/lib/utils/api';
import { internalServerError } from '@/lib/errors/apiResponse';
import { createStudyPromise, DuplicateStudyPromiseError } from '@/lib/services/studyPromise';
import {
  contractSessionDate,
  isNowInContractWindow,
  isNowInContractCloseGrace,
} from '@/lib/services/studyContract';
import { CLARITY_MODE } from '@/lib/limits';
import { invalidatePromiseWeekly } from '@/lib/cache';

const createSchema = z.object({
  text: z.string().min(1).max(CLARITY_MODE.promise.maxTextChars),
});

/**
 * POST /api/promise/create — captures the close-of-window Promise for the
 * authenticated user. Derives `sessionDate` from the user's contract + the
 * current instant so clients can't spoof it.
 *
 * Acceptance window: in-window OR within `closeGraceMinutes` after windowEnd.
 * The Promise fires *after* the window closes (during Horizon Dissolve), so
 * the API has to accept writes during that envelope and a brief slack.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const body = await parseJsonBody<z.infer<typeof createSchema>>(request, 4_000);
    if (isErrorResponse(body)) return body;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await dbConnect();

    const user = await User.findById(decoded.userId)
      .select('studyContract')
      .lean<{ studyContract?: { windowStart: string; windowEnd: string; timezone: string } | null } | null>();
    const contract = user?.studyContract ?? null;
    if (!contract) {
      return NextResponse.json({ error: 'No study contract configured' }, { status: 400 });
    }

    const now = new Date();
    const graceMs = CLARITY_MODE.promise.closeGraceMinutes * 60 * 1000;
    const inWindow = isNowInContractWindow(contract, now);
    const inGrace = !inWindow && isNowInContractCloseGrace(contract, now, graceMs);
    if (!inWindow && !inGrace) {
      return NextResponse.json(
        { error: 'Promise can only be set inside or just after your Clarity Mode window' },
        { status: 409 },
      );
    }

    // For the close-grace path, anchor sessionDate to the just-closed
    // window by probing 1 ms back. `isNowInContractCloseGrace` already
    // confirmed `closeAt ≤ now`, so `now - 1 ms` is guaranteed to sit
    // inside the same session whose closing edge we're in the grace tail
    // of — no risk of the probe landing before windowStart even for the
    // shortest valid window.
    let sessionDate: string | null;
    if (inWindow) {
      sessionDate = contractSessionDate(contract, now);
    } else {
      const probe = new Date(now.getTime() - 1);
      sessionDate = contractSessionDate(contract, probe);
    }
    if (!sessionDate) {
      return NextResponse.json({ error: 'Could not derive session date' }, { status: 500 });
    }

    try {
      const promise = await createStudyPromise({
        userId: decoded.userId,
        sessionDate,
        text: parsed.data.text,
      });
      await invalidatePromiseWeekly(decoded.userId, contract.timezone);
      return NextResponse.json({
        success: true,
        promise: {
          id: String(promise._id),
          text: promise.text,
          sessionDate: promise.sessionDate,
        },
      });
    } catch (err) {
      if (err instanceof DuplicateStudyPromiseError) {
        return NextResponse.json(
          { error: 'You already left a promise for this session' },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (error) {
    console.error('Error creating promise:', error);
    return internalServerError();
  }
}
