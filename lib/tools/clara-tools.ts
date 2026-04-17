/**
 * Agentic tool for Clara — the AI tutor chatbot.
 *
 * Single `request_information` tool that accepts an array of source keys
 * and fetches all requested data in parallel. This ensures exactly 2 LLM
 * calls per tool-using query (route + answer) instead of N+1.
 *
 * Source keys: source, flashcards, quizzes, progress
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import SourceContent from '@/lib/models/SourceContent';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import Progress from '@/lib/models/Progress';
import User from '@/lib/models/User';
import { validateStudyContract } from '@/lib/services/studyContract';
import { INPUT_LIMITS } from '@/lib/limits';

/** Human-readable labels shown in the UI per source key. */
export const TOOL_LABELS: Record<string, string> = {
  source: 'Reading source content',
  flashcards: 'Looking at your flashcards',
  quizzes: 'Checking your quiz questions',
  progress: 'Reviewing your study progress',
  set_study_contract: 'Saving your study window',
};

// ── Individual fetchers (module-level, accept userId + sourceId) ─────

async function fetchSource(userId: string, sourceId: string): Promise<string> {
  await dbConnect();
  const doc = await SourceContent.findOne({ userId, sourceId })
    .select('fullText wordCount')
    .lean();

  if (!doc) return 'No source content found for this material.';

  const { fullText, wordCount } = doc as unknown as { fullText: string; wordCount: number };

  if (fullText.length > INPUT_LIMITS.sourceContentChars) {
    return `[Source content — ${wordCount} words, showing first ${INPUT_LIMITS.sourceContentChars} characters]\n\n${fullText.slice(0, INPUT_LIMITS.sourceContentChars)}\n\n[...truncated]`;
  }

  return `[Source content — ${wordCount} words]\n\n${fullText}`;
}

async function fetchFlashcards(userId: string, sourceId: string): Promise<string> {
  await dbConnect();
  const cards = await Flashcard.find({ userId, sourceId })
    .select('question answer difficulty generationType')
    .limit(50)
    .lean();

  if (cards.length === 0) return 'No flashcards found for this source.';

  const formatted = cards.map((c, i) => {
    const card = c as unknown as { question: string; answer: string; difficulty?: string; generationType: string };
    return `${i + 1}. Q: ${card.question}\n   A: ${card.answer}${card.difficulty ? ` [${card.difficulty}]` : ''}`;
  });

  return `[${cards.length} flashcards for this source]\n\n${formatted.join('\n\n')}`;
}

async function fetchQuizzes(userId: string, sourceId: string): Promise<string> {
  await dbConnect();
  const quizzes = await Quiz.find({ userId, sourceId })
    .select('questionText options correctAnswerIndex explanation difficulty')
    .lean();

  if (quizzes.length === 0) return 'No quiz questions found for this source.';

  const formatted = quizzes.map((q, i) => {
    const quiz = q as unknown as {
      questionText: string;
      options: string[];
      correctAnswerIndex: number;
      explanation?: string;
      difficulty: string;
    };
    const optionLines = quiz.options
      .map((opt, j) => `   ${String.fromCharCode(65 + j)}) ${opt}${j === quiz.correctAnswerIndex ? ' ✓' : ''}`)
      .join('\n');
    return `${i + 1}. ${quiz.questionText} [${quiz.difficulty}]\n${optionLines}${quiz.explanation ? `\n   Explanation: ${quiz.explanation}` : ''}`;
  });

  return `[${quizzes.length} quiz questions for this source]\n\n${formatted.join('\n\n')}`;
}

async function fetchProgress(userId: string, sourceId: string): Promise<string> {
  await dbConnect();

  const [progress, totalFlashcards, totalQuizzes, dueCards] = await Promise.all([
    Progress.findOne({ userId, sourceId }).lean(),
    Flashcard.countDocuments({ userId, sourceId }),
    Quiz.countDocuments({ userId, sourceId }),
    Flashcard.countDocuments({ userId, sourceId, 'fsrs.due': { $lte: new Date() } }),
  ]);

  if (!progress) {
    return `[Study progress]\nNo study activity recorded yet for this source.\nTotal flashcards: ${totalFlashcards}\nTotal quiz questions: ${totalQuizzes}`;
  }

  const p = progress as unknown as {
    masteredFlashcardIds: unknown[];
    masteredQuizIds: unknown[];
    quizAttempts: { quizId: unknown; score: number; attemptNumber: number; completedAt: Date }[];
    calibrationHistory: { brierScore: number; misinformedCount: number }[];
    readinessScore?: { score: number; quizDimension: number; masteryDimension: number; coverageDimension: number; trendDimension: number };
    totalStudyTimeSeconds: number;
  };

  const lines: string[] = ['[Study progress for this source]'];

  lines.push(`\nFlashcards: ${(p.masteredFlashcardIds || []).length} mastered out of ${totalFlashcards} total`);
  lines.push(`Cards due for review: ${dueCards}`);

  lines.push(`\nQuiz questions: ${totalQuizzes} total, ${(p.masteredQuizIds || []).length} mastered`);
  if (p.quizAttempts?.length > 0) {
    const recentAttempts = p.quizAttempts.slice(-10);
    const avgScore = recentAttempts.reduce((sum, a) => sum + a.score, 0) / recentAttempts.length;
    lines.push(`Recent quiz attempts: ${recentAttempts.length} (avg score: ${avgScore.toFixed(0)}%)`);

    for (const a of recentAttempts.slice(-5)) {
      lines.push(`  - Score: ${a.score}% (attempt #${a.attemptNumber}, ${new Date(a.completedAt).toLocaleDateString()})`);
    }
  }

  if (p.calibrationHistory?.length > 0) {
    const latest = p.calibrationHistory[p.calibrationHistory.length - 1];
    lines.push(`\nCalibration (Brier score): ${latest.brierScore.toFixed(2)} — ${latest.misinformedCount} blind spots detected`);
  }

  if (p.readinessScore) {
    const r = p.readinessScore;
    lines.push(`\nClarity Score (this source only): ${r.score.toFixed(0)}/100`);
    lines.push(`  Quiz dimension: ${r.quizDimension.toFixed(0)}/100`);
    lines.push(`  Mastery dimension: ${r.masteryDimension.toFixed(0)}/100`);
    lines.push(`  Coverage dimension: ${r.coverageDimension.toFixed(0)}/100`);
    lines.push(`  Trend dimension: ${r.trendDimension.toFixed(0)}/100`);
    lines.push(`  Note: The dashboard shows your overall Clarity Score averaged across ALL sources, which may differ from this per-source score.`);
  }

  if (p.totalStudyTimeSeconds > 0) {
    const mins = Math.round(p.totalStudyTimeSeconds / 60);
    lines.push(`\nTotal study time: ${mins} minutes`);
  }

  return lines.join('\n');
}

