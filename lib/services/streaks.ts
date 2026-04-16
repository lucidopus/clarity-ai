import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import StudyDay from '@/lib/models/StudyDay';
import { recordChallengeActivity } from './dailyChallenges';

export type ActivityType =
  | 'flashcard_review'
  | 'quiz_completed'
  | 'source_processed'
  | 'flashcard_created'
  | 'document_study_session';

export interface StreakResult {
  studyStreak: number;
  longestStudyStreak: number;
  shields: number;
  milestoneReached?: number; // defined only when a new milestone is achieved this call
  recoveryActive?: boolean;
  recoveryDeadline?: Date | null;
}

const MILESTONES = [7, 30, 100, 365];

// Thresholds for qualifying a "study day"
const HARD_RECOVERY_REVIEWS = 10;
const HARD_RECOVERY_QUIZZES = 2;

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
  if (!meetsThreshold(studyDay)) return currentStats();

  // If today already qualifies, the streak was already updated earlier today
  if (studyDay.qualifies) return currentStats();

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
      return currentStats();
    } else if (diff === 1) {
      action = 'increment';
    } else if (diff === 2 && (user.streakShields ?? 0) > 0) {
      action = 'shield';
    } else {
      // Streak broke. Check recovery window.
      const cutoff = computeRecoveryCutoff(lastStudy);
      if (now < cutoff) {
        action = meetsHardThreshold(studyDay) ? 'recover' : 'recoveryPending';
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
    return currentStats();
  }

  // Atomically claim the qualifying transition (prevents duplicate streak updates
  // if two requests arrive simultaneously after crossing the threshold)
  const claimed = await StudyDay.findOneAndUpdate(
    { userId, date: today, qualifies: false },
    { $set: { qualifies: true } },
    { new: false }
  );
  if (!claimed) return currentStats(); // another request got there first

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

  let newShields = user.streakShields ?? 0;
  if (shieldConsumed) newShields = Math.max(0, newShields - 1);
  // Earn a shield every 7 consecutive days, capped at 3.
  if (newStreak > 0 && newStreak % 7 === 0) {
    newShields = Math.min(3, newShields + 1);
  }

  // Persist updated streak state and always clear the recovery deadline after a
  // definitive streak action (increment / shield / recover / reset).
  const update: Record<string, unknown> = {
    $set: {
      studyStreak: newStreak,
      longestStudyStreak: newLongest,
      lastStudyDate: today,
      streakShields: newShields,
      streakRecoveryDeadline: null,
    },
  };
  if (newMilestone) {
    update.$addToSet = { milestones: newMilestone };
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

  return {
    studyStreak: newStreak,
    longestStudyStreak: newLongest,
    shields: newShields,
    milestoneReached: newMilestone,
    recoveryActive: false,
    recoveryDeadline: null,
  };
}
