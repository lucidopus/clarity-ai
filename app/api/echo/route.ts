import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { parseJsonBody, isErrorResponse } from '@/lib/utils/api';
import { internalServerError } from '@/lib/errors/apiResponse';
import {
  getPendingEcho,
  submitEchoAnswer,
  skipEcho,
} from '@/lib/services/echo';
import { CLARITY_MODE } from '@/lib/limits';

/**
 * GET /api/echo — returns the latest pending Echo for the authenticated
 * user, filtered by the 48 h TTL at read time. Used by the EchoAnswerOverlay
 * at window open.
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();
    const pending = await getPendingEcho(decoded.userId);
    if (!pending) return NextResponse.json({ echo: null });
    return NextResponse.json({
      echo: {
        id: String(pending._id),
        question: pending.question,
        createdAt: pending.createdAt,
        sessionDate: pending.sessionDate,
      },
    });
  } catch (error) {
    console.error('Error fetching pending echo:', error);
    return internalServerError();
  }
}

const submitSchema = z.object({
  echoId: z.string().min(1),
  action: z.enum(['submit', 'skip']),
  attemptedAnswer: z.string().max(CLARITY_MODE.echo.maxAnswerChars).optional(),
  selfConfidence: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  ]).optional(),
});

/**
 * POST /api/echo — close a pending Echo, either by submitting an answer or
 * by skipping it. Body:
 *   { echoId, action: 'submit', attemptedAnswer, selfConfidence }
 *   { echoId, action: 'skip' }
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    const body = await parseJsonBody<z.infer<typeof submitSchema>>(request, 16_000);
    if (isErrorResponse(body)) return body;
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await dbConnect();

    if (parsed.data.action === 'skip') {
      const updated = await skipEcho(decoded.userId, parsed.data.echoId);
      if (!updated) {
        return NextResponse.json({ error: 'Echo not pending or not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, outcome: 'skipped' });
    }

    if (!parsed.data.attemptedAnswer || parsed.data.selfConfidence == null) {
      return NextResponse.json(
        { error: 'attemptedAnswer and selfConfidence are required for submit' },
        { status: 400 },
      );
    }

    const updated = await submitEchoAnswer({
      userId: decoded.userId,
      echoId: parsed.data.echoId,
      attemptedAnswer: parsed.data.attemptedAnswer,
      selfConfidence: parsed.data.selfConfidence,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Echo not pending or not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, outcome: 'answered' });
  } catch (error) {
    console.error('Error updating echo:', error);
    return internalServerError();
  }
}
