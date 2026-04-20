import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { parseJsonBody, isErrorResponse } from '@/lib/utils/api';
import { internalServerError } from '@/lib/errors/apiResponse';
import { createEcho, DuplicateEchoError } from '@/lib/services/echo';
import {
  contractSessionDate,
  isNowInContractWindow,
} from '@/lib/services/studyContract';
import { CLARITY_MODE } from '@/lib/limits';

const createSchema = z.object({
  question: z.string().min(1).max(CLARITY_MODE.echo.maxQuestionChars),
  wasClaraAssisted: z.boolean().optional(),
});

/**
 * POST /api/echo/create — writes the T-3 "one question" Echo for the
 * authenticated user. Derives `sessionDate` from the user's contract +
 * the current instant so clients can't spoof it. Rejects outside the
 * active window (no Echo without a session).
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const body = await parseJsonBody<z.infer<typeof createSchema>>(request, 8_000);
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
    if (!isNowInContractWindow(contract, now)) {
      return NextResponse.json({ error: 'Clarity Mode is not active right now' }, { status: 409 });
    }

    const sessionDate = contractSessionDate(contract, now);
    if (!sessionDate) {
      return NextResponse.json({ error: 'Could not derive session date' }, { status: 500 });
    }

    try {
      const echo = await createEcho({
        userId: decoded.userId,
        sessionDate,
        question: parsed.data.question,
        wasClaraAssisted: parsed.data.wasClaraAssisted,
      });
      return NextResponse.json({
        success: true,
        echo: {
          id: String(echo._id),
          question: echo.question,
          sessionDate: echo.sessionDate,
        },
      });
    } catch (err) {
      if (err instanceof DuplicateEchoError) {
        return NextResponse.json(
          { error: 'You already wrote an Echo for this session' },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (error) {
    console.error('Error creating echo:', error);
    return internalServerError();
  }
}
