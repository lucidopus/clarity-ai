import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import {
  isNowInContractWindow,
  contractSessionDate,
  minutesUntilWindowEnd,
} from '@/lib/services/studyContract';
import { resolvePendingContract } from '@/lib/services/studyContract.server';
import { STUDY_CONTRACT } from '@/lib/limits';
import { internalServerError } from '@/lib/errors/apiResponse';

const EXTENSION_MINUTES = STUDY_CONTRACT.extensionIncrements as readonly number[];

const extendSchema = z.object({
  minutes: z.number().int().refine(
    (v) => EXTENSION_MINUTES.includes(v),
    { message: 'Pick an extension of 15, 30, or 60 minutes.' },
  ),
});

interface StoredContract {
  windowStart: string;
  windowEnd: string;
  timezone: string;
  todayExtensions?: {
    date: string;
    count: number;
    totalMinutesAdded: number;
  } | null;
}

/**
 * POST /api/streak-contract/extend
 * Pushes the active window's end later. Only valid in-flow (inside the
 * already-extended window). Enforces 3×/day + 90min/day caps. Extensions
 * attributed to the contract's session-date so post-midnight extensions
 * still roll up to yesterday's StudyDay.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const body = await request.json().catch(() => null);
    const parsed = extendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Pick 15, 30, or 60 minutes to add.' },
        { status: 400 },
      );
    }
    const { minutes } = parsed.data;

    await resolvePendingContract(decoded.userId);

    const user = await User.findById(decoded.userId)
      .select('studyContract')
      .lean() as { studyContract?: StoredContract | null } | null;

    const contract = user?.studyContract ?? null;
    if (!contract) {
      return NextResponse.json(
        { success: false, message: 'Set your Clarity Mode hours before adding time.' },
        { status: 409 },
      );
    }

    const now = new Date();
    if (!isNowInContractWindow(contract, now)) {
      return NextResponse.json(
        { success: false, message: 'You can only add time while Clarity Mode is active.' },
        { status: 409 },
      );
    }

    // Session-date attribution. Extensions belong to the day the session
    // opened — so a post-midnight +30 still increments "yesterday" counters.
    const sessionDate = contractSessionDate(contract, now);
    if (!sessionDate) {
      return NextResponse.json(
        { success: false, message: 'Could not resolve your current session. Try again in a moment.' },
        { status: 409 },
      );
    }

    const { maxPerDay, maxMinutesPerDay } = STUDY_CONTRACT.extensions;

    // Fast-path 429 based on the pre-read (preserves friendly error codes
    // for the common case; the atomic increment below is the real enforcer).
    const existing = contract.todayExtensions;
    const current =
      existing && existing.date === sessionDate
        ? { count: existing.count, totalMinutesAdded: existing.totalMinutesAdded }
        : { count: 0, totalMinutesAdded: 0 };
    if (current.count + 1 > maxPerDay) {
      return NextResponse.json(
        {
          success: false,
          error: 'extension_count_exhausted',
          message: 'No extensions left for this session.',
          extensionsRemaining: 0,
          minutesRemaining: Math.max(0, maxMinutesPerDay - current.totalMinutesAdded),
        },
        { status: 429 },
      );
    }
    if (current.totalMinutesAdded + minutes > maxMinutesPerDay) {
      return NextResponse.json(
        {
          success: false,
          error: 'extension_minutes_exhausted',
          message: `That would exceed the ${maxMinutesPerDay}-minute cap.`,
          extensionsRemaining: Math.max(0, maxPerDay - current.count),
          minutesRemaining: Math.max(0, maxMinutesPerDay - current.totalMinutesAdded),
        },
        { status: 429 },
      );
    }

    // Step 1 — idempotent reset when the date key doesn't match (new
    // session, or first extension of the day). `$ne` matches null/missing.
    // Two concurrent "first extensions" can both pass this filter; the
    // second one's $set is a no-op rewrite of the same zeroed subdoc.
    await User.updateOne(
      {
        _id: decoded.userId,
        'studyContract.todayExtensions.date': { $ne: sessionDate },
      },
      {
        $set: {
          'studyContract.todayExtensions': {
            date: sessionDate,
            count: 0,
            totalMinutesAdded: 0,
          },
        },
      },
    );

    // Step 2 — atomic increment, cap-guarded at the filter level so two
    // concurrent +30 requests can't both land (the loser sees matchedCount=0
    // and we translate to a 429 with the server's authoritative state).
    const incResult = await User.updateOne(
      {
        _id: decoded.userId,
        'studyContract.todayExtensions.date': sessionDate,
        'studyContract.todayExtensions.count': { $lt: maxPerDay },
        'studyContract.todayExtensions.totalMinutesAdded': { $lte: maxMinutesPerDay - minutes },
      },
      {
        $inc: {
          'studyContract.todayExtensions.count': 1,
          'studyContract.todayExtensions.totalMinutesAdded': minutes,
        },
      },
    );

    if (incResult.matchedCount === 0) {
      // Lost the race — re-read to surface authoritative cap state.
      const fresh = await User.findById(decoded.userId)
        .select('studyContract.todayExtensions')
        .lean() as { studyContract?: { todayExtensions?: {
          date: string; count: number; totalMinutesAdded: number;
        } | null } | null } | null;
      const freshExt = fresh?.studyContract?.todayExtensions;
      const freshCount = freshExt?.date === sessionDate ? freshExt.count : 0;
      const freshMins = freshExt?.date === sessionDate ? freshExt.totalMinutesAdded : 0;
      return NextResponse.json(
        {
          success: false,
          error: 'extension_exhausted',
          message: 'Someone just added time — caps hit. Try a smaller increment.',
          extensionsRemaining: Math.max(0, maxPerDay - freshCount),
          minutesRemaining: Math.max(0, maxMinutesPerDay - freshMins),
        },
        { status: 429 },
      );
    }

    const updated = {
      date: sessionDate,
      count: current.count + 1,
      totalMinutesAdded: current.totalMinutesAdded + minutes,
    };
    const newMinutesRemaining = minutesUntilWindowEnd(
      { ...contract, todayExtensions: updated },
      now,
    );

    return NextResponse.json({
      success: true,
      extensionsRemaining: Math.max(0, maxPerDay - updated.count),
      minutesRemaining: Math.max(0, maxMinutesPerDay - updated.totalMinutesAdded),
      minutesLeftInWindow: newMinutesRemaining,
      todayExtensions: updated,
    });
  } catch (error) {
    console.error('Error extending study contract:', error);
    return internalServerError();
  }
}
