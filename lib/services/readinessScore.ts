import dbConnect from '@/lib/mongodb';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import Progress from '@/lib/models/Progress';
import type { IReadinessScore } from '@/lib/models/Progress';

/** Cache TTL: recompute if older than 1 hour */
const CACHE_TTL_MS = 60 * 60 * 1000;

export interface Suggestion {
  action: string;
  impact: string;
  type: 'quiz' | 'flashcards' | 'streak';
}

export interface ReadinessResult extends IReadinessScore {
  suggestions: Suggestion[];
  examDate?: Date | null;
  examName?: string | null;
  daysUntilExam?: number | null;
}

/** Compute a 0-100 readiness score across 4 weighted dimensions. */
export async function computeReadinessScore(
  userId: string,
  sourceId: string
): Promise<ReadinessResult> {
  await dbConnect();

  const [progress, flashcards, totalQuizzes] = await Promise.all([
    Progress.findOne({ userId, sourceId }),
    Flashcard.find({ userId, sourceId }).select('fsrs masteredAt').lean(),
    Quiz.countDocuments({ sourceId, userId }),
  ]);

  const quizAttempts = progress?.quizAttempts ?? [];
  const masteredFlashcardIds: string[] = (progress?.masteredFlashcardIds ?? []).map((id) =>
    id.toString()
  );

  const totalFlashcards = flashcards.length;
  const now = new Date();

  // ── Quiz dimension (40%) ────────────────────────────────────────────────────
  // Exponential-decay weighted average of all quiz attempt scores.
  // Recent attempts matter more (weekly half-life with decay=0.95).
  let quizDimension = 0;
  if (quizAttempts.length > 0) {
    const DECAY = 0.95;
    let weightedSum = 0;
    let weightSum = 0;
    for (const attempt of quizAttempts) {
      const weeksSince =
        (now.getTime() - new Date(attempt.completedAt).getTime()) / (7 * 24 * 3600 * 1000);
      const weight = Math.pow(DECAY, weeksSince);
      weightedSum += (attempt.score / 100) * weight;
      weightSum += weight;
    }
    quizDimension = weightSum > 0 ? (weightedSum / weightSum) * 100 : 0;
  }

  // ── Mastery dimension (25%) ─────────────────────────────────────────────────
  // Cards in FSRS Review state (state=2) and not yet overdue = retrievability >90%.
  // Falls back to masteredFlashcardIds ratio when no FSRS data exists.
  let masteryDimension = 0;
  if (totalFlashcards > 0) {
    const fsrsMastered = flashcards.filter(
      (f) => (f.fsrs?.state ?? 0) >= 2 && f.fsrs?.due && new Date(f.fsrs.due) >= now
    ).length;

    if (fsrsMastered > 0) {
      masteryDimension = (fsrsMastered / totalFlashcards) * 100;
    } else if (masteredFlashcardIds.length > 0) {
      masteryDimension = (masteredFlashcardIds.length / totalFlashcards) * 100;
    }
  }

  // ── Coverage dimension (20%) ────────────────────────────────────────────────
  // Fraction of flashcards interacted with + fraction of quizzes attempted.
  let coverageDimension = 0;
  {
    const flashcardCoverage =
      totalFlashcards > 0
        ? flashcards.filter((f) => (f.fsrs?.state ?? 0) > 0).length / totalFlashcards
        : null;

    const quizCoverage =
      totalQuizzes > 0 ? Math.min(quizAttempts.length / totalQuizzes, 1) : null;

    const parts = [flashcardCoverage, quizCoverage].filter((v): v is number => v !== null);
    coverageDimension =
      parts.length > 0 ? (parts.reduce((s, v) => s + v, 0) / parts.length) * 100 : 0;
  }

  // ── Trend dimension (15%) ───────────────────────────────────────────────────
  // Compare average quiz score of recent half vs. older half of attempts.
  // Requires ≥4 attempts to be meaningful; otherwise returns neutral (50).
  let trendDimension = 50;
  if (quizAttempts.length >= 4) {
    const sorted = [...quizAttempts].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const avg = (arr: typeof sorted) => arr.reduce((s, a) => s + a.score, 0) / arr.length;
    const olderAvg = avg(sorted.slice(0, mid));
    const recentAvg = avg(sorted.slice(mid));
    const diff = recentAvg - olderAvg;
    if (diff > 5) trendDimension = 100;
    else if (diff < -5) trendDimension = 0;
    // else stays 50 (stable)
  }

  // ── Final weighted score ────────────────────────────────────────────────────
  const rawScore =
    quizDimension * 0.4 +
    masteryDimension * 0.25 +
    coverageDimension * 0.2 +
    trendDimension * 0.15;

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));
  const computedAt = now;

  const readinessScore: IReadinessScore = {
    score,
    quizDimension: Math.round(quizDimension),
    masteryDimension: Math.round(masteryDimension),
    coverageDimension: Math.round(coverageDimension),
    trendDimension: Math.round(trendDimension),
    computedAt,
  };

  // Persist cache on the Progress document
  if (progress) {
    await Progress.updateOne({ userId, sourceId }, { $set: { readinessScore } });
  }

  // ── Improvement suggestions ─────────────────────────────────────────────────
  const suggestions: Suggestion[] = [];
  if (quizAttempts.length === 0 && totalQuizzes > 0) {
    suggestions.push({ action: 'Take the quiz to assess your knowledge', impact: '+15 pts', type: 'quiz' });
  } else if (quizDimension < 60 && totalQuizzes > 0) {
    suggestions.push({ action: 'Retake the quiz to raise your score', impact: '+10 pts', type: 'quiz' });
  }
  if (masteryDimension < 60 && totalFlashcards > 0) {
    suggestions.push({ action: 'Review flashcards with spaced repetition', impact: '+8 pts', type: 'flashcards' });
  }
  if (coverageDimension < 50 && totalFlashcards > 0) {
    suggestions.push({ action: 'Study more of the flashcard set', impact: '+6 pts', type: 'flashcards' });
  }
  if (trendDimension < 30) {
    suggestions.push({ action: 'Return to consistent daily review', impact: '+5 pts', type: 'streak' });
  }

  return { ...readinessScore, suggestions: suggestions.slice(0, 3) };
}

