import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import StudyDay from '@/lib/models/StudyDay';
import { internalServerError } from '@/lib/errors/apiResponse';
import { contractWindowMinutes } from '@/lib/services/studyContract';
import { computePauseBudgetMinutes } from '@/lib/services/pauseBudget';

function getUTCDateString(now: Date = new Date()): string {
  return now.toISOString().split('T')[0];
}

/**
 * POST /api/clarity-mode/pause/resume
 *
 * Resume from a pause. Computes the elapsed delta server-side, clamps it to
 * the remaining budget so a long-running pause can't over-bill, and writes
 * the update atomically with a filter-level guard.
 *
 * Returns 409 if no pause is in flight.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const user = await User.findById(decoded.userId)
      .select('studyContract')
      .lean<{ studyContract?: { windowStart: string; windowEnd: string; timezone: string } | null } | null>();
    const windowMin = contractWindowMinutes(user?.studyContract) ?? 0;
    const computedBudget = computePauseBudgetMinutes(windowMin);

    const now = new Date();
    const date = getUTCDateString(now);
    const userObjectId = new mongoose.Types.ObjectId(decoded.userId);

    // Read → clamp → conditional write. Filter still requires `pauseStartedAt`
    // to match exactly what we just read, so a racing resume loses.
    const current = await StudyDay.findOne({ userId: userObjectId, date })
      .select('pauseStartedAt pauseSecondsUsed pauseMinutesBudgeted pauseCount')
      .lean<{
        pauseStartedAt: Date | null;
        pauseSecondsUsed?: number;
        pauseMinutesBudgeted?: number;
        pauseCount?: number;
      } | null>();

    if (!current || !current.pauseStartedAt) {
      return NextResponse.json(
        { error: 'No pause in flight', reason: 'not_paused' },
        { status: 409 },
      );
    }

    const budget = current.pauseMinutesBudgeted || computedBudget;
    const budgetSec = budget * 60;
    const alreadyUsed = current.pauseSecondsUsed ?? 0;
    const startedAt = current.pauseStartedAt as Date;
    const rawDeltaSec = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));
    // Clamp so a sleeping laptop / auto-resume can't over-bill the budget.
    const remaining = Math.max(0, budgetSec - alreadyUsed);
    const deltaSec = Math.min(rawDeltaSec, remaining);

    const updated = await StudyDay.findOneAndUpdate(
      {
        userId: userObjectId,
        date,
        pauseStartedAt: startedAt,
      },
      {
        $set: { pauseStartedAt: null },
        $inc: { pauseSecondsUsed: deltaSec },
      },
      { new: true },
    ).lean<{
      pauseStartedAt: Date | null;
      pauseSecondsUsed?: number;
      pauseMinutesBudgeted?: number;
      pauseCount?: number;
    } | null>();

    if (!updated) {
      // Someone else raced us; return the current state.
      return NextResponse.json(
        { error: 'Pause state changed during resume', reason: 'race_lost' },
        { status: 409 },
      );
    }

    return NextResponse.json({
      pauseStartedAt: null,
      pauseSecondsUsed: updated.pauseSecondsUsed ?? 0,
      pauseMinutesBudgeted: updated.pauseMinutesBudgeted || budget,
      pauseCount: updated.pauseCount ?? 0,
      deltaSec,
    });
  } catch (error) {
    console.error('Error resuming pause:', error);
    return internalServerError();
  }
}
