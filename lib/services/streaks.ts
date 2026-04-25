import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import StudyDay from '@/lib/models/StudyDay';
import Flashcard from '@/lib/models/Flashcard';
import DailyChallenge from '@/lib/models/DailyChallenge';
import { recordChallengeActivity } from './dailyChallenges';
import { isNowInContractWindow, effectiveWindowAt } from './studyContract';
import { resolvePendingContract } from './studyContract.server';

export type ActivityType =
  | 'flashcard_review'
  | 'quiz_completed'
  | 'source_processed'
  | 'flashcard_created'
  | 'document_study_session';

export type DayTier = 'empty' | 'gray' | 'orange' | 'gold';

export interface StreakResult {
  studyStreak: number;
  longestStudyStreak: number;
  shields: number;
  milestoneReached?: number; // defined only when a new milestone is achieved this call
  recoveryActive?: boolean;
  recoveryDeadline?: Date | null;
  shieldEarned?: boolean; // true only when shields count actually increased
  shieldConsumed?: boolean; // true when a shield was used to save the streak
  todayTier?: DayTier;
}

// Milestone spacing follows the Lally-2010 habit-automaticity curve
// (median time-to-automaticity is ~66 days). 7/21/66/180/365 is the
// scientifically-motivated version of the old 7/30/100/365.
export const MILESTONES = [7, 21, 66, 180, 365];

// Cap on simultaneously-held shields (matches the User schema enum).
export const SHIELD_CAP = 3;

// Thresholds for qualifying a "study day"
const HARD_RECOVERY_REVIEWS = 10;
const HARD_RECOVERY_QUIZZES = 2;

// Anti-laziness cap: at most one 48h recovery redemption per rolling 30-day window.
// Research: prevents the "over-safety paradox" where shields + recovery compound.
export const RECOVERY_CAP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const RECOVERY_CAP_COUNT = 1;

export type StreakAction =
  | 'firstEver'
  | 'increment'
  | 'shield'
  | 'recover'
  | 'reset'
  | 'recoveryPending'
  | 'noop';

const ACTIVITY_FIELD: Record<ActivityType, string> = {
  flashcard_review: 'flashcardReviews',
  quiz_completed: 'quizzesCompleted',
  source_processed: 'sourcesProcessed',
  flashcard_created: 'flashcardsCreated',
  document_study_session: 'documentStudySessions',
};

