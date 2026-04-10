'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Circle, AlertCircle, Trophy } from 'lucide-react';
import type { IChallenge } from '@/lib/models/DailyChallenge';

interface ChallengesData {
  date: string;
  challenges: IChallenge[];
  allCompleted: boolean;
}

function ProgressBar({ current, target, reduced }: { current: number; target: number; reduced: boolean }) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div
      className="h-1 rounded-full bg-muted/30 overflow-hidden mt-1.5"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={target}
    >
      <motion.div
        className="h-full rounded-full bg-accent"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="bg-card-bg border border-border rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-secondary/20" />
        <div className="h-4 w-32 rounded bg-secondary/20" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-secondary/20" />
            <div className="flex-1 h-4 rounded bg-secondary/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DailyChallengesCard() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [data, setData] = useState<ChallengesData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    fetch('/api/challenges/today')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/challenges/today')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (mounted) setData(d); })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, []);

  // Refresh when any study activity fires
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('activity:logged', handler);
    return () => window.removeEventListener('activity:logged', handler);
  }, [load]);

  if (!data && !error) return <Skeleton />;

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          <span>Couldn&apos;t load challenges.</span>
          <button
            onClick={load}
            className="text-accent hover:underline cursor-pointer min-h-[44px] px-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { challenges, allCompleted } = data!;

  if (challenges.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-5 flex items-center justify-center min-h-[120px]">
        <p className="text-sm text-muted-foreground">No challenges today.</p>
      </div>
    );
  }

  const completedCount = challenges.filter((c) => c.done).length;

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-card-bg border border-border rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-accent" aria-hidden="true" />
          </div>
          <span className="font-semibold text-foreground">Daily Challenges</span>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            allCompleted
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted/20 text-muted-foreground'
          }`}
          aria-label={`${completedCount} of ${challenges.length} completed`}
        >
          {completedCount}/{challenges.length}
        </span>
      </div>

      {/* All complete banner */}
      {allCompleted && (
        <div
          role="status"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 mb-3"
        >
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            All done — streak shield charging!
          </span>
        </div>
      )}

      {/* Challenge list (read-only status indicators, not interactive) */}
      <ul className="space-y-3" aria-label="Daily challenges">
        {challenges.map((challenge) => (
          <li key={challenge.type} className="flex items-start gap-3 select-none">
            <div className="mt-0.5 shrink-0">
              {challenge.done ? (
                <CheckCircle2
                  className="w-5 h-5 text-green-500"
                  aria-label="Completed"
                />
              ) : (
                <Circle
                  className="w-5 h-5 text-muted-foreground/40"
                  aria-label="Incomplete"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm font-medium ${
                  challenge.done ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}
                aria-label={`${challenge.label} — ${challenge.done ? 'done' : `${challenge.current} of ${challenge.target}`}`}
              >
                {challenge.label}
              </div>
              {!challenge.done && challenge.target > 1 && (
                <div className="text-xs text-muted-foreground mt-0.5" aria-hidden="true">
                  {challenge.current}/{challenge.target}
                  <ProgressBar
                    current={challenge.current}
                    target={challenge.target}
                    reduced={shouldReduceMotion ?? false}
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
