import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import StudyDay from '@/lib/models/StudyDay';
import Flashcard from '@/lib/models/Flashcard';
import DailyChallenge from '@/lib/models/DailyChallenge';
import { recordChallengeActivity } from './dailyChallenges';
import { isNowInContractWindow } from './studyContract';

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
const MILESTONES = [7, 21, 66, 180, 365];

// Thresholds for qualifying a "study day"
const HARD_RECOVERY_REVIEWS = 10;
const HARD_RECOVERY_QUIZZES = 2;

// Anti-laziness cap: at most one 48h recovery redemption per rolling 30-day window.
// Research: prevents the "over-safety paradox" where shields + recovery compound.
const RECOVERY_CAP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const RECOVERY_CAP_COUNT = 1;

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
function computeRecoveryCutoff(lastStudy: string): Date {
  const d = new Date(`${lastStudy}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3);
  return d;
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

  const today = getUTCDateString();

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
      studyContract?: { windowStart: string; windowEnd: string; timezone: string } | null;
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
  const now = new Date();

  type Action = 'firstEver' | 'increment' | 'shield' | 'recover' | 'reset' | 'recoveryPending';
  let action: Action;

  if (!lastStudy) {
    action = 'firstEver';
  } else {
    const diff = daysDiff(today, lastStudy);
    if (diff <= 0) {
      // Same UTC day or stale data — already counted
      return refreshTierAndReturn(await currentStats());
    } else if (diff === 1) {
      action = 'increment';
    } else if (diff === 2 && (user.streakShields ?? 0) > 0) {
      action = 'shield';
    } else {
      // Streak broke. Check recovery window.
      const cutoff = computeRecoveryCutoff(lastStudy);
      if (now < cutoff) {
        const recentRedemptions = (user.recoveryRedemptions ?? []).filter(
          (d: Date) => now.getTime() - new Date(d).getTime() < RECOVERY_CAP_WINDOW_MS,
        );
        if (recentRedemptions.length >= RECOVERY_CAP_COUNT) {
          // Cap hit — user has already used their monthly recovery. Reset.
          action = 'reset';
        } else {
          action = meetsHardThreshold(studyDay) ? 'recover' : 'recoveryPending';
        }
      } else {
        action = 'reset';
      }
    }
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

  let newStreak = 1;
  let shieldConsumed = false;
  switch (action) {
    case 'firstEver':
      newStreak = 1;
      break;
    case 'increment':
    case 'recover':
      newStreak = (user.studyStreak ?? 0) + 1;
      break;
    case 'shield':
      newStreak = (user.studyStreak ?? 0) + 1;
      shieldConsumed = true;
      break;
    case 'reset':
      newStreak = 1;
      break;
  }

  const newLongest = Math.max(user.longestStudyStreak ?? 0, newStreak);
  const currentMilestones: number[] = user.milestones ?? [];
  const newMilestone = MILESTONES.find((m) => newStreak >= m && !currentMilestones.includes(m));

  const prevShields = user.streakShields ?? 0;
  let newShields = prevShields;
  if (shieldConsumed) newShields = Math.max(0, newShields - 1);
  // Earn a shield every 7 consecutive days, capped at 3.
  const eligibleForEarn = newStreak > 0 && newStreak % 7 === 0;
  if (eligibleForEarn) {
    newShields = Math.min(3, newShields + 1);
  }
  const shieldEarned = newShields > prevShields;

  // Persist updated streak state and always clear the recovery deadline after a
  // definitive streak action (increment / shield / recover / reset).
  const shieldSet: Record<string, unknown> = {
    studyStreak: newStreak,
    longestStudyStreak: newLongest,
    lastStudyDate: today,
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

  // If a shield was consumed, mark the missed day's StudyDay record
  if (shieldConsumed) {
    const missedD = new Date(`${today}T00:00:00Z`);
    missedD.setUTCDate(missedD.getUTCDate() - 1);
    await StudyDay.updateOne(
      { userId, date: getUTCDateString(missedD) },
      { $set: { shieldUsed: true } },
      { upsert: true }
    );
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