function getUTCDateString(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function daysDiff(laterDate: string, earlierDate: string): number {
  return Math.round(
    (new Date(`${laterDate}T00:00:00Z`).getTime() -
      new Date(`${earlierDate}T00:00:00Z`).getTime()) /
      86_400_000
  );
}

interface DayActivity {
  flashcardReviews: number;
  quizzesCompleted: number;
  sourcesProcessed: number;
  flashcardsCreated: number;
  documentStudySessions: number;
}

function meetsThreshold(day: DayActivity): boolean {
  return (
    day.flashcardReviews >= 5 ||
    day.quizzesCompleted >= 1 ||
    day.sourcesProcessed >= 1 ||
    day.flashcardsCreated >= 3 ||
    day.documentStudySessions >= 1
  );
}

// Harder threshold required to restore a streak during the 48h recovery window
function meetsHardThreshold(day: DayActivity): boolean {
  return (
    day.flashcardReviews >= HARD_RECOVERY_REVIEWS ||
    day.quizzesCompleted >= HARD_RECOVERY_QUIZZES
  );
}

// Recovery window closes 48h after the missed day starts: lastStudy + 3 days 00:00Z
export function computeRecoveryCutoff(lastStudy: string): Date {
  const d = new Date(`${lastStudy}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3);
  return d;
}

/**
 * Decide which streak action to take given the user's prior state plus
 * today's activity counters. Pure — all DB-fetched data is passed in.
 *
 * Returns `{ action: 'noop' }` when the call should be treated as already-
 * counted (same UTC day or stale lastStudy). Otherwise returns the action and,
 * for `shield`, the number of shields to spend (one per bridged missed day).
 *
 * Decision priority for `diff > 1`:
 *   1. shield  — when shields >= diff - 1 (all-or-nothing bridge)
 *   2. recover — within 48h cutoff, recovery cap not hit, hard threshold met
 *   3. recoveryPending — within 48h cutoff, recovery cap not hit, soft threshold only
 *   4. reset   — past 48h cutoff, or recovery cap exhausted
 */
export function decideStreakAction(input: {
  lastStudy: string | null | undefined;
  today: string;
  shields: number;
  recoveryRedemptions: Date[];
  now: Date;
  todayActivity: DayActivity;
}): { action: StreakAction; shieldsToConsume: number } {
  const { lastStudy, today, shields, recoveryRedemptions, now, todayActivity } = input;

  if (!lastStudy) {
    return { action: 'firstEver', shieldsToConsume: 0 };
  }
  const diff = daysDiff(today, lastStudy);
  if (diff <= 0) {
    return { action: 'noop', shieldsToConsume: 0 };
  }
  if (diff === 1) {
    return { action: 'increment', shieldsToConsume: 0 };
  }
  if (diff >= 2 && shields >= diff - 1) {
    return { action: 'shield', shieldsToConsume: diff - 1 };
  }
  const cutoff = computeRecoveryCutoff(lastStudy);
  if (now < cutoff) {
    const recent = recoveryRedemptions.filter(
      (d) => now.getTime() - new Date(d).getTime() < RECOVERY_CAP_WINDOW_MS,
    );
    if (recent.length >= RECOVERY_CAP_COUNT) {
      return { action: 'reset', shieldsToConsume: 0 };
    }
    return {
      action: meetsHardThreshold(todayActivity) ? 'recover' : 'recoveryPending',
      shieldsToConsume: 0,
    };
  }
  return { action: 'reset', shieldsToConsume: 0 };
}

/**
 * Apply a decided streak action to the prior state. Pure — produces the
 * new (streak, longest, shields, milestone) tuple plus event flags. Callers
 * persist these. `noop` and `recoveryPending` are not state-advancing — the
 * caller should short-circuit before this is invoked.
 */
export function applyStreakAction(input: {
  action: StreakAction;
  shieldsToConsume: number;
  prevStreak: number;
  prevLongest: number;
  prevShields: number;
  prevMilestones: number[];
}): {
  newStreak: number;
  newLongest: number;
  newShields: number;
  newMilestone: number | undefined;
  shieldConsumed: boolean;
  shieldEarned: boolean;
} {
  const { action, shieldsToConsume, prevStreak, prevLongest, prevShields, prevMilestones } = input;

  let newStreak = 1;
  let shieldConsumed = false;
  switch (action) {
    case 'firstEver':
    case 'reset':
      newStreak = 1;
      break;
    case 'increment':
    case 'recover':
      newStreak = prevStreak + 1;
      break;
    case 'shield':
      newStreak = prevStreak + 1;
      shieldConsumed = true;
      break;
    case 'noop':
    case 'recoveryPending':
      // Caller should not be applying these — return unchanged state defensively.
      newStreak = prevStreak;
      break;
  }

  const newLongest = Math.max(prevLongest, newStreak);
  const newMilestone = MILESTONES.find((m) => newStreak >= m && !prevMilestones.includes(m));

  let newShields = prevShields;
  if (shieldConsumed) newShields = Math.max(0, newShields - shieldsToConsume);
  // Earn a shield every 7 consecutive days, capped at SHIELD_CAP.
  const eligibleForEarn = newStreak > 0 && newStreak % 7 === 0;
  if (eligibleForEarn) {
    newShields = Math.min(SHIELD_CAP, newShields + 1);
  }
  const shieldEarned = newShields > prevShields;

  return { newStreak, newLongest, newShields, newMilestone, shieldConsumed, shieldEarned };
}

// Compose a day's visual tier from the flags on the StudyDay doc.
export function dayTier(day: {
  qualifies?: boolean;
  fsrsQueueCleared?: boolean;
  challengesCompleted?: boolean;
  inContractWindow?: boolean;
} | null | undefined): DayTier {
  if (!day?.qualifies) return 'empty';
  if (day.fsrsQueueCleared && day.challengesCompleted && day.inContractWindow) return 'gold';
  if (day.fsrsQueueCleared) return 'orange';
  return 'gray';
}

/**
 * Compute tier flags for a user's current day based on live state. Returns the
 * fields to set on the StudyDay doc; each is sticky-true — we never roll back a
 * flag that's already set today, even if a later re-check would return false.
 *
 * `contract` is the user's current studyContract (nullable) used to decide the
 * in-window flag. We pass it in so the caller can do a single User read.
 */
async function computeTierFlags(
  userId: string,
  existing: {
    fsrsQueueCleared?: boolean;
    challengesCompleted?: boolean;
    inContractWindow?: boolean;
  },
  contract: {
    windowStart: string;
    windowEnd: string;
    timezone: string;
    todayExtensions?: { date: string; count: number; totalMinutesAdded: number } | null;
  } | null,
  date: string,
): Promise<{ fsrsQueueCleared: boolean; challengesCompleted: boolean; inContractWindow: boolean }> {
  const [dueNow, challengeDoc] = await Promise.all([
    existing.fsrsQueueCleared
      ? Promise.resolve(-1)
      : Flashcard.countDocuments({ userId, 'fsrs.due': { $lte: new Date() } }),
    existing.challengesCompleted
      ? Promise.resolve(null)
      : DailyChallenge.findOne({ userId, date }).select('allCompleted').lean() as Promise<{ allCompleted?: boolean } | null>,
  ]);

  const fsrsQueueCleared = existing.fsrsQueueCleared || dueNow === 0;
  const challengesCompleted = existing.challengesCompleted || !!challengeDoc?.allCompleted;
  const inContractWindow =
    existing.inContractWindow || isNowInContractWindow(contract);

  return { fsrsQueueCleared, challengesCompleted, inContractWindow };
}

/**
 * Records a study activity for streak tracking.
 * - Increments the day's activity counter.
 * - When qualification threshold is first crossed, updates the user's streak.
 * - Returns the user's current streak state (null if user not found).
 *
 * Safe to call concurrently — uses an atomic claim to avoid double-processing.
 */
export async function recordStudyActivity(
  userId: string,
  activityType: ActivityType
): Promise<StreakResult | null> {
  await dbConnect();

  // Lazy pending→active promotion so the rest of this function sees the
  // current contract (issue #104). No-op when nothing is due.
  await resolvePendingContract(userId);

  const now = new Date();
  const todayUtc = getUTCDateString(now);

  // Session-date attribution for extensions that spill across UTC midnight.
  // When the user is still inside yesterday's extended session (e.g. 23:00
  // window extended to 00:30), we want the gold-tier credit to land on the
  // day the session opened, not on today's UTC date. Only deviates from
  // todayUtc when the session opened on a different UTC day.
  const contractDoc = await User.findById(userId).select('studyContract').lean() as {
    studyContract?: {
      windowStart: string;
      windowEnd: string;
      timezone: string;
      todayExtensions?: { date: string; count: number; totalMinutesAdded: number } | null;
    } | null;
  } | null;
  const win = effectiveWindowAt(contractDoc?.studyContract ?? null, now);
  const sessionUtc = win ? win.openAt.toISOString().split('T')[0] : null;
  const today = sessionUtc && sessionUtc !== todayUtc ? sessionUtc : todayUtc;

  // Atomically increment the day's activity counter
  const studyDay = await StudyDay.findOneAndUpdate(
    { userId, date: today },
    { $inc: { [ACTIVITY_FIELD[activityType]]: 1 } },
    { upsert: true, new: true }
  );

  // Update daily challenges (fire-and-forget — don't block the response)
  recordChallengeActivity(userId, today, activityType).catch(() => {});

  // Helper that recomputes tier flags, persists any that flipped to true, and
  // returns the resulting tier. Kept inline so both the "nothing to update"
  // early returns and the post-streak-update path use identical logic.
  const refreshTierAndReturn = async (base: StreakResult | null): Promise<StreakResult | null> => {
    if (!base) return base;
    const fresh = await StudyDay.findOne({ userId, date: today })
      .select('qualifies fsrsQueueCleared challengesCompleted inContractWindow')
      .lean() as {
        qualifies?: boolean;
        fsrsQueueCleared?: boolean;
        challengesCompleted?: boolean;
        inContractWindow?: boolean;
      } | null;
    if (!fresh?.qualifies) {
      return { ...base, todayTier: 'empty' };
    }
    const u = await User.findById(userId).select('studyContract').lean() as {
      studyContract?: {
        windowStart: string;
        windowEnd: string;
        timezone: string;
        todayExtensions?: { date: string; count: number; totalMinutesAdded: number } | null;
      } | null;
    } | null;
    const flags = await computeTierFlags(userId, fresh, u?.studyContract ?? null, today);
    const changedFields: Record<string, boolean> = {};
    if (flags.fsrsQueueCleared !== !!fresh.fsrsQueueCleared) changedFields.fsrsQueueCleared = flags.fsrsQueueCleared;
    if (flags.challengesCompleted !== !!fresh.challengesCompleted) changedFields.challengesCompleted = flags.challengesCompleted;
    if (flags.inContractWindow !== !!fresh.inContractWindow) changedFields.inContractWindow = flags.inContractWindow;
    if (Object.keys(changedFields).length > 0) {
      await StudyDay.updateOne({ userId, date: today }, { $set: changedFields });
    }
    return { ...base, todayTier: dayTier({ qualifies: true, ...flags }) };
  };

  // Helper to return the user's current streak without modifying it
  const currentStats = async (): Promise<StreakResult | null> => {
    const u = await User.findById(userId)
      .select('studyStreak longestStudyStreak streakShields streakRecoveryDeadline')
      .lean() as {
        studyStreak?: number;
        longestStudyStreak?: number;
        streakShields?: number;
        streakRecoveryDeadline?: Date | null;
      } | null;
    if (!u) return null;
    const deadline = u.streakRecoveryDeadline ?? null;
    return {
      studyStreak: u.studyStreak ?? 0,
      longestStudyStreak: u.longestStudyStreak ?? 0,
      shields: u.streakShields ?? 0,
      recoveryActive: !!(deadline && deadline > new Date()),
      recoveryDeadline: deadline,
    };
  };

  // If thresholds not met yet, nothing to do for the streak
  if (!meetsThreshold(studyDay)) return refreshTierAndReturn(await currentStats());

  // If today already qualifies, the streak was already updated earlier today
  if (studyDay.qualifies) return refreshTierAndReturn(await currentStats());

  // Load user for streak computation
  const user = await User.findById(userId);
  if (!user) return null;

  const lastStudy = user.lastStudyDate;

  const { action, shieldsToConsume } = decideStreakAction({
    lastStudy,
    today,
    shields: user.streakShields ?? 0,
    recoveryRedemptions: user.recoveryRedemptions ?? [],
    now,
    todayActivity: studyDay,
  });

  // Same UTC day or stale data — already counted.
  if (action === 'noop') {
    return refreshTierAndReturn(await currentStats());
  }

  // Recovery-pending: user studied today but hasn't met the hard threshold yet.
  // Set the deadline (so UI can show a timer) but DON'T claim qualifies — we want
  // a subsequent activity that pushes hard threshold to still trigger recovery.
  if (action === 'recoveryPending' && lastStudy) {
    const cutoff = computeRecoveryCutoff(lastStudy);
    const existing = user.streakRecoveryDeadline?.getTime();
    if (existing !== cutoff.getTime()) {
      await User.updateOne(
        { _id: userId },
        { $set: { streakRecoveryDeadline: cutoff } }
      );
    }
    return refreshTierAndReturn(await currentStats());
  }

  // Atomically claim the qualifying transition (prevents duplicate streak updates
  // if two requests arrive simultaneously after crossing the threshold)
  const claimed = await StudyDay.findOneAndUpdate(
    { userId, date: today, qualifies: false },
    { $set: { qualifies: true } },
    { new: false }
  );
  if (!claimed) return refreshTierAndReturn(await currentStats()); // another request got there first

  const {
    newStreak,
    newLongest,
    newShields,
    newMilestone,
    shieldConsumed,
    shieldEarned,
  } = applyStreakAction({
    action,
    shieldsToConsume,
    prevStreak: user.studyStreak ?? 0,
    prevLongest: user.longestStudyStreak ?? 0,
    prevShields: user.streakShields ?? 0,
    prevMilestones: user.milestones ?? [],
  });

  // Persist updated streak state and always clear the recovery deadline after a
  // definitive streak action (increment / shield / recover / reset).
  //
  // `lastStudyDate` is always stamped with the current UTC calendar day, NOT
  // the session-attribution day. Without this, a cross-midnight extension
  // that credits yesterday's session (today=yesterdayUtc) would leave
  // lastStudyDate=yesterdayUtc. The user's next-day morning study would then
  // compute diff=1 and increment the streak AGAIN for the same calendar day.
  // Tier flags still land on the session-attribution StudyDay doc via
  // `today`; only the streak anchor advances to todayUtc.
  const shieldSet: Record<string, unknown> = {
    studyStreak: newStreak,
    longestStudyStreak: newLongest,
    lastStudyDate: todayUtc,
    streakShields: newShields,
    streakRecoveryDeadline: null,
  };
  if (shieldEarned) {
    shieldSet.lastShieldEvent = { type: 'earned', at: new Date() };
  } else if (shieldConsumed) {
    shieldSet.lastShieldEvent = { type: 'consumed', at: new Date() };
  }
  const update: Record<string, unknown> = { $set: shieldSet };
  if (newMilestone) {
    update.$addToSet = { milestones: newMilestone };
  }
  if (action === 'recover') {
    // Stamp the redemption so the 30-day cap can observe it next time.
    // $push with $slice keeps the array bounded without a separate cleanup job.
    update.$push = { recoveryRedemptions: { $each: [new Date()], $slice: -10 } };
  }
  await User.updateOne({ _id: userId }, update);

  // Mark each bridged day's StudyDay record as shielded so the calendar/tier
  // surfaces still see continuity instead of an empty gap.
  if (shieldConsumed) {
    const ops = Array.from({ length: shieldsToConsume }, (_, i) => {
      const missedD = new Date(`${today}T00:00:00Z`);
      missedD.setUTCDate(missedD.getUTCDate() - (i + 1));
      return {
        updateOne: {
          filter: { userId, date: getUTCDateString(missedD) },
          update: { $set: { shieldUsed: true } },
          upsert: true,
        },
      };
    });
    await StudyDay.bulkWrite(ops);
  }

  const base: StreakResult = {
    studyStreak: newStreak,
    longestStudyStreak: newLongest,
    shields: newShields,
    milestoneReached: newMilestone,
    recoveryActive: false,
    recoveryDeadline: null,
    shieldEarned,
    shieldConsumed,
  };
  return refreshTierAndReturn(base);
}
