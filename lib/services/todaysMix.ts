import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Flashcard from '@/lib/models/Flashcard';
import { Quiz, Video } from '@/lib/models';
import TodaysMix, { type ITodaysMix, type ITodaysMixItem } from '@/lib/models/TodaysMix';

const DEFAULT_DAILY_MINUTES = 15;
const MINUTES_PER_FLASHCARD = 0.5;
const MINUTES_PER_QUIZ = 2;

/** Material type string → mix item type mapping */
const MATERIAL_TYPE_MAP: Record<string, ITodaysMixItem['type'] | null> = {
  'Flashcards': 'flashcard-review',
  'Quizzes': 'quiz',
  // These are passive/view-only — not suitable for a daily mix session
  'Mind Maps': null,
  'Study Guides': null,
  'Video Timestamps': null,
  'Interactive Transcripts': null,
  'Case Studies': null,
};

function getUTCDateString(): string {
  return new Date().toISOString().split('T')[0];
}

interface MixSummary {
  flashcardCount: number;
  quizCount: number;
}

export interface TodaysMixResponse {
  date: string;
  items: ITodaysMixItem[];
  totalMinutes: number;
  targetMinutes: number;
  completed: boolean;
  completedAt?: string;
  summary: MixSummary;
  /** Total flashcards the user owns (regardless of due state) */
  totalCards?: number;
  /** When the next flashcard is due (ISO string), if any */
  nextReviewDate?: string | null;
}

function summarize(items: ITodaysMixItem[]): MixSummary {
  let flashcardCount = 0;
  let quizCount = 0;
  for (const item of items) {
    if (item.type === 'flashcard-review') flashcardCount += item.itemIds.length;
    if (item.type === 'quiz') quizCount += item.itemIds.length;
  }
  return { flashcardCount, quizCount };
}

function toResponse(doc: ITodaysMix): TodaysMixResponse {
  return {
    date: doc.date,
    items: doc.items,
    totalMinutes: doc.totalMinutes,
    targetMinutes: doc.targetMinutes,
    completed: doc.completed,
    completedAt: doc.completedAt?.toISOString(),
    summary: summarize(doc.items),
  };
}

/**
 * Get or compile today's mix for a user.
 * Returns existing doc if already compiled today。
 */
export async function getOrCompileTodaysMix(userId: string): Promise<TodaysMixResponse> {
  await dbConnect();

  const date = getUTCDateString();

  // Check for existing mix
  const existing = await TodaysMix.findOne({ userId, date });
  if (existing) {
    const now = new Date();
    const [totalCards, nextDueCardRaw] = await Promise.all([
      Flashcard.countDocuments({ userId }),
      Flashcard.findOne({ userId, 'fsrs.due': { $gt: now } })
        .select('fsrs.due')
        .sort({ 'fsrs.due': 1 })
        .lean(),
    ]);
    const response = toResponse(existing);
    response.totalCards = totalCards;
    response.nextReviewDate = (nextDueCardRaw as unknown as { fsrs?: { due?: Date } } | null)?.fsrs?.due?.toISOString() ?? null;
    return response;
  }

  // Compile a new mix
  return compileTodaysMix(userId, date);
}

