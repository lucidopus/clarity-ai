'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Shield, AlertCircle } from 'lucide-react';
import MilestoneCelebration from './MilestoneCelebration';

interface StreakData {
  studyStreak: number;
  longestStudyStreak: number;
  streakShields: number;
  milestones: number[];
  lastStudyDate: string | null;
  todayQualifies: boolean;
}

const NEXT_MILESTONE = (streak: number): number | null => {
  const milestones = [7, 30, 100, 365];
  return milestones.find((m) => m > streak) ?? null;
};

const PREV_MILESTONES = [0, 7, 30, 100, 365];

const CELEBRATED_KEY = 'clarity_celebrated_milestones';

function getStoredCelebrated(): number[] {
  try {
    return JSON.parse(localStorage.getItem(CELEBRATED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function markCelebrated(milestone: number) {
  const existing = getStoredCelebrated();
  if (!existing.includes(milestone)) {
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...existing, milestone]));
  }
}

function Skeleton() {
  return (
    <div className="bg-card-bg border border-border rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary/20" />
          <div className="h-4 w-24 rounded bg-secondary/20" />
        </div>
        <div className="h-5 w-20 rounded-full bg-secondary/20" />
      </div>
      <div className="h-12 rounded-xl bg-secondary/20 mb-4" />
      <div className="h-2 rounded-full bg-secondary/20" />
    </div>
  );
}

export default function StreakWidget() {
  const shouldReduceMotion = useReducedMotion();
  const [data, setData] = useState<StreakData | null>(null);
  const [error, setError] = useState(false);
  const [celebrationMilestone, setCelebrationMilestone] = useState<number | null>(null);

  const processData = (d: StreakData) => {
    setData(d);
    const celebrated = getStoredCelebrated();
    const newMilestone = d.milestones.find((m) => !celebrated.includes(m));
    if (newMilestone) setCelebrationMilestone(newMilestone);
  };

  const load = useCallback(() => {
    setError(false);
    fetch('/api/streaks')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(processData)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/streaks')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: StreakData) => { if (mounted) processData(d); })
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
          <span>Couldn&apos;t load streak.</span>
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

  const { studyStreak, longestStudyStreak, streakShields, todayQualifies } = data!;
  const nextMilestone = NEXT_MILESTONE(studyStreak);
  const prevMilestone = [...PREV_MILESTONES].reverse().find((m) => studyStreak >= m) ?? 0;
  const milestoneProgress = nextMilestone
    ? ((studyStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100
    : 100;

  return (
    <>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-card-bg border border-border rounded-2xl p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
            </div>
            <span className="font-semibold text-foreground">Study Streak</span>
          </div>
          {longestStudyStreak > 0 && (
            <span className="text-xs text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full">
              Best: {longestStudyStreak}d
            </span>
          )}
        </div>

        {/* Streak count + shields */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <div
              className="text-4xl font-bold text-foreground tabular-nums"
              aria-label={`${studyStreak} day study streak`}
            >
              {studyStreak}
            </div>
            <div className="text-sm text-muted-foreground">
              {studyStreak === 1 ? 'day streak' : 'days streak'}
              {todayQualifies && (
                <span
                  className="ml-1.5 text-xs text-green-600 dark:text-green-400 font-medium"
                  aria-label="Counted today"
                >
                  <span aria-hidden="true">✓</span> counted today
                </span>
              )}
            </div>
          </div>

          {/* Shields */}
          <div
            className="flex flex-col items-end gap-1"
            aria-label={`${streakShields} of 3 shields available`}
          >
            <div className="flex items-center gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <Shield
                  key={i}
                  className={`w-5 h-5 ${
                    i < streakShields
                      ? 'text-accent fill-accent/20'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {streakShields} {streakShields === 1 ? 'shield' : 'shields'}
            </span>
          </div>
        </div>

        {/* Milestone progress */}
        {nextMilestone ? (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Next milestone: {nextMilestone} days</span>
              <span>{studyStreak}/{nextMilestone}</span>
            </div>
            <div
              className="h-1.5 rounded-full bg-muted/30 overflow-hidden"
              role="progressbar"
              aria-valuenow={studyStreak}
              aria-valuemin={prevMilestone}
              aria-valuemax={nextMilestone}
              aria-label={`${studyStreak} of ${nextMilestone} days to next milestone`}
            >
              <motion.div
                className="h-full rounded-full bg-orange-400"
                initial={{ width: 0 }}
                animate={{ width: `${milestoneProgress}%` }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            All milestones achieved — legendary!
          </div>
        )}
      </motion.div>

      {celebrationMilestone && (
        <MilestoneCelebration
          milestone={celebrationMilestone}
          onClose={() => {
            markCelebrated(celebrationMilestone);
            setCelebrationMilestone(null);
          }}
        />
      )}
    </>
  );
}
