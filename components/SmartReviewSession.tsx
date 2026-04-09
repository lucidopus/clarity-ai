'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, CheckCircle2, Brain, Clock, AlertCircle } from 'lucide-react';
import Button from './Button';
import { Rating, getSchedulingPreview, formatInterval } from '@/lib/services/fsrs';
import type { IFSRSCard } from '@/lib/models/Flashcard';

interface DueCard {
  _id: string;
  question: string;
  answer: string;
  sourceId: string;
  fsrs: IFSRSCard;
}

interface SessionStats {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

interface SmartReviewSessionProps {
  onClose: () => void;
  onSessionComplete?: (stats: SessionStats) => void;
}

const RATING_CONFIG = [
  { rating: Rating.Again, label: 'Again', key: '1', colorClass: 'border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30' },
  { rating: Rating.Hard,  label: 'Hard',  key: '2', colorClass: 'border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30' },
  { rating: Rating.Good,  label: 'Good',  key: '3', colorClass: 'border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30' },
  { rating: Rating.Easy,  label: 'Easy',  key: '4', colorClass: 'border-accent text-accent hover:bg-accent/10' },
];

export default function SmartReviewSession({ onClose, onSessionComplete }: SmartReviewSessionProps) {
  const shouldReduceMotion = useReducedMotion();

  const [cards, setCards] = useState<DueCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [revealTime, setRevealTime] = useState<number | null>(null);
  const [stats, setStats] = useState<SessionStats>({ again: 0, hard: 0, good: 0, easy: 0 });

  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const showAnswerBtnRef = useRef<HTMLButtonElement>(null);

  // Live session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const sessionMinutes = Math.floor(elapsedSeconds / 60);

  useEffect(() => {
    fetch('/api/flashcards/due')
      .then((r) => r.json())
      .then((data) => {
        setCards((data.dueCards ?? []).slice(0, 50));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-focus "Show Answer" button when card changes
  useEffect(() => {
    if (!loading && !sessionDone && showAnswerBtnRef.current) {
      showAnswerBtnRef.current.focus();
    }
  }, [currentIndex, loading, sessionDone]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (sessionDone || loading) return;

      if ((e.key === ' ' || e.key === 'Enter') && !showAnswer) {
        e.preventDefault();
        setShowAnswer(true);
        setRevealTime(Date.now());
        return;
      }
      if (showAnswer && !submitting) {
        if (e.key === '1') handleRate(Rating.Again);
        if (e.key === '2') handleRate(Rating.Hard);
        if (e.key === '3') handleRate(Rating.Good);
        if (e.key === '4') handleRate(Rating.Easy);
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnswer, submitting, sessionDone, loading]);

  const currentCard = cards[currentIndex];

  const intervals = useMemo(() => {
    if (!currentCard?.fsrs || !showAnswer) return null;
    const now = new Date();
    const preview = getSchedulingPreview(currentCard.fsrs, now);
    return {
      [Rating.Again]: formatInterval(preview[Rating.Again].due, now),
      [Rating.Hard]:  formatInterval(preview[Rating.Hard].due,  now),
      [Rating.Good]:  formatInterval(preview[Rating.Good].due,  now),
      [Rating.Easy]:  formatInterval(preview[Rating.Easy].due,  now),
    };
  }, [currentCard, showAnswer]);

  const handleRate = useCallback(async (rating: Rating) => {
    if (!currentCard || submitting) return;
    setSubmitting(true);
    setReviewError(false);

    const responseTimeMs = revealTime ? Date.now() - revealTime : undefined;
    const statKey = ({ [Rating.Again]: 'again', [Rating.Hard]: 'hard', [Rating.Good]: 'good', [Rating.Easy]: 'easy' } as const)[rating];

    try {
      const res = await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcardId: currentCard._id, rating, responseTimeMs }),
      });
      if (!res.ok) throw new Error('Review failed');

      const newStats = { ...stats, [statKey]: stats[statKey] + 1 };
      setStats(newStats);

      if (currentIndex + 1 >= cards.length) {
        setSessionDone(true);
        onSessionComplete?.(newStats);
      } else {
        setCurrentIndex((i) => i + 1);
        setShowAnswer(false);
        setRevealTime(null);
      }
    } catch {
      setReviewError(true);
    }
    setSubmitting(false);
  }, [currentCard, submitting, revealTime, currentIndex, cards.length, stats, onSessionComplete]);

  const cardVariants = {
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit:    shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 },
  };

