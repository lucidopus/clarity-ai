import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { parseJsonBody, isErrorResponse } from '@/lib/utils/api';
import { internalServerError } from '@/lib/errors/apiResponse';
import {
  getPendingStudyPromise,
  reviewStudyPromise,
} from '@/lib/services/studyPromise';
import { invalidatePromiseWeekly } from '@/lib/cache';

/**
 * GET /api/promise — returns the latest pending Promise for the
 * authenticated user, filtered by the 48 h TTL at read time. Used by the
 * PromiseReviewOverlay at the next window open (after the Echo overlay
 * chain dismisses).
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();
    const pending = await getPendingStudyPromise(decoded.userId);
    if (!pending) return NextResponse.json({ promise: null });
    return NextResponse.json({
      promise: {
        id: String(pending._id),
        text: pending.text,
        createdAt: pending.createdAt,
        sessionDate: pending.sessionDate,
      },
    });
  } catch (error) {
    console.error('Error fetching pending promise:', error);
    return internalServerError();
  }
}

const reviewSchema = z.object({
  promiseId: z.string().min(1),
  outcome: z.enum(['kept', 'broke', 'skipped']),
});

/**
 * POST /api/promise — close a pending Promise by self-reporting the
 * outcome. Body: { promiseId, outcome: 'kept' | 'broke' | 'skipped' }.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    const body = await parseJsonBody<z.infer<typeof reviewSchema>>(request, 2_000);
    if (isErrorResponse(body)) return body;
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await dbConnect();

    const updated = await reviewStudyPromise({
      userId: decoded.userId,
      promiseId: parsed.data.promiseId,
      outcome: parsed.data.outcome,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Promise not pending or not found' }, { status: 404 });
    }

    // Cache invalidation needs the user's timezone; fetch it lazily and only
    // when there's something to bust.
    const user = await User.findById(decoded.userId)
      .select('studyContract.timezone')
      .lean<{ studyContract?: { timezone?: string } | null } | null>();
    const tz = user?.studyContract?.timezone;
    if (tz) await invalidatePromiseWeekly(decoded.userId, tz);

    return NextResponse.json({ success: true, outcome: parsed.data.outcome });
  } catch (error) {
    console.error('Error reviewing promise:', error);
    return internalServerError();
  }
}