async function compileTodaysMix(userId: string, date: string): Promise<TodaysMixResponse> {
  const now = new Date();

  // Get user preferences
  const user = await User.findById(userId)
    .select('preferences.learning.preferredMaterialsRanked preferences.learning.dailyTimeMinutes')
    .lean() as {
      preferences?: {
        learning?: {
          preferredMaterialsRanked?: string[];
          dailyTimeMinutes?: number;
        };
      };
    } | null;

  const targetMinutes = user?.preferences?.learning?.dailyTimeMinutes || DEFAULT_DAILY_MINUTES;
  const preferredMaterials = user?.preferences?.learning?.preferredMaterialsRanked || ['Flashcards', 'Quizzes'];

  // Get available content + total card count + next review date
  const [dueFlashcardsRaw, allQuizzesRaw, totalCards, nextDueCardRaw] = await Promise.all([
    Flashcard.find({ userId, 'fsrs.due': { $lte: now } })
      .select('_id sourceId')
      .sort({ 'fsrs.due': 1 })
      .limit(100)
      .lean(),
    Quiz.find({ userId })
      .select('_id sourceId')
      .limit(50)
      .lean(),
    Flashcard.countDocuments({ userId }),
    Flashcard.findOne({ userId, 'fsrs.due': { $gt: now } })
      .select('fsrs.due')
      .sort({ 'fsrs.due': 1 })
      .lean(),
  ]);
  const dueFlashcards = dueFlashcardsRaw as unknown as { _id: string; sourceId: string }[];
  const allQuizzes = allQuizzesRaw as unknown as { _id: string; sourceId: string }[];
  const nextReviewDate = (nextDueCardRaw as unknown as { fsrs?: { due?: Date } } | null)?.fsrs?.due?.toISOString() ?? null;

  // Build time allocation based on preferred materials order
  // First preferred: 50%, second: 30%, rest: 20%
  const allocations: { type: ITodaysMixItem['type']; fraction: number }[] = [];
  const fractions = [0.5, 0.3, 0.2];

  for (let i = 0; i < preferredMaterials.length && i < 3; i++) {
    const materialName = preferredMaterials[i];
    const itemType = MATERIAL_TYPE_MAP[materialName];
    if (itemType) {
      allocations.push({ type: itemType, fraction: fractions[i] || 0.2 });
    }
  }

  // If no valid allocations from preferences, default to flashcards + quizzes
  if (allocations.length === 0) {
    allocations.push({ type: 'flashcard-review', fraction: 0.6 });
    allocations.push({ type: 'quiz', fraction: 0.4 });
  }

  // Normalize fractions
  const totalFraction = allocations.reduce((sum, a) => sum + a.fraction, 0);
  for (const a of allocations) {
    a.fraction = a.fraction / totalFraction;
  }

  // Always include flashcards if there are due cards, even if not in preferences
  const hasFlashcardAllocation = allocations.some(a => a.type === 'flashcard-review');
  if (dueFlashcards.length > 0 && !hasFlashcardAllocation) {
    // Steal 30% from the first allocation for due flashcards (SRS is time-sensitive)
    allocations[0].fraction *= 0.7;
    allocations.unshift({ type: 'flashcard-review', fraction: 0.3 });
  }

  // Build items
  const items: ITodaysMixItem[] = [];
  const remainingFlashcards = [...dueFlashcards];
  const remainingQuizzes = [...allQuizzes];

  for (const alloc of allocations) {
    const allocatedMinutes = Math.max(1, Math.round(targetMinutes * alloc.fraction));

    if (alloc.type === 'flashcard-review' && remainingFlashcards.length > 0) {
      const maxCards = Math.floor(allocatedMinutes / MINUTES_PER_FLASHCARD);
      const batch = remainingFlashcards.splice(0, Math.max(1, maxCards));
      const estimatedMinutes = Math.round(batch.length * MINUTES_PER_FLASHCARD);
      items.push({
        type: 'flashcard-review',
        itemIds: batch.map(f => f._id.toString()),
        estimatedMinutes: Math.max(1, estimatedMinutes),
        completed: false,
      });
    } else if (alloc.type === 'quiz' && remainingQuizzes.length > 0) {
      const maxQuizzes = Math.floor(allocatedMinutes / MINUTES_PER_QUIZ);
      // Group quizzes by source for context
      const batch = remainingQuizzes.splice(0, Math.max(1, maxQuizzes));
      const estimatedMinutes = Math.round(batch.length * MINUTES_PER_QUIZ);

      // Look up source title for the first quiz's source
      const firstSourceId = batch[0]?.sourceId;
      let sourceTitle: string | undefined;
      if (firstSourceId) {
        const video = await Video.findOne({ videoId: firstSourceId }).select('title').lean() as { title?: string } | null;
        sourceTitle = video?.title;
      }

      items.push({
        type: 'quiz',
        sourceId: firstSourceId,
        sourceTitle,
        itemIds: batch.map(q => q._id.toString()),
        estimatedMinutes: Math.max(1, estimatedMinutes),
        completed: false,
      });
    }
  }

  const totalMinutes = items.reduce((sum, item) => sum + item.estimatedMinutes, 0);

  // Persist
  const doc = await TodaysMix.findOneAndUpdate(
    { userId, date },
    {
      userId,
      date,
      items,
      totalMinutes,
      targetMinutes,
      completed: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const response = toResponse(doc);
  response.totalCards = totalCards;
  response.nextReviewDate = nextReviewDate;
  return response;
}

/**
 * Mark a specific item in today's mix as completed.
 */
export async function completeMixItem(userId: string, itemIndex: number): Promise<TodaysMixResponse | null> {
  const date = getUTCDateString();
  await dbConnect();

  const mix = await TodaysMix.findOne({ userId, date });
  if (!mix || itemIndex < 0 || itemIndex >= mix.items.length) return null;

  mix.items[itemIndex].completed = true;

  // Check if all items are now completed
  const allDone = mix.items.every(item => item.completed);
  if (allDone) {
    mix.completed = true;
    mix.completedAt = new Date();
  }

  await mix.save();
  return toResponse(mix);
}
