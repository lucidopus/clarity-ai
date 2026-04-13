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

/** Human-readable labels shown in the UI per source key. */
export const TOOL_LABELS: Record<string, string> = {
  // source: 'Reading source content', // TODO: Re-enable once we implement smart chunking to stay within Groq TPM limits. Full source text (~7.5k tokens) blows the 8k/12k free-tier budget. For now the system prompt summary handles general content questions.
  flashcards: 'Looking at your flashcards',
  quizzes: 'Checking your quiz questions',
  progress: 'Reviewing your study progress',
};

const MAX_SOURCE_CHARS = 30_000; // ~7.5k tokens — keep context manageable

// ── Individual fetchers (module-level, accept userId + sourceId) ─────

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Kept for re-enabling source lookup after smart chunking
async function fetchSource(userId: string, sourceId: string): Promise<string> {
  await dbConnect();
  const doc = await SourceContent.findOne({ userId, sourceId })
    .select('fullText wordCount')
    .lean();

  if (!doc) return 'No source content found for this material.';

  const { fullText, wordCount } = doc as unknown as { fullText: string; wordCount: number };

  if (fullText.length > MAX_SOURCE_CHARS) {
    return `[Source content — ${wordCount} words, showing first ${MAX_SOURCE_CHARS} characters]\n\n${fullText.slice(0, MAX_SOURCE_CHARS)}\n\n[...truncated]`;
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
    lines.push(`\nClarity Score: ${r.score.toFixed(0)}/100`);
    lines.push(`  Quiz dimension: ${r.quizDimension.toFixed(0)}/100`);
    lines.push(`  Mastery dimension: ${r.masteryDimension.toFixed(0)}/100`);
    lines.push(`  Coverage dimension: ${r.coverageDimension.toFixed(0)}/100`);
    lines.push(`  Trend dimension: ${r.trendDimension.toFixed(0)}/100`);
  }

  if (p.totalStudyTimeSeconds > 0) {
    const mins = Math.round(p.totalStudyTimeSeconds / 60);
    lines.push(`\nTotal study time: ${mins} minutes`);
  }

  return lines.join('\n');
}

// ── Fetcher registry (used by the tool) ─────────────────────────────

// TODO: Add 'source' back once smart chunking is implemented (see TOOL_LABELS comment)
type SourceKey = /* 'source' | */ 'flashcards' | 'quizzes' | 'progress';

function buildFetchers(userId: string, sourceId: string): Record<SourceKey, () => Promise<string>> {
  return {
    // source: () => fetchSource(userId, sourceId), // Disabled — full source text exceeds Groq free-tier TPM. Summary in system prompt covers general content questions.
    flashcards: () => fetchFlashcards(userId, sourceId),
    quizzes: () => fetchQuizzes(userId, sourceId),
    progress: () => fetchProgress(userId, sourceId),
  };
}

/**
 * Create Clara's tool set, scoped to a specific user and source.
 * Returns an array containing the single `request_information` tool.
 */
export function createClaraTools(userId: string, sourceId: string) {
  const fetchers = buildFetchers(userId, sourceId);

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
        'Look up the student\'s learning materials for this source. Retrieves one or more types of study data in a single call — flashcards, quizzes, and/or study progress. Always request everything you need at once.',
      schema: z.object({
        sources: z
          // TODO: Add 'source' back once smart chunking is implemented
          .array(z.enum([/* 'source', */ 'flashcards', 'quizzes', 'progress']))
          .min(1)
          .describe('Which data to fetch. Options: flashcards (Q&A pairs), quizzes (quiz questions), progress (study stats).'),
      }),
    },
  );

  return [requestInformation];
}
