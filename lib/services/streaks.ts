import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import StudyDay from '@/lib/models/StudyDay';
import { recordChallengeActivity } from './dailyChallenges';

export type ActivityType =
  | 'flashcard_review'
  | 'quiz_completed'
  | 'source_processed'
  | 'flashcard_created';

export interface StreakResult {
  studyStreak: number;
  longestStudyStreak: number;
  shields: number;
  milestoneReached?: number; // defined only when a new milestone is achieved this call
}

const MILESTONES = [7, 30, 100, 365];

const ACTIVITY_FIELD: Record<ActivityType, string> = {
  flashcard_review: 'flashcardReviews',
  quiz_completed: 'quizzesCompleted',
  source_processed: 'sourcesProcessed',
  flashcard_created: 'flashcardsCreated',
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

function meetsThreshold(day: {
  flashcardReviews: number;
  quizzesCompleted: number;
  sourcesProcessed: number;
  flashcardsCreated: number;
}): boolean {
  return (
    day.flashcardReviews >= 5 ||
    day.quizzesCompleted >= 1 ||
    day.sourcesProcessed >= 1 ||
    day.flashcardsCreated >= 3
  );
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
    const u = await User.findById(userId).select('studyStreak longestStudyStreak streakShields').lean();
    if (!u) return null;
    return {
      studyStreak: u.studyStreak ?? 0,
      longestStudyStreak: u.longestStudyStreak ?? 0,
      shields: u.streakShields ?? 0,
    };
  };

  // If thresholds not met yet, nothing to do for the streak
  if (!meetsThreshold(studyDay)) return currentStats();

  // If today already qualifies, the streak was already updated earlier
  if (studyDay.qualifies) return currentStats();

  // Atomically claim the qualifying transition (prevents duplicate streak updates
  // if two requests arrive simultaneously after crossing the threshold)
  const claimed = await StudyDay.findOneAndUpdate(
    { userId, date: today, qualifies: false },
    { $set: { qualifies: true } },
    { new: false }
  );
  if (!claimed) return currentStats(); // another request got there first

  // Load user for streak computation
  const user = await User.findById(userId);
  if (!user) return null;

  const lastStudy = user.lastStudyDate;
  let newStreak = 1;
  let shieldConsumed = false;

  if (lastStudy) {
    const diff = daysDiff(today, lastStudy);
    if (diff === 0) {
      // Same UTC day — already counted (shouldn't normally happen after the claim above)
      return currentStats();
    } else if (diff === 1) {
      newStreak = (user.studyStreak ?? 0) + 1;
    } else if (diff === 2 && (user.streakShields ?? 0) > 0) {
      // Missed exactly one day — burn a shield to continue the streak
      newStreak = (user.studyStreak ?? 0) + 1;
      shieldConsumed = true;
    }
    // else: streak resets to 1
  }

  const newLongest = Math.max(user.longestStudyStreak ?? 0, newStreak);
  const currentMilestones: number[] = user.milestones ?? [];
  const newMilestone = MILESTONES.find((m) => newStreak >= m && !currentMilestones.includes(m));

  let newShields = user.streakShields ?? 0;
  if (shieldConsumed) newShields = Math.max(0, newShields - 1);
  if (newMilestone) newShields = Math.min(3, newShields + 1); // earn a shield at each milestone

  // Persist updated streak state
  const update: Record<string, unknown> = {
    $set: {
      studyStreak: newStreak,
      longestStudyStreak: newLongest,
      lastStudyDate: today,
      streakShields: newShields,
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
  };
}
