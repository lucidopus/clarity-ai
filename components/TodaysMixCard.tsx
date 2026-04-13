'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, CheckCircle2, Zap, Layers } from 'lucide-react';
import Button from './Button';

interface MixItem {
  type: 'flashcard-review' | 'quiz';
  sourceTitle?: string;
  itemIds: string[];
  estimatedMinutes: number;
  completed: boolean;
}

interface MixData {
  date: string;
  items: MixItem[];
  totalMinutes: number;
  targetMinutes: number;
  completed: boolean;
  summary: {
    flashcardCount: number;
    quizCount: number;
  };
  totalCards?: number;
  nextReviewDate?: string | null;
}

function formatNextReview(dateStr: string | null | undefined): string {
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

export default function TodaysMixCard({ className }: { className?: string }) {
  const router = useRouter();
  const [data, setData] = useState<MixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchMix = () => {
    fetch('/api/dashboard/todays-mix')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMix();
  }, []);

  // Refresh on activity
  useEffect(() => {
    const handler = () => fetchMix();
    window.addEventListener('activity:logged', handler);
    return () => window.removeEventListener('activity:logged', handler);
  }, []);

  if (loading) {
    return (
      <div className={`bg-card-bg border border-border rounded-2xl p-5 animate-pulse ${className || ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-secondary/20" />
          <div className="h-5 w-32 rounded bg-secondary/20" />
        </div>
        <div className="h-10 rounded-xl bg-secondary/15 mb-3" />
        <div className="h-8 rounded-lg bg-secondary/10" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-card-bg border border-border rounded-2xl p-5 ${className || ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-accent" />
          </div>
          <h3 className="font-semibold text-foreground">Today&apos;s Mix</h3>
        </div>
        <p className="text-sm text-muted-foreground">Generate your first materials to unlock your daily mix.</p>
      </div>
    );
  }

  // Empty mix — distinguish "all caught up" vs "no content at all"
  if (data.items.length === 0) {
    const hasSomeContent = (data.totalCards ?? 0) > 0;
    return (
      <div className={`bg-card-bg border border-border rounded-2xl p-5 ${className || ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            {hasSomeContent ? <CheckCircle2 className="w-4.5 h-4.5 text-accent" /> : <Zap className="w-4.5 h-4.5 text-accent" />}
          </div>
          <h3 className="font-semibold text-foreground">Today&apos;s Mix</h3>
        </div>
        {hasSomeContent ? (
          <p className="text-sm text-muted-foreground">
            All caught up — nothing due right now.
            {data.nextReviewDate && <> Next review {formatNextReview(data.nextReviewDate)}.</>}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Generate your first materials to unlock your daily mix.</p>
        )}
      </div>
    );
  }

  const completedItems = data.items.filter(i => i.completed).length;
  const progress = (completedItems / data.items.length) * 100;
  const remainingMinutes = data.items
    .filter(i => !i.completed)
    .reduce((sum, i) => sum + i.estimatedMinutes, 0);

  // Build session description
  const parts: string[] = [];
  if (data.summary.flashcardCount > 0) parts.push(`${data.summary.flashcardCount} flashcard${data.summary.flashcardCount !== 1 ? 's' : ''}`);
  if (data.summary.quizCount > 0) parts.push(`${data.summary.quizCount} quiz question${data.summary.quizCount !== 1 ? 's' : ''}`);
  const description = parts.join(' + ');

  // Completed state
  if (data.completed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`bg-card-bg border border-green-500/20 rounded-2xl p-5 ${className || ''}`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Daily Goal Met</h3>
            <p className="text-xs text-muted-foreground">{description} completed</p>
          </div>
        </div>
        <div className="h-1.5 bg-green-500/20 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full w-full" />
        </div>
      </motion.div>
    );
  }

  // In-progress state
  if (completedItems > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`bg-card-bg border border-accent/20 rounded-2xl p-5 ${className || ''}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Continue Session</h3>
              <p className="text-xs text-muted-foreground">{remainingMinutes} min left</p>
            </div>
          </div>
          <span className="text-sm font-medium text-accent">{completedItems}/{data.items.length}</span>
        </div>
        <div className="h-1.5 bg-accent/10 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => router.push('/dashboard/home/study-session')}
        >
          <Play className="w-4 h-4 mr-2" />
          Continue
        </Button>
      </motion.div>
    );
  }

  // Ready state — not started
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-linear-to-br from-accent/8 to-accent/3 border border-accent/15 rounded-2xl p-5 ${className || ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
          <Zap className="w-4.5 h-4.5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Today&apos;s Mix</h3>
          <p className="text-xs text-muted-foreground">Guided session — flashcards + quizzes, sized to your schedule</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground my-3">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          {description}
        </span>
      </div>

      <Button
        variant="primary"
        size="sm"
        className="w-full"
        onClick={() => router.push('/dashboard/home/study-session')}
      >
        <Play className="w-4 h-4 mr-2" />
        Start Session
      </Button>
    </motion.div>
  );
}
