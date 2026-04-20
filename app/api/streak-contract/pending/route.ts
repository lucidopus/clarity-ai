import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import {
  computeEditBudget,
  computeNextReminderAt,
} from '@/lib/services/studyContract';
import { internalServerError } from '@/lib/errors/apiResponse';

interface StoredContract {
  windowStart?: string;
  timezone?: string;
  editHistory?: Date[];
  pending?: unknown;
}

/**
 * DELETE /api/streak-contract/pending
 * Cancels a queued edit. The consumed edit stays in `editHistory` — no
 * refund — to prevent save→cancel→save abuse of the weekly budget.
 *
 * Also recomputes `nextReminderAt` from the active (un-changed) contract —
 * POST /streak-contract stamped it to the PENDING windowStart when the
 * edit was queued, so canceling must undo that or the pre-window email
 * will fire at the wrong time.
 */
export async function DELETE(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const user = await User.findById(decoded.userId)
      .select('studyContract.editHistory studyContract.pending studyContract.windowStart studyContract.timezone')
      .lean() as { studyContract?: StoredContract | null } | null;

    if (!user?.studyContract?.pending) {
      return NextResponse.json(
        { success: false, message: 'Nothing scheduled to cancel.' },
        { status: 404 },
      );
    }

    // Reset reminder to the ACTIVE contract (the one still in effect).
    const active = user.studyContract;
    const nextReminderAt =
      active.windowStart && active.timezone
        ? computeNextReminderAt(active.windowStart, active.timezone)
        : null;

    await User.updateOne(
      { _id: decoded.userId },
      {
        $set: {
          'studyContract.pending': null,
          nextReminderAt,
        },
      },
    );

    const budget = computeEditBudget(user.studyContract.editHistory);
    return NextResponse.json({
      success: true,
      editsRemaining: budget.remaining,
      editBudgetMax: budget.max,
      editsResetAt: budget.resetAt,
    });
  } catch (error) {
    console.error('Error cancelling pending contract:', error);
    return internalServerError();
  }
}
