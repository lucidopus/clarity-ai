import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Flashcard from '@/lib/models/Flashcard';
import { Quiz, Video } from '@/lib/models';
import DailyChallenge from '@/lib/models/DailyChallenge';
import type { ChallengeType, IChallenge } from '@/lib/models/DailyChallenge';

// ─── Seeded PRNG ────────────────────────────────────────────────────────────

/** FNV-1a hash → 32-bit unsigned integer */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG — returns a function that yields [0,1) on each call */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserChallengeProfile {
  selfEfficacy: number;
  dailyTimeMinutes: number;
  learningChallenges: string[];
  learningGoals: string[];
  preferredMaterials: string[];
}

interface ContentInventory {
  totalFlashcards: number;
  dueFlashcards: number;
  totalQuizzes: number;
  totalSources: number;
}

interface ChallengeCandidate {
  type: ChallengeType;
  labelTemplate: string;
  baseTarget: number;
  baseWeight: number;
  /** Check if this candidate is feasible given the user's content inventory */
  isFeasible: (inv: ContentInventory) => boolean;
}

// ─── Candidate Pool ─────────────────────────────────────────────────────────

/** Render label with correct singular/plural */
function renderLabel(template: string, target: number): string {
  return template
    .replace('{t}', String(target))
    .replace(/{s\|([^|]+)\|([^}]+)}/g, (_, singular, plural) => target === 1 ? singular : plural);
}

// Pool for slots 2 & 3 (slot 1 is always the FSRS-driven challenge).
// The "due flashcards" candidate is excluded here since it's reserved for slot 1.
const CANDIDATE_POOL: ChallengeCandidate[] = [
  {
    type: 'review_cards',
    labelTemplate: 'Review {t} {s|flashcard|flashcards}',
    baseTarget: 5,
    baseWeight: 30,
    isFeasible: (inv) => inv.totalFlashcards >= 10,
  },
  {
    type: 'complete_quiz',
    labelTemplate: 'Complete {t} {s|quiz|quizzes}',
    baseTarget: 1,
    baseWeight: 20,
    isFeasible: (inv) => inv.totalQuizzes >= 1,
  },
  {
    type: 'complete_quiz',
    labelTemplate: 'Complete {t} {s|quiz|quizzes}',
    baseTarget: 2,
    baseWeight: 15,
    isFeasible: (inv) => inv.totalQuizzes >= 2,
  },
  {
    type: 'process_video',
    labelTemplate: 'Process {t} new {s|source|sources}',
    baseTarget: 1,
    baseWeight: 15,
    isFeasible: () => true,
  },
  {
    type: 'create_flashcards',
    labelTemplate: 'Create {t} {s|flashcard|flashcards}',
    baseTarget: 3,
    baseWeight: 15,
    isFeasible: () => true,
  },
  {
    type: 'create_flashcards',
    labelTemplate: 'Create {t} {s|flashcard|flashcards}',
    baseTarget: 1,
    baseWeight: 10,
    isFeasible: () => true,
  },
];

// ─── Target Scaling ─────────────────────────────────────────────────────────

const MAX_TARGET: Record<ChallengeType, number> = {
  review_cards: 30,
  complete_quiz: 5,
  process_video: 3,
  create_flashcards: 10,
};

function scaleTarget(baseTarget: number, type: ChallengeType, profile: UserChallengeProfile): number {
  // Time factor: ratio to 30-min baseline
  const timeFactor = profile.dailyTimeMinutes / 30;

  // Efficacy factor: 1→0.5, 4→1.0, 7→1.5
  let efficacyFactor = 0.5 + ((profile.selfEfficacy - 1) / 6);
  if (profile.learningChallenges.includes('time-management')) {
    efficacyFactor *= 0.75;
  }

  let scaled = Math.round(baseTarget * timeFactor * efficacyFactor);

  // Procrastination: halve the scaled target for achievable quick wins
  if (profile.learningChallenges.includes('procrastination')) {
    scaled = Math.round(scaled * 0.5);
  }

  return Math.max(1, Math.min(scaled, MAX_TARGET[type]));
}

// ─── Weight Modifiers ───────────────────────────────────────────────────────

const MATERIAL_TO_CHALLENGE: Record<string, ChallengeType> = {
  'Flashcards': 'review_cards',
  'Quizzes': 'complete_quiz',
};