// ── Fetcher registry (used by the tool) ─────────────────────────────

type SourceKey = 'source' | 'flashcards' | 'quizzes' | 'progress';

function buildFetchers(
  userId: string,
  generationSourceId: string,
  activeSourceId: string,
): Record<SourceKey, () => Promise<string>> {
  return {
    // Source content is per-sub-source (PDF text differs from YouTube transcript),
    // so `source` follows the tab the user is actively viewing.
    source: () => fetchSource(userId, activeSourceId),
    // Flashcards / quizzes / progress are stored against the generation's
    // primary sourceId, so they stay pinned to that even when the user is on
    // a secondary tab.
    flashcards: () => fetchFlashcards(userId, generationSourceId),
    quizzes: () => fetchQuizzes(userId, generationSourceId),
    progress: () => fetchProgress(userId, generationSourceId),
  };
}

/**
 * Create Clara's tool set, scoped to a specific user and generation.
 *
 * `generationSourceId` is the parent generation's sourceId (= URL videoId) —
 * flashcards/quizzes/progress are keyed here. `activeSourceId` is the source
 * tab the user is currently viewing; when omitted, falls back to
 * `generationSourceId` for single-source generations.
 */
export function createClaraTools(
  userId: string,
  generationSourceId: string,
  activeSourceId?: string,
) {
  const fetchers = buildFetchers(
    userId,
    generationSourceId,
    activeSourceId || generationSourceId,
  );

  const requestInformation = tool(
    async (input: { sources: SourceKey[] }) => {
      const settled = await Promise.allSettled(
        input.sources.map((key) => {
          const fetcher = fetchers[key];
          if (!fetcher) return Promise.resolve(`[Unknown source: ${key}]`);
          return fetcher();
        }),
      );

      return input.sources
        .map((key, i) => {
          const result = settled[i];
          const content = result.status === 'fulfilled'
            ? result.value
            : `Error fetching ${key}: ${(result.reason as Error)?.message || 'Unknown error'}`;
          return `===== ${key.toUpperCase()} =====\n${content}`;
        })
        .join('\n\n');
    },
    {
      name: 'lookup_study_materials',
      description:
        'Look up the student\'s learning materials for this source. Retrieves one or more types of study data in a single call — flashcards, quizzes, source content, and/or study progress. Always request everything you need at once.',
      schema: z.object({
        sources: z
          .array(z.enum(['source', 'flashcards', 'quizzes', 'progress']))
          .min(1)
          .describe('Which data to fetch. Options: source (full text), flashcards (Q&A pairs), quizzes (quiz questions), progress (study stats).'),
      }),
    },
  );

  const setStudyContract = tool(
    async (input: { windowStart: string; windowEnd: string; timezone: string }) => {
      const invalid = validateStudyContract(input.windowStart, input.windowEnd, input.timezone);
      if (invalid) return `Could not save the study window: ${invalid}`;
      await dbConnect();
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            studyContract: {
              windowStart: input.windowStart,
              windowEnd: input.windowEnd,
              timezone: input.timezone,
              contractedAt: new Date(),
            },
          },
        },
      );
      return `Study window saved: ${input.windowStart}–${input.windowEnd} (${input.timezone}). Activity inside this window earns the Gold day tier. A single pre-window reminder will be sent 15 minutes before it starts.`;
    },
    {
      name: 'set_study_contract',
      description:
        "Save the student's daily study window (their Cognitive Contract). Use only when the student has explicitly picked a specific start and end time for studying. Implementation-intention research shows pegging a goal to a concrete time is far more effective than willpower.",
      schema: z.object({
        windowStart: z
          .string()
          .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
          .describe('Window start, 24-hour "HH:MM" format, in the student\'s local time.'),
        windowEnd: z
          .string()
          .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
          .describe('Window end, 24-hour "HH:MM" format, must be strictly after windowStart.'),
        timezone: z
          .string()
          .describe('IANA timezone identifier, e.g. "America/New_York". Use the student\'s current timezone.'),
      }),
    },
  );

  return [requestInformation, setStudyContract];
}
