'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import SmartReviewSession from './SmartReviewSession';

interface FSRSStats {
  totalCards: number;
  dueToday: number;
  dueThisWeek: number;
  reviewsToday: number;
  averageRetention: number | null;
  nextReviewDate: string | null;
}

function formatNextReview(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 2) return 'in a moment';
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `in ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `in ${diffD}d`;
}

function urgencyLabel(due: number): string {
  if (due === 0) return 'All clear';
  if (due <= 5) return `${due} due`;
  if (due <= 15) return `${due} due soon`;
  return `${due} overdue`;
}

function urgencyClasses(due: number): { badge: string; button: string } {
  if (due === 0) return {
    badge: 'bg-muted/20 text-muted-foreground',
    button: '',
  };
  if (due <= 5) return {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    button: 'bg-accent text-white hover:bg-accent/90',
  };
  if (due <= 15) return {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    button: 'bg-amber-500 text-white hover:bg-amber-600',
  };
  return {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    button: 'bg-red-500 text-white hover:bg-red-600',
  };
}

function Skeleton() {
  return (
    <div className="bg-card-bg border border-border rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary/20" />
          <div className="h-4 w-24 rounded bg-secondary/20" />
        </div>
        <div className="h-5 w-16 rounded-full bg-secondary/20" />
      </div>
      <div className="h-11 rounded-xl bg-secondary/20 mb-4" />
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <div className="h-4 w-8 rounded bg-secondary/20 mx-auto mb-1" />
            <div className="h-3 w-16 rounded bg-secondary/20 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CardsDueWidget() {
  const [stats, setStats] = useState<FSRSStats | null>(null);
  const [error, setError] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const loadStats = () => {
    setError(false);
    fetch('/api/flashcards/stats')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setStats)
      .catch(() => setError(true));
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/flashcards/stats')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (mounted) setStats(data); })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, []);

  const handleSessionComplete = () => {
    setReviewOpen(false);
    loadStats();
  };

  if (!stats && !error) return <Skeleton />;

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Couldn&apos;t load review stats.</span>
          <button onClick={loadStats} className="text-accent hover:underline cursor-pointer">Retry</button>
        </div>
      </div>
    );
  }

  const { dueToday, reviewsToday, averageRetention, nextReviewDate, totalCards } = stats!;
  const { badge, button } = urgencyClasses(dueToday);
  const label = urgencyLabel(dueToday);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-card-bg border border-border rounded-2xl p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-accent" />
            </div>
            <span className="font-semibold text-foreground">Smart Review</span>
          </div>
          <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${badge}`} aria-label={`${label} for review`}>
            {label}
          </span>
        </div>

        {/* Main action */}
        {dueToday > 0 ? (
          <button
            onClick={() => setReviewOpen(true)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer mb-4 ${button}`}
            aria-label={`Study now — ${dueToday} card${dueToday !== 1 ? 's' : ''} due`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Study Now
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/20 mb-4">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">
              All caught up!
              {nextReviewDate && (
                <span> Next review {formatNextReview(nextReviewDate)}.</span>
              )}
            </span>
          </div>
        )}

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="font-semibold text-foreground">{totalCards}</div>
            <div className="text-muted-foreground">Total cards</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">{reviewsToday}</div>
            <div className="text-muted-foreground">Reviewed today</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">
              {averageRetention !== null ? `${averageRetention}%` : '—'}
            </div>
            <div className="text-muted-foreground">Retention</div>
          </div>
        </div>
      </motion.div>

      {reviewOpen && (
        <SmartReviewSession
          onClose={() => setReviewOpen(false)}
          onSessionComplete={handleSessionComplete}
        />
      )}
    </>
  );
}