function computeWeight(candidate: ChallengeCandidate, profile: UserChallengeProfile): number {
  let w = candidate.baseWeight;

  // Layer 2: Psychology modifiers
  const challenges = profile.learningChallenges;

  if (challenges.includes('retention') && candidate.type === 'review_cards') {
    w *= 1.5;
  }
  if (challenges.includes('procrastination') && candidate.baseTarget <= 1) {
    w *= 1.3;
  }
  if (challenges.includes('information-overload')) {
    if (candidate.type === 'process_video') w *= 0.3;
    if (candidate.type === 'review_cards') w *= 1.4;
  }
  if (challenges.includes('time-management') && candidate.baseTarget <= 1) {
    w *= 1.2;
  }

  // Layer 3: Goal modifiers
  const goals = profile.learningGoals;

  if (goals.includes('exam-prep')) {
    if (candidate.type === 'complete_quiz') w *= 1.5;
    if (candidate.type === 'review_cards') w *= 1.2;
  }
  if (goals.includes('career-change') || goals.includes('professional-dev')) {
    if (candidate.type === 'process_video') w *= 1.4;
  }
  if (goals.includes('skill-building')) {
    if (candidate.type === 'process_video') w *= 1.3;
    if (candidate.type === 'create_flashcards') w *= 1.2;
  }
  if (goals.includes('academic-success')) {
    if (candidate.type === 'review_cards') w *= 1.3;
    if (candidate.type === 'complete_quiz') w *= 1.3;
  }
  if (goals.includes('personal-interest')) {
    if (candidate.type === 'process_video') w *= 1.2;
  }

  // Preferred material boost
  const topMaterial = profile.preferredMaterials[0];
  if (topMaterial && MATERIAL_TO_CHALLENGE[topMaterial] === candidate.type) {
    w *= 1.3;
  }

  return w;
}

// ─── Selection ──────────────────────────────────────────────────────────────

function selectChallenges(
  candidates: ChallengeCandidate[],
  profile: UserChallengeProfile,
  rng: () => number,
  limit: number,
  startingTypeCounts: Partial<Record<ChallengeType, number>> = {},
): ChallengeCandidate[] {
  const scored = candidates.map(c => ({
    candidate: c,
    weight: computeWeight(c, profile) + rng() * 2,
  }));

  scored.sort((a, b) => b.weight - a.weight);

  // Type diversity: max 2 of same type, or 1 if user needs variety
  const forceVariety = profile.learningChallenges.includes('staying-motivated');
  const selected: typeof scored = [];
  const typeCounts: Partial<Record<ChallengeType, number>> = { ...startingTypeCounts };

  for (const item of scored) {
    if (selected.length >= limit) break;
    const t = item.candidate.type;
    const count = typeCounts[t] || 0;
    if (count >= (forceVariety ? 1 : 2)) continue;
    selected.push(item);
    typeCounts[t] = count + 1;
  }

  // Defensive fallback
  if (selected.length < limit) {
    for (const item of scored) {
      if (selected.length >= limit) break;
      if (!selected.includes(item)) selected.push(item);
    }
  }

  return selected.map(s => s.candidate);
}

// Slot 1 is always an FSRS-due-cards challenge. Target = current due count (capped),
// with a sensible fallback when the user has nothing due.
function buildFSRSChallenge(dueFlashcards: number, profile: UserChallengeProfile): IChallenge {
  if (dueFlashcards >= 1) {
    const target = Math.min(dueFlashcards, MAX_TARGET.review_cards);
    return {
      type: 'review_cards',
      label: renderLabel('Review {t} due {s|flashcard|flashcards}', target),
      target,
      current: 0,
      done: false,
    };
  }
  // No cards due — motivate general review from the library.
  const target = scaleTarget(5, 'review_cards', profile);
  return {
    type: 'review_cards',
    label: renderLabel('Review {t} {s|flashcard|flashcards} from your library', target),
    target,
    current: 0,
    done: false,
  };
}

// ─── Main Generator ─────────────────────────────────────────────────────────

/**
 * Generates 3 personalized challenges for a user on a given date.
 * Deterministic per userId+date (seeded PRNG).
 */
