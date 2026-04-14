import dbConnect from '@/lib/mongodb';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import Progress from '@/lib/models/Progress';
import Source from '@/lib/models/Source';
import User from '@/lib/models/User';
import type { IReadinessScore } from '@/lib/models/Progress';
import { getCached, CacheKeys } from '@/lib/cache';

// Minimum floor weight so sources unrelated to current goals still contribute
// a small amount — avoids hiding mastery on pivoted content entirely.
const MIN_GOAL_WEIGHT = 0.1;
// Neutral weight assigned to sources that don't have an embedding (e.g.,
// legacy sources processed before embeddings were rolled out). Keeps them
// in the average without letting them dominate.
const NEUTRAL_WEIGHT = 0.3;

function cosine(a: number[], b: number[]): number {
  // User + Source embeddings are L2-normalized at generation time
  // (see lib/embedding.ts), so dot product = cosine similarity.
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

const READINESS_TTL_SEC  = 24 * 60 * 60; // 24 hours — invalidated on quiz/flashcard review
const AGGREGATE_TTL_SEC  = 60 * 60;       // 1 hour — aggregate changes less frequently

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
  const masteredFlashcardIds: string[] = (progress?.masteredFlashcardIds ?? []).map((id: unknown) =>
    String(id)
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

  // Persist to Progress (upsert so flashcard-only users without a quiz attempt also get a score)
  await Progress.updateOne(
    { userId, sourceId },
    { $set: { readinessScore } },
    { upsert: true }
  );

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
 * Redis TTL: 24 hours. Invalidated after quiz submission or flashcard review.
 * Falls back to a full recompute if Redis is unavailable.
 */
export async function getReadinessScore(
  userId: string,
  sourceId: string
): Promise<ReadinessResult> {
  return getCached(
    CacheKeys.readiness(userId, sourceId),
    () => computeReadinessScore(userId, sourceId),
    READINESS_TTL_SEC
  );
}

/** Compute readiness score inline from pre-fetched data (no DB calls). */
function _computeScoreInline(
  progress: { sourceId: string; masteredFlashcardIds?: unknown[]; quizAttempts?: unknown[] },
  flashcards: { fsrs?: { state?: number; due?: Date | string }; masteredAt?: Date }[],
  totalQuizzes: number
): SourceWithDimensions {
  const quizAttempts = (progress.quizAttempts ?? []) as { score: number; completedAt: Date }[];
  const masteredFlashcardIds = progress.masteredFlashcardIds ?? [];
  const totalFlashcards = flashcards.length;
  const now = new Date();

  // Quiz dimension (40%)
  let quizDimension = 0;
  if (quizAttempts.length > 0) {
    const DECAY = 0.95;
    let weightedSum = 0, weightSum = 0;
    for (const attempt of quizAttempts) {
      const weeksSince = (now.getTime() - new Date(attempt.completedAt).getTime()) / (7 * 24 * 3600 * 1000);
      const weight = Math.pow(DECAY, weeksSince);
      weightedSum += (attempt.score / 100) * weight;
      weightSum += weight;
    }
    quizDimension = weightSum > 0 ? (weightedSum / weightSum) * 100 : 0;
  }

  // Mastery dimension (25%)
  let masteryDimension = 0;
  if (totalFlashcards > 0) {
    const fsrsMastered = flashcards.filter(
      (f) => (f.fsrs?.state ?? 0) >= 2 && f.fsrs?.due && new Date(f.fsrs.due) >= now
    ).length;
    masteryDimension = fsrsMastered > 0
      ? (fsrsMastered / totalFlashcards) * 100
      : masteredFlashcardIds.length > 0
        ? (masteredFlashcardIds.length / totalFlashcards) * 100
        : 0;
  }

  // Coverage dimension (20%)
  const flashcardCoverage = totalFlashcards > 0 ? flashcards.filter((f) => (f.fsrs?.state ?? 0) > 0).length / totalFlashcards : null;
  const quizCoverage = totalQuizzes > 0 ? Math.min(quizAttempts.length / totalQuizzes, 1) : null;
  const parts = [flashcardCoverage, quizCoverage].filter((v): v is number => v !== null);
  const coverageDimension = parts.length > 0 ? (parts.reduce((s, v) => s + v, 0) / parts.length) * 100 : 0;

  // Trend dimension (15%)
  let trendDimension = 50;
  if (quizAttempts.length >= 4) {
    const sorted = [...quizAttempts].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
    const mid = Math.floor(sorted.length / 2);
    const avg = (arr: typeof sorted) => arr.reduce((s, a) => s + a.score, 0) / arr.length;
    const diff = avg(sorted.slice(mid)) - avg(sorted.slice(0, mid));
    if (diff > 5) trendDimension = 100;
    else if (diff < -5) trendDimension = 0;
  }

  const rawScore = quizDimension * 0.4 + masteryDimension * 0.25 + coverageDimension * 0.2 + trendDimension * 0.15;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  return {
    sourceId: progress.sourceId,
    score,
    quizDimension: Math.round(quizDimension),
    masteryDimension: Math.round(masteryDimension),
    coverageDimension: Math.round(coverageDimension),
    trendDimension: Math.round(trendDimension),
  };
}

type SourceWithDimensions = {
  sourceId: string;
  score: number;
  quizDimension: number;
  masteryDimension: number;
  coverageDimension: number;
  trendDimension: number;
};

export interface AvgDimensions {
  quiz: number;
  mastery: number;
  coverage: number;
  trend: number;
}

export interface AggregateReadinessResult {
  overallScore: number;
  sources: { sourceId: string; score: number }[];
  avgDimensions: AvgDimensions | null;
  // True when the overall score was weighted by similarity between the user's
  // learning-goal embedding and each source's embedding. False when we fell
  // back to a simple unweighted mean (no user embedding, no source embeddings,
  // or all weights zero).
  isGoalWeighted: boolean;
}

/** Aggregate readiness across all of a user's sources. */
export async function getAggregateReadiness(userId: string): Promise<AggregateReadinessResult> {
  return getCached(
    CacheKeys.readinessAggregate(userId),
    () => _computeAggregateReadiness(userId),
    AGGREGATE_TTL_SEC
  );
}

async function _computeAggregateReadiness(userId: string): Promise<AggregateReadinessResult> {
  await dbConnect();

  const progresses = await Progress.find({ userId })
    .select('sourceId readinessScore masteredFlashcardIds quizAttempts')
    .lean() as unknown as { sourceId: string; readinessScore?: IReadinessScore | null; masteredFlashcardIds?: unknown[]; quizAttempts?: unknown[] }[];

  // Sources with a fresh cached score (include all dimension fields)
  const cached: SourceWithDimensions[] = progresses
    .filter((p) => p.readinessScore != null)
    .map((p) => ({
      sourceId: p.sourceId,
      score: p.readinessScore!.score,
      quizDimension: p.readinessScore!.quizDimension,
      masteryDimension: p.readinessScore!.masteryDimension,
      coverageDimension: p.readinessScore!.coverageDimension,
      trendDimension: p.readinessScore!.trendDimension,
    }));

  // Sources with activity but no cached score — compute inline so the dashboard
  // reflects existing progress on first load (not just after a new review).
  // Cap at 10 to prevent excessive DB calls on users with many sources.
  const needsCompute = progresses
    .filter(
      (p) =>
        p.readinessScore == null &&
        ((p.masteredFlashcardIds?.length ?? 0) > 0 || (p.quizAttempts?.length ?? 0) > 0)
    )
    .slice(0, 10);

  let fresh: SourceWithDimensions[] = [];
  if (needsCompute.length > 0) {
    // Batch-compute: 3 queries total instead of 3N
    const sourceIds = needsCompute.map((p) => p.sourceId);
    type FlashcardLean = { sourceId: string; fsrs?: { state?: number; due?: Date | string }; masteredAt?: Date };
    const [allFlashcards, allQuizCounts] = await Promise.all([
      Flashcard.find({ userId, sourceId: { $in: sourceIds } }).select('sourceId fsrs masteredAt').lean() as unknown as Promise<FlashcardLean[]>,
      Quiz.aggregate<{ _id: string; count: number }>([
        { $match: { sourceId: { $in: sourceIds }, userId } },
        { $group: { _id: '$sourceId', count: { $sum: 1 } } },
      ]),
    ]);

    const fcBySource = new Map<string, FlashcardLean[]>();
    for (const fc of allFlashcards) {
      const sid = fc.sourceId;
      if (!fcBySource.has(sid)) fcBySource.set(sid, []);
      fcBySource.get(sid)!.push(fc);
    }
    const qcBySource = new Map(allQuizCounts.map((r) => [r._id, r.count]));

    fresh = needsCompute
      .map((p) => {
        try {
          return _computeScoreInline(p, fcBySource.get(p.sourceId) ?? [], qcBySource.get(p.sourceId) ?? 0);
        } catch {
          return null;
        }
      })
      .filter((r): r is SourceWithDimensions => r !== null);

    // Persist computed scores in background (don't block response)
    Promise.all(
      fresh.map((s) =>
        Progress.updateOne(
          { userId, sourceId: s.sourceId },
          { $set: { readinessScore: { score: s.score, quizDimension: s.quizDimension, masteryDimension: s.masteryDimension, coverageDimension: s.coverageDimension, trendDimension: s.trendDimension, computedAt: new Date() } } }
        )
      )
    ).catch(() => {});
  }

  const sourcesWithScore = [...cached, ...fresh];

  if (sourcesWithScore.length === 0) {
    return { overallScore: 0, sources: [], avgDimensions: null, isGoalWeighted: false };
  }

  // ── Goal-weighted aggregate ─────────────────────────────────────────────────
  // Weight each source's score by its cosine similarity to the user's current
  // learning-goal embedding. Per-source scores are never altered — only the
  // aggregate is re-weighted, so that updating goals causes the dashboard
  // number to feel responsive without invalidating historical mastery.
  //
  // Cold-start fallback: if the user has no embedding, or none of the scored
  // sources have embeddings, fall through to a simple unweighted mean.
  const sourceIds = sourcesWithScore.map((s) => s.sourceId);
  const [userRow, sourceRows] = await Promise.all([
    User.findById(userId).select('preferences.embedding').lean() as unknown as Promise<{
      preferences?: { embedding?: number[] };
    } | null>,
    Source.find({ userId, sourceId: { $in: sourceIds } })
      .select('sourceId embedding')
      .lean() as unknown as Promise<{ sourceId: string; embedding?: number[] }[]>,
  ]);

  const userEmb = userRow?.preferences?.embedding;
  const embBySource = new Map<string, number[] | undefined>(
    sourceRows.map((s) => [s.sourceId, s.embedding]),
  );

  const canWeight =
    Array.isArray(userEmb) &&
    userEmb.length > 0 &&
    sourceRows.some((s) => Array.isArray(s.embedding) && s.embedding!.length === userEmb.length);

  let weights: number[];
  if (canWeight) {
    weights = sourcesWithScore.map((s) => {
      const emb = embBySource.get(s.sourceId);
      if (!emb || emb.length !== userEmb!.length) return NEUTRAL_WEIGHT;
      const sim = cosine(userEmb!, emb);
      return Math.max(MIN_GOAL_WEIGHT, sim);
    });
  } else {
    // Simple mean — represent as uniform weights so the formulas below stay
    // unified.
    weights = new Array(sourcesWithScore.length).fill(1);
  }

  const weightSum = weights.reduce((s, w) => s + w, 0);

  // Safety net: if weights somehow sum to zero (shouldn't happen given the
  // MIN_GOAL_WEIGHT floor, but guard anyway), fall back to simple mean.
  const useWeighted = canWeight && weightSum > 0;
  const effectiveWeights = useWeighted ? weights : new Array(sourcesWithScore.length).fill(1);
  const effectiveSum = useWeighted ? weightSum : sourcesWithScore.length;

  const weightedAvg = (pick: (s: SourceWithDimensions) => number) =>
    sourcesWithScore.reduce((sum, s, i) => sum + pick(s) * effectiveWeights[i], 0) / effectiveSum;

  const overallScore = Math.round(weightedAvg((s) => s.score));
  const avgDimensions: AvgDimensions = {
    quiz: Math.round(weightedAvg((s) => s.quizDimension)),
    mastery: Math.round(weightedAvg((s) => s.masteryDimension)),
    coverage: Math.round(weightedAvg((s) => s.coverageDimension)),
    trend: Math.round(weightedAvg((s) => s.trendDimension)),
  };

  return {
    overallScore,
    sources: sourcesWithScore.map((s) => ({ sourceId: s.sourceId, score: s.score })),
    avgDimensions,
    isGoalWeighted: useWeighted,
  };
}
