import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import {
  validateStudyContract,
  computeNextReminderAt,
  computeEditBudget,
  nextLocalMidnightUtc,
} from '@/lib/services/studyContract';
import { resolvePendingContract } from '@/lib/services/studyContract.server';
import { STUDY_CONTRACT } from '@/lib/limits';
import { internalServerError } from '@/lib/errors/apiResponse';

const contractSchema = z.object({
  windowStart: z.string(),
  windowEnd: z.string(),
  timezone: z.string(),
});

interface StoredContract {
  windowStart: string;
  windowEnd: string;
  timezone: string;
  contractedAt?: Date;
  pending?: {
    windowStart: string;
    windowEnd: string;
    timezone: string;
    effectiveAt: Date;
    queuedAt: Date;
  } | null;
  editHistory?: Date[];
}

/**
 * GET /api/streak-contract
 * Returns the user's active contract + any pending edit + edit budget state,
 * so the Settings page can render the full picture without a second fetch.
 * Lazily resolves pending → active before responding.
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    await resolvePendingContract(decoded.userId);

    const user = await User.findById(decoded.userId)
      .select('studyContract')
      .lean() as { studyContract?: StoredContract | null } | null;

    const contract = user?.studyContract ?? null;
    const budget = computeEditBudget(contract?.editHistory);

    return NextResponse.json({
      activeContract: contract
        ? {
            windowStart: contract.windowStart,
            windowEnd: contract.windowEnd,
            timezone: contract.timezone,
          }
        : null,
      pendingContract: contract?.pending ?? null,
      editsRemaining: budget.remaining,
      editBudgetMax: budget.max,
      editsResetAt: budget.resetAt,
    });
  } catch (error) {
    console.error('Error fetching study contract:', error);
    return internalServerError();
  }
}

/**
 * POST /api/streak-contract
 * Queues an edit to take effect at the next local midnight. First-time setup
 * (no existing contract) bypasses the budget and activates immediately.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const body = await request.json();
    const parsed = contractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Pick a start time, end time, and timezone.' },
        { status: 400 },
      );
    }
    const { windowStart, windowEnd, timezone } = parsed.data;
    const invalid = validateStudyContract(windowStart, windowEnd, timezone);
    if (invalid) {
      return NextResponse.json({ success: false, message: invalid }, { status: 400 });
    }

    await resolvePendingContract(decoded.userId);

    const user = await User.findById(decoded.userId)
      .select('studyContract')
      .lean() as { studyContract?: StoredContract | null } | null;

    const existing = user?.studyContract ?? null;
    const now = new Date();

    // First-time setup: no existing contract → activate directly. No budget
    // consumption, no pending step. Matches the issue #104 acceptance spec.
    if (!existing) {
      const contract = {
        windowStart,
        windowEnd,
        timezone,
        contractedAt: now,
        pending: null,
        editHistory: [],
        todayExtensions: null,
      };
      const nextReminderAt = computeNextReminderAt(windowStart, timezone);
      await User.updateOne(
        { _id: decoded.userId },
        { $set: { studyContract: contract, nextReminderAt } },
      );
      return NextResponse.json({
        success: true,
        activeContract: {
          windowStart: contract.windowStart,
          windowEnd: contract.windowEnd,
          timezone: contract.timezone,
        },
        pendingContract: null,
        editsRemaining: STUDY_CONTRACT.editBudget.max,
        editBudgetMax: STUDY_CONTRACT.editBudget.max,
        editsResetAt: null,
      });
    }

    // Reject if a pending edit already exists — must cancel first.
    if (existing.pending) {
      return NextResponse.json(
        {
          success: false,
          error: 'pending_edit_exists',
          message: 'You already have changes scheduled for tomorrow. Cancel them before queuing a new one.',
        },
        { status: 409 },
      );
    }

    // Enforce budget (pre-check for fast-path 429; the atomic write below
    // also enforces `pending: null` at filter-level so two concurrent POSTs
    // can't both queue).
    const budget = computeEditBudget(existing.editHistory, now);
    if (budget.remaining === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'edit_budget_exhausted',
          message: 'No edits left this week.',
          editsRemaining: 0,
          editBudgetMax: budget.max,
          editsResetAt: budget.resetAt,
        },
        { status: 429 },
      );
    }

    const effectiveAt = nextLocalMidnightUtc(timezone, now);
    const pending = {
      windowStart,
      windowEnd,
      timezone,
      effectiveAt,
      queuedAt: now,
    };
    const nextReminderAt = computeNextReminderAt(windowStart, timezone);

    // Atomic write: filter on `pending == null` guarantees only ONE of two
    // concurrent requests can succeed. The loser gets a 409 below. Slice
    // bound is 2× the budget so concurrent pushes never evict an in-window
    // entry (the rolling-7d filter in `computeEditBudget` does the real
    // gating; this bound just keeps the array finite).
    const sliceBound = STUDY_CONTRACT.editBudget.max * 2;
    const result = await User.updateOne(
      {
        _id: decoded.userId,
        'studyContract.pending': null,
      },
      {
        $set: {
          'studyContract.pending': pending,
          nextReminderAt,
        },
        $push: {
          'studyContract.editHistory': {
            $each: [now],
            $slice: -sliceBound,
          },
        },
      },
    );

    if (result.matchedCount === 0) {
      // Lost the race — another request queued a pending edit first.
      return NextResponse.json(
        {
          success: false,
          error: 'pending_edit_exists',
          message: 'You already have changes scheduled for tomorrow. Cancel them before queuing a new one.',
        },
        { status: 409 },
      );
    }

    const refreshed = computeEditBudget([...(existing.editHistory ?? []), now], now);

    return NextResponse.json({
      success: true,
      activeContract: {
        windowStart: existing.windowStart,
        windowEnd: existing.windowEnd,
        timezone: existing.timezone,
      },
      pendingContract: pending,
      editsRemaining: refreshed.remaining,
      editBudgetMax: refreshed.max,
      editsResetAt: refreshed.resetAt,
    });
  } catch (error) {
    console.error('Error saving study contract:', error);
    return internalServerError();
  }
}

/**
 * DELETE /api/streak-contract
 * Clears the user's contract entirely. Does not refund any consumed edits.
 */
export async function DELETE(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();
    await User.updateOne(
      { _id: decoded.userId },
      { $set: { studyContract: null, nextReminderAt: null } },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing study contract:', error);
    return internalServerError();
  }
}
