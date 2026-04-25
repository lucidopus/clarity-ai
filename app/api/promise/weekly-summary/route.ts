import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { internalServerError } from '@/lib/errors/apiResponse';
import { getWeeklyPromiseSummary } from '@/lib/services/studyPromise';
import { CacheKeys, getCached } from '@/lib/cache';

/**
 * GET /api/promise/weekly-summary — returns the rolling 7-day Promise
 * ratio for the dashboard card. Cached for 60 s, keyed on `(userId,
 * timezone)` so a DST flip doesn't bleed a stale window into the next read.
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const user = await User.findById(decoded.userId)
      .select('studyContract.timezone')
      .lean<{ studyContract?: { timezone?: string } | null } | null>();
    const timezone = user?.studyContract?.timezone ?? 'UTC';

    const summary = await getCached(
      CacheKeys.promiseWeekly(decoded.userId, timezone),
      async () => {
        const result = await getWeeklyPromiseSummary(decoded.userId);
        return {
          kept: result.kept,
          total: result.total,
          windowStart: result.windowStart.toISOString(),
          windowEnd: result.windowEnd.toISOString(),
        };
      },
      60,
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching weekly promise summary:', error);
    return internalServerError();
  }
}