  const revealVariants = {
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 },
    animate: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' },
    exit:    shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 },
  };

  // Loading
  if (loading) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Smart Review Session" className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-10 h-10 text-accent mx-auto mb-3 animate-pulse" />
          <p className="text-muted-foreground">Loading due cards...</p>
        </div>
      </div>
    );
  }

  // No cards due
  if (cards.length === 0) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Smart Review Session" className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          className="bg-card-bg border border-border rounded-2xl p-10 max-w-sm w-full text-center shadow-xl"
        >
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">All caught up!</h2>
          <p className="text-muted-foreground mb-6">No cards are due right now. Come back later to review.</p>
          <Button variant="primary" onClick={onClose}>Close</Button>
        </motion.div>
      </div>
    );
  }

  // Session complete
  if (sessionDone) {
    const total = stats.again + stats.hard + stats.good + stats.easy;
    const retention = total > 0 ? Math.round(((stats.good + stats.easy) / total) * 100) : 0;

    return (
      <div role="dialog" aria-modal="true" aria-label="Smart Review Session" className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          className="bg-card-bg border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-xl"
        >
          <CheckCircle2 className="w-14 h-14 text-accent mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-1">Session Complete</h2>
          <p className="text-muted-foreground mb-6">{total} cards reviewed in {sessionMinutes || 1}m</p>

          <div className="grid grid-cols-4 gap-2 mb-6 text-sm">
            {[
              { label: 'Again', count: stats.again, color: 'text-red-500' },
              { label: 'Hard', count: stats.hard, color: 'text-amber-500' },
              { label: 'Good', count: stats.good, color: 'text-green-500' },
              { label: 'Easy', count: stats.easy, color: 'text-accent' },
            ].map(({ label, count, color }) => (
              <div key={label} className="bg-muted/20 rounded-xl p-3">
                <div className={`text-xl font-bold ${color}`}>{count}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          <div className="text-sm text-muted-foreground mb-6">
            Retention rate: <span className="font-semibold text-foreground">{retention}%</span>
          </div>

          <Button variant="primary" onClick={onClose} className="w-full">Done</Button>
        </motion.div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Smart Review Session"
      className="fixed inset-0 z-50 bg-background/97 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-accent" />
          <span className="font-semibold text-foreground">Smart Review</span>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label={`Session time: ${sessionMinutes} minutes`}>
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{sessionMinutes}m</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Exit review session (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted/30" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={cards.length}>
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${progress}%` }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
        />
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.25 }}
            className="w-full"
          >
            {/* Question */}
            <div className="bg-card-bg border-2 border-border rounded-2xl p-8 mb-6 min-h-[160px] flex items-center justify-center">
              <p className="text-xl font-medium text-foreground text-center leading-relaxed">
                {currentCard.question}
              </p>
            </div>

            {/* Review error */}
            {reviewError && (
              <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Review didn&apos;t save. Please try rating again.
              </div>
            )}

            {/* Answer reveal */}
            <AnimatePresence>
              {showAnswer && (
                <motion.div
                  variants={revealVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: shouldReduceMotion ? 0.01 : 0.25 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="bg-accent/5 border-2 border-accent/30 rounded-2xl p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Answer</p>
                    <p className="text-lg text-foreground leading-relaxed">{currentCard.answer}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action area */}
            {!showAnswer ? (
              <div className="text-center">
                <button
                  ref={showAnswerBtnRef}
                  onClick={() => { setShowAnswer(true); setRevealTime(Date.now()); }}
                  className="px-10 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                  aria-keyshortcuts="Space"
                >
                  Show Answer
                  <span className="ml-2 text-xs opacity-60" aria-hidden="true">Space</span>
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground text-center mb-3">
                  How well did you know this? <span className="opacity-60" aria-hidden="true">(1–4)</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {RATING_CONFIG.map(({ rating, label, key, colorClass }) => (
                    <button
                      key={rating}
                      onClick={() => handleRate(rating)}
                      disabled={submitting}
                      aria-label={`Rate ${label}. Next review ${intervals?.[rating] ?? 'calculating'}. Press ${key}.`}
                      className={`flex flex-col items-center py-3 px-2 border-2 rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 bg-card-bg ${colorClass}`}
                    >
                      <span className="font-semibold text-sm">{label}</span>
                      <span className="text-xs opacity-70 mt-0.5" aria-hidden="true">
                        {intervals?.[rating] ?? '...'}
                      </span>
                      <span className="text-xs opacity-40 mt-0.5" aria-hidden="true">{key}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <div className="pb-4 text-center" aria-hidden="true">
        <p className="text-xs text-muted-foreground">
          {!showAnswer ? 'Space / Enter to reveal · Esc to exit' : '1 Again · 2 Hard · 3 Good · 4 Easy · Esc to exit'}
        </p>
      </div>
    </div>
  );
}