export async function generateDailyChallenges(userId: string, date: string): Promise<IChallenge[]> {
  await dbConnect();

  const seed = fnv1a(`${userId}|${date}`);
  const rng = mulberry32(seed);

  // Parallel: user profile + content inventory
  const [userRaw, totalFlashcards, dueFlashcards, totalQuizzes, totalSources] = await Promise.all([
    User.findById(userId)
      .select(
        'preferences.learning.personalityProfile.selfEfficacy ' +
        'preferences.learning.dailyTimeMinutes ' +
        'preferences.learning.learningChallenges ' +
        'preferences.learning.learningGoals ' +
        'preferences.learning.preferredMaterialsRanked',
      )
      .lean(),
    Flashcard.countDocuments({ userId }),
    Flashcard.countDocuments({ userId, 'fsrs.due': { $lte: new Date() } }),
    Quiz.countDocuments({ userId }),
    Video.countDocuments({ userId, processingStatus: { $in: ['completed', 'completed_with_warning'] } }),
  ]);

  const prefs = (userRaw as Record<string, unknown> | null)?.preferences as
    { learning?: Record<string, unknown> } | undefined;
  const learning = prefs?.learning;
  const personality = learning?.personalityProfile as { selfEfficacy?: number } | undefined;

  const profile: UserChallengeProfile = {
    selfEfficacy: personality?.selfEfficacy ?? 4,
    dailyTimeMinutes: (learning?.dailyTimeMinutes as number) ?? 15,
    learningChallenges: (learning?.learningChallenges as string[]) ?? [],
    learningGoals: (learning?.learningGoals as string[]) ?? [],
    preferredMaterials: (learning?.preferredMaterialsRanked as string[]) ?? ['Flashcards', 'Quizzes'],
  };

  const inventory: ContentInventory = { totalFlashcards, dueFlashcards, totalQuizzes, totalSources };

  // Slot 1: always FSRS-driven
  const fsrsChallenge = buildFSRSChallenge(dueFlashcards, profile);

  // Slots 2 & 3: weighted selection from the remaining pool, counting the FSRS
  // slot against review_cards diversity so we don't get three "review" challenges.
  const feasible = CANDIDATE_POOL.filter(c => c.isFeasible(inventory));
  const chosen = selectChallenges(feasible, profile, rng, 2, { review_cards: 1 });

  const remaining: IChallenge[] = chosen.map(c => {
    const target = scaleTarget(c.baseTarget, c.type, profile);
    const label = renderLabel(c.labelTemplate, target);
    return { type: c.type, label, target, current: 0, done: false };
  });

  return [fsrsChallenge, ...remaining];
}

// ─── Activity Recording ─────────────────────────────────────────────────────

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
  activityType: string,
): Promise<void> {
  const challengeType = ACTIVITY_TO_CHALLENGE[activityType];
  if (!challengeType) return;

  // Ensure today's challenge doc exists
  await DailyChallenge.findOneAndUpdate(
    { userId, date },
    { $setOnInsert: { challenges: await generateDailyChallenges(userId, date), allCompleted: false } },
    { upsert: true },
  );

  // Increment the matching challenge (only if not done)
  const updated = await DailyChallenge.findOneAndUpdate(
    {
      userId,
      date,
      challenges: { $elemMatch: { type: challengeType, done: false } },
    },
    { $inc: { 'challenges.$.current': 1 } },
    { new: true },
  );

  if (!updated) return;

  // Check if the updated challenge crossed its target
  const challenge = updated.challenges.find((c: IChallenge) => c.type === challengeType);
  if (!challenge || challenge.current < challenge.target) return;

  // Mark it done
  await DailyChallenge.updateOne(
    { userId, date, 'challenges.type': challengeType },
    { $set: { 'challenges.$.done': true } },
  );

  // Check if all challenges are now done
  const final = await DailyChallenge.findOne({ userId, date });
  if (!final || !final.challenges.every((c: IChallenge) => c.current >= c.target)) return;

  // Atomically flip allCompleted → true the first time; award the shield bonus
  // exactly once by gating on bonusAwarded: false in the same update.
  const claimed = await DailyChallenge.findOneAndUpdate(
    { userId, date, bonusAwarded: false },
    { $set: { allCompleted: true, bonusAwarded: true } },
    { new: false },
  );

  if (!claimed) return; // already awarded by a concurrent request

  // Grant 1 shield if user has < 3, capping at 3. Badge-only otherwise.
  await User.updateOne(
    { _id: userId, streakShields: { $lt: 3 } },
    { $inc: { streakShields: 1 } },
  );
}
