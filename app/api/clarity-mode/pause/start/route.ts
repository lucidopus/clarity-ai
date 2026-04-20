import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import StudyDay from '@/lib/models/StudyDay';
import { internalServerError } from '@/lib/errors/apiResponse';
import {
  contractWindowMinutes,
  isNowInContractWindow,
} from '@/lib/services/studyContract';
import { computePauseBudgetMinutes } from '@/lib/services/pauseBudget';

function getUTCDateString(now: Date = new Date()): string {
  return now.toISOString().split('T')[0];
}

interface PauseResponse {
  pauseStartedAt: string;
  pauseSecondsUsed: number;
  pauseMinutesBudgeted: number;
  pauseCount: number;
}

/**
 * POST /api/clarity-mode/pause/start
 *
 * Start a pause for the authenticated user. Atomic guards:
 *   - 409 if user is outside the window (pause is a in-window affordance).
 *   - 409 if another pause is already in flight (`pauseStartedAt !== null`).
 *   - 409 if the budget is already fully spent.
 *
 * Uses a single `findOneAndUpdate` with filter-level guards so two racing
 * requests can't both win. The second will match nothing and we surface 409.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
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

    const windowMin = contractWindowMinutes(contract) ?? 0;
    const budget = computePauseBudgetMinutes(windowMin);

    const date = getUTCDateString(now);
    const userObjectId = new mongoose.Types.ObjectId(decoded.userId);

    // MongoDB Atlas rejects `$expr` inside an upsert filter (feature-gated
    // by the Atlas tier). Two-step instead:
    //   1) ensure today's StudyDay exists, capturing the budget on insert,
    //   2) atomically start the pause with the usual filter guards (no upsert).

    // Step 1 — upsert-or-noop. We never overwrite pauseMinutesBudgeted once
    // set; `$setOnInsert` runs only on insert, so the budget stays immutable
    // for the rest of the day even if the user later edits their contract.
    await StudyDay.updateOne(
      { userId: userObjectId, date },
      { $setOnInsert: { pauseMinutesBudgeted: budget } },
      { upsert: true },
    );

    // Read back authoritative state so we can distinguish "already paused"
    // from "budget exhausted" for UX without racing the write.
    const current = await StudyDay.findOne({ userId: userObjectId, date })
      .select('pauseStartedAt pauseSecondsUsed pauseMinutesBudgeted pauseCount')
      .lean<{
        pauseStartedAt: Date | null;
        pauseSecondsUsed?: number;
        pauseMinutesBudgeted?: number;
        pauseCount?: number;
      } | null>();

    if (current?.pauseStartedAt) {
      return NextResponse.json(
        { error: 'Pause already in flight', reason: 'already_paused' },
        { status: 409 },
      );
    }

    const storedBudget = current?.pauseMinutesBudgeted || budget;
    const budgetSec = storedBudget * 60;
    const used = current?.pauseSecondsUsed ?? 0;
    if (used >= budgetSec) {
      return NextResponse.json(
        { error: 'Pause budget exhausted', reason: 'budget_exhausted' },
        { status: 409 },
      );
    }

    // Step 2 — atomic start. Filter still requires `pauseStartedAt: null`
    // AND `pauseSecondsUsed < budgetSec` so two racing starts can't both
    // win. The second one's filter matches nothing and we map to 409 below.
    const updated = await StudyDay.findOneAndUpdate(
      {
        userId: userObjectId,
        date,
        pauseStartedAt: null,
        pauseSecondsUsed: { $lt: budgetSec },
      },
      {
        $set: { pauseStartedAt: now },
        $inc: { pauseCount: 1 },
      },
      { new: true },
    ).lean<{
      pauseStartedAt: Date | null;
      pauseSecondsUsed?: number;
      pauseMinutesBudgeted?: number;
      pauseCount?: number;
    } | null>();

    if (!updated || !updated.pauseStartedAt) {
      // Someone else won the race, or accounting shifted between our read
      // and the atomic write. Report as already-paused since that's the
      // likeliest cause and UX-safe.
      return NextResponse.json(
        { error: 'Pause already in flight', reason: 'already_paused' },
        { status: 409 },
      );
    }

    const body: PauseResponse = {
      pauseStartedAt: (updated.pauseStartedAt as Date).toISOString(),
      pauseSecondsUsed: updated.pauseSecondsUsed ?? 0,
      pauseMinutesBudgeted: updated.pauseMinutesBudgeted || storedBudget,
      pauseCount: updated.pauseCount ?? 1,
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error('Error starting pause:', error);
    return internalServerError();
  }
}

/**
 * GET /api/clarity-mode/pause/start — lightweight snapshot of today's
 * pause accounting so the client can rehydrate from server state. Used on
 * mount (and on visibility-return) to recover from a mid-pause refresh.
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const user = await User.findById(decoded.userId)
      .select('studyContract')
      .lean<{ studyContract?: { windowStart: string; windowEnd: string; timezone: string } | null } | null>();
    const contract = user?.studyContract ?? null;
    const windowMin = contractWindowMinutes(contract) ?? 0;
    const budget = computePauseBudgetMinutes(windowMin);

    const date = getUTCDateString();
    const userObjectId = new mongoose.Types.ObjectId(decoded.userId);
    const doc = await StudyDay.findOne({ userId: userObjectId, date })
      .select('pauseStartedAt pauseSecondsUsed pauseMinutesBudgeted pauseCount')
      .lean<{
        pauseStartedAt: Date | null;
        pauseSecondsUsed?: number;
        pauseMinutesBudgeted?: number;
        pauseCount?: number;
      } | null>();

    return NextResponse.json({
      pauseStartedAt: doc?.pauseStartedAt ? (doc.pauseStartedAt as Date).toISOString() : null,
      pauseSecondsUsed: doc?.pauseSecondsUsed ?? 0,
      pauseMinutesBudgeted: doc?.pauseMinutesBudgeted || budget,
      pauseCount: doc?.pauseCount ?? 0,
      inWindow: contract ? isNowInContractWindow(contract) : false,
    });
  } catch (error) {
    console.error('Error loading pause state:', error);
    return internalServerError();
  }
}
