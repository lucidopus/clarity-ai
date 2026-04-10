import DailyChallenge from '@/lib/models/DailyChallenge';
import type { ChallengeType, IChallenge } from '@/lib/models/DailyChallenge';

const ROTATING_POOL: { type: ChallengeType; label: string; target: number }[] = [
  { type: 'complete_quiz', label: 'Complete 1 quiz', target: 1 },
  { type: 'process_video', label: 'Process 1 video', target: 1 },
  { type: 'create_flashcards', label: 'Create 3 flashcards', target: 3 },
];

/** Generates 3 challenges for a given UTC date (deterministic). */
export function generateDailyChallenges(date: string): IChallenge[] {
  const dayN = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
  const c2 = ROTATING_POOL[dayN % ROTATING_POOL.length];
  const c3 = ROTATING_POOL[(dayN + 1) % ROTATING_POOL.length];
  return [
    { type: 'review_cards', label: 'Review 5 flashcards', target: 5, current: 0, done: false },
    { ...c2, current: 0, done: false },
    { ...c3, current: 0, done: false },
  ];
}

const ACTIVITY_TO_CHALLENGE: Record<string, ChallengeType> = {
  flashcard_review: 'review_cards',
  quiz_completed: 'complete_quiz',
  source_processed: 'process_video',
  flashcard_created: 'create_flashcards',
};

/**
 * Records activity progress against today's daily challenges.
 * Idempotent-safe: already-completed challenges are skipped.
 */
export async function recordChallengeActivity(
  userId: string,
  date: string,
  activityType: string
): Promise<void> {
  const challengeType = ACTIVITY_TO_CHALLENGE[activityType];
  if (!challengeType) return;

  // Ensure today's challenge doc exists
  await DailyChallenge.findOneAndUpdate(
    { userId, date },
    { $setOnInsert: { challenges: generateDailyChallenges(date), allCompleted: false } },
    { upsert: true }
  );

  // Increment the matching challenge (only if not done)
  const updated = await DailyChallenge.findOneAndUpdate(
    {
      userId,
      date,
      challenges: { $elemMatch: { type: challengeType, done: false } },
    },
    { $inc: { 'challenges.$.current': 1 } },
    { new: true }
  );

  if (!updated) return;

  // Check if the updated challenge crossed its target
  const challenge = updated.challenges.find((c: IChallenge) => c.type === challengeType);
  if (!challenge || challenge.current < challenge.target) return;

  // Mark it done
  await DailyChallenge.updateOne(
    { userId, date, 'challenges.type': challengeType },
    { $set: { 'challenges.$.done': true } }
  );

  // Check if all challenges are now done
  const final = await DailyChallenge.findOne({ userId, date });
  if (final && final.challenges.every((c: IChallenge) => c.current >= c.target)) {
    await DailyChallenge.updateOne({ userId, date }, { $set: { allCompleted: true } });
  }
}
