'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Brain, Trophy } from 'lucide-react';
import Button from '@/components/Button';
import SmartReviewSession, { type DueCard } from '@/components/SmartReviewSession';
import QuizInterface, { type Quiz } from '@/components/QuizInterface';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MixItem {
  type: 'flashcard-review' | 'quiz';
  sourceId?: string;
  sourceTitle?: string;
  itemIds: string[];
  estimatedMinutes: number;
  completed: boolean;
}

interface MixData {
  items: MixItem[];
  totalMinutes: number;
  targetMinutes: number;
  completed: boolean;
  summary: { flashcardCount: number; quizCount: number };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StudySessionPage() {
  const router = useRouter();

  const [mix, setMix] = useState<MixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Content for current item
  const [flashcards, setFlashcards] = useState<DueCard[] | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [quizSourceId, setQuizSourceId] = useState<string>('');

  // Stats for completion screen
  const [flashcardsReviewed, setFlashcardsReviewed] = useState(0);
  const [quizzesCompleted, setQuizzesCompleted] = useState(0);

  // Load mix
  useEffect(() => {
    fetch('/api/dashboard/todays-mix')
      .then(r => r.json())
      .then((data: MixData) => {
        setMix(data);
        if (data.completed) {
          setSessionComplete(true);
        } else {
          const firstUncompleted = data.items.findIndex(i => !i.completed);
          if (firstUncompleted >= 0) setCurrentItemIndex(firstUncompleted);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load content for current item
  useEffect(() => {
    if (!mix || sessionComplete) return;
    const item = mix.items[currentItemIndex];
    if (!item || item.completed) return;

    let cancelled = false;

    if (item.type === 'flashcard-review') {
      const ids = item.itemIds.join(',');
      fetch(`/api/flashcards/by-ids?ids=${ids}`)
        .then(r => r.json())
        .then(data => {
          if (!cancelled) {
            setQuizzes(null);
            setFlashcards(data.flashcards || []);
          }
        })
        .catch(() => {});
    } else if (item.type === 'quiz') {
      const ids = item.itemIds.join(',');
      fetch(`/api/quizzes/by-ids?ids=${ids}`)
        .then(r => r.json())
        .then(data => {
          if (!cancelled) {
            setFlashcards(null);
            setQuizSourceId(item.sourceId || '');
            const mapped: Quiz[] = (data.quizzes || []).map((q: Record<string, unknown>) => ({
              id: q._id as string,
              questionText: q.questionText as string,
              type: 'multiple-choice' as const,
              options: q.options as string[],
              correctAnswerIndex: q.correctAnswerIndex as number,
              explanation: q.explanation as string,
            }));
            setQuizzes(mapped);
          }
        })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, [mix, currentItemIndex, sessionComplete]);

  // ─── Item completion ──────────────────────────────────────────────────────

  const markItemComplete = useCallback(async () => {
    if (!mix) return;

    try {
      const res = await fetch('/api/dashboard/todays-mix/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex: currentItemIndex }),
      });
      const updated: MixData = await res.json();
      setMix(updated);

      if (updated.completed) {
        setSessionComplete(true);
        window.dispatchEvent(new CustomEvent('activity:logged'));
      } else {
        const nextIdx = updated.items.findIndex((item, i) => i > currentItemIndex && !item.completed);
        if (nextIdx >= 0) {
          setCurrentItemIndex(nextIdx);
        } else {
          setSessionComplete(true);
        }
      }
    } catch {
      // Allow retry
    }
  }, [mix, currentItemIndex]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Brain className="w-10 h-10 text-accent mx-auto mb-3 animate-pulse" />
          <p className="text-muted-foreground">Preparing your session...</p>
        </div>
      </div>
    );
  }

  if (!mix || mix.items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Nothing to study</h2>
          <p className="text-sm text-muted-foreground mb-4">Generate some materials first, then come back for your daily session.</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/home')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Session complete
  if (sessionComplete) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Session Complete</h2>
          <p className="text-muted-foreground mb-6">
            {flashcardsReviewed > 0 && `${flashcardsReviewed} cards reviewed`}
            {flashcardsReviewed > 0 && quizzesCompleted > 0 && ' + '}
            {quizzesCompleted > 0 && `${quizzesCompleted} quizzes completed`}
          </p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('activity:logged'));
              router.push('/dashboard/home');
            }}
          >
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  const currentItem = mix.items[currentItemIndex];

  // Flashcard review — delegate to SmartReviewSession (full overlay)
  if (currentItem.type === 'flashcard-review' && flashcards) {
    return (
      <SmartReviewSession
        initialCards={flashcards}
        onClose={() => router.push('/dashboard/home')}
        onSessionComplete={(stats) => {
          setFlashcardsReviewed(prev => prev + stats.again + stats.hard + stats.good + stats.easy);
          markItemComplete();
        }}
      />
    );
  }

  // Quiz — delegate to QuizInterface (inline)
  if (currentItem.type === 'quiz' && quizzes) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/dashboard/home')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <p className="text-sm text-muted-foreground">
            Today&apos;s Mix — Quiz
          </p>
        </div>
        <QuizInterface
          quizzes={quizzes}
          videoId={quizSourceId}
        />
        <div className="mt-6 text-center">
          <Button
            variant="primary"
            onClick={() => {
              setQuizzesCompleted(prev => prev + quizzes.length);
              markItemComplete();
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Loading content for current item
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Brain className="w-10 h-10 text-accent mx-auto mb-3 animate-pulse" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