/**
 * Get the cached or freshly computed readiness score for a source.
 * Returns cached value if it's less than 1 hour old.
 */
export async function getReadinessScore(
  userId: string,
  sourceId: string
): Promise<ReadinessResult> {
  await dbConnect();

  const progress = await Progress.findOne({ userId, sourceId }).lean();
  const cached = progress?.readinessScore;

  if (cached && cached.computedAt && Date.now() - new Date(cached.computedAt).getTime() < CACHE_TTL_MS) {
    // Return cached score with fresh suggestions
    const [flashcards, totalQuizzes] = await Promise.all([
      Flashcard.countDocuments({ userId, sourceId }),
      Quiz.countDocuments({ sourceId, userId }),
    ]);

    const suggestions: Suggestion[] = [];
    const quizAttempts = progress?.quizAttempts?.length ?? 0;
    if (quizAttempts === 0 && totalQuizzes > 0) {
      suggestions.push({ action: 'Take the quiz to assess your knowledge', impact: '+15 pts', type: 'quiz' });
    } else if (cached.quizDimension < 60 && totalQuizzes > 0) {
      suggestions.push({ action: 'Retake the quiz to raise your score', impact: '+10 pts', type: 'quiz' });
    }
    if (cached.masteryDimension < 60 && flashcards > 0) {
      suggestions.push({ action: 'Review flashcards with spaced repetition', impact: '+8 pts', type: 'flashcards' });
    }
    if (cached.coverageDimension < 50 && flashcards > 0) {
      suggestions.push({ action: 'Study more of the flashcard set', impact: '+6 pts', type: 'flashcards' });
    }

    return { ...cached, suggestions: suggestions.slice(0, 3) };
  }

  return computeReadinessScore(userId, sourceId);
}

/** Aggregate readiness across all of a user's sources. */
export async function getAggregateReadiness(
  userId: string
): Promise<{ overallScore: number; sources: { sourceId: string; score: number }[] }> {
  await dbConnect();

  const progresses = await Progress.find({ userId })
    .select('sourceId readinessScore')
    .lean();

  const sourcesWithScore = progresses
    .filter((p) => p.readinessScore != null)
    .map((p) => ({ sourceId: p.sourceId, score: p.readinessScore!.score }));

  const overallScore =
    sourcesWithScore.length > 0
      ? Math.round(sourcesWithScore.reduce((s, p) => s + p.score, 0) / sourcesWithScore.length)
      : 0;

  return { overallScore, sources: sourcesWithScore };
}
