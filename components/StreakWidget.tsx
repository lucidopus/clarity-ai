'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Flame, Shield, AlertCircle, Info, TrendingUp, Check, Sparkles, Clock } from 'lucide-react';
import MilestoneCelebration from './MilestoneCelebration';
import Toast, { ToastType } from './Toast';

type DayTier = 'empty' | 'gray' | 'orange' | 'gold';

interface ShieldEvent {
  type: 'earned' | 'consumed';
  at: string;
}

interface StudyContract {
  windowStart: string;
  windowEnd: string;
  timezone: string;
  contractedAt: string;
}

interface StreakData {
  studyStreak: number;
  longestStudyStreak: number;
  streakShields: number;
  milestones: number[];
  lastStudyDate: string | null;
  todayQualifies: boolean;
  todayTier?: DayTier;
  isRecoveryActive?: boolean;
  recoveryDeadline?: string | null;
  lastShieldEvent?: ShieldEvent | null;
  studyContract?: StudyContract | null;
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

const SHIELD_EVENT_KEY = 'clarity_last_shield_event_seen';

function formatTimeLeft(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'expiring';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

// Milestones follow the Lally-2010 habit-automaticity curve (66d = median habit
// time-to-automaticity). 7/21/66/180/365 replaces the old 7/30/100/365.
const MILESTONES = [7, 21, 66, 180, 365] as const;

const MILESTONE_LABEL: Record<number, string> = {
  7: '1 week',
  21: '3 weeks',
  66: '66 days',
  180: '6 months',
  365: '1 year',
};

const NEXT_MILESTONE = (streak: number): number | null =>
  MILESTONES.find((m) => m > streak) ?? null;

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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-secondary/20" />
          <div className="h-4 w-24 rounded bg-secondary/20" />
        </div>
        <div className="h-6 w-16 rounded-full bg-secondary/20" />
      </div>
      <div className="h-16 rounded-xl bg-secondary/20 mb-5" />
      <div className="h-2 rounded-full bg-secondary/20" />
    </div>
  );
}

export default function StreakWidget() {
  const shouldReduceMotion = useReducedMotion();
  const [data, setData] = useState<StreakData | null>(null);
  const [error, setError] = useState(false);
  const [celebrationMilestone, setCelebrationMilestone] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Only toast on events that happen *after* the component mounts, not stale ones from page refresh.
  const initialLoadRef = useRef(true);
  // Tap-to-open for the shield info tooltip (touch devices have no hover).
  const [shieldTooltipOpen, setShieldTooltipOpen] = useState(false);
  const shieldClusterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shieldTooltipOpen) return;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (shieldClusterRef.current && !shieldClusterRef.current.contains(e.target as Node)) {
        setShieldTooltipOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShieldTooltipOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [shieldTooltipOpen]);

  const pushToast = useCallback((message: string, type: ToastType) => {
    const id = `shield-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((t) => [...t, { id, message, type }]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const processData = useCallback((d: StreakData) => {
    setData(d);
    const celebrated = getStoredCelebrated();
    const newMilestone = d.milestones.find((m) => !celebrated.includes(m));
    if (newMilestone) setCelebrationMilestone(newMilestone);

    const isInitial = initialLoadRef.current;
    initialLoadRef.current = false;

    // Shield-event toasts: compare the server's lastShieldEvent.at against what we've seen.
    if (d.lastShieldEvent?.at) {
      const seenAt = localStorage.getItem(SHIELD_EVENT_KEY);
      const eventAt = d.lastShieldEvent.at;
      const isNewEvent = !seenAt || eventAt > seenAt;

      // On first load, silently seed the key so we don't toast stale events on refresh.
      if (isInitial || isNewEvent) {
        localStorage.setItem(SHIELD_EVENT_KEY, eventAt);
      }

      if (isNewEvent && !isInitial) {
        if (d.lastShieldEvent.type === 'earned') {
          pushToast(
            d.streakShields >= 3
              ? 'Shield earned — max protection (3/3).'
              : `Shield earned — ${d.streakShields}/3. We'll save your streak if you miss a day.`,
            'success',
          );
        } else {
          // 'info' (blue), not 'warning' (amber): the system successfully protected
          // the user — they didn't do anything wrong. Amber would wrongly prime anxiety.
          pushToast(
            `Shield used — streak saved! ${d.streakShields} shield${d.streakShields === 1 ? '' : 's'} remaining.`,
            'info',
          );
        }
      }
    }
  }, [pushToast]);

  const load = useCallback(() => {
    setError(false);
    fetch('/api/streaks')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(processData)
      .catch(() => setError(true));
  }, [processData]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/streaks')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: StreakData) => { if (mounted) processData(d); })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, [processData]);

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

  const { studyStreak, longestStudyStreak, streakShields, todayQualifies, todayTier, isRecoveryActive, recoveryDeadline, studyContract } = data!;
  const nextMilestone = NEXT_MILESTONE(studyStreak);
  const daysToNext = nextMilestone ? nextMilestone - studyStreak : 0;

  // Segmented journey bar: 0→7, 7→30, 30→100, 100→365. Each segment fills independently
  // as the streak grows. Replaces the old "progress bar + milestone rail" duo.
  const JOURNEY_BOUNDS = [0, ...MILESTONES] as const;
  const journeySegments = JOURNEY_BOUNDS.slice(0, -1).map((start, i) => {
    const end = JOURNEY_BOUNDS[i + 1];
    const fillPct =
      studyStreak >= end ? 100 : studyStreak > start ? ((studyStreak - start) / (end - start)) * 100 : 0;
    const achieved = studyStreak >= end;
    const current = !achieved && studyStreak >= start;
    return { start, end, fillPct, achieved, current, label: MILESTONE_LABEL[end] };
  });

  return (
    <>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-card-bg border border-border rounded-2xl p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-500/20 dark:to-amber-500/20 ring-1 ring-orange-200/60 dark:ring-orange-500/20 flex items-center justify-center">
              <Flame
                className="w-4 h-4 text-orange-500 animate-flame-flicker"
                fill="currentColor"
                aria-hidden="true"
              />
            </div>
            <span className="font-semibold text-foreground">Study Streak</span>
          </div>
          {longestStudyStreak > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-background border border-border px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" aria-hidden="true" />
              Best {longestStudyStreak}d
            </span>
          )}
        </div>

        {isRecoveryActive && recoveryDeadline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300/60 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs"
            role="status"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <div className="font-medium text-amber-800 dark:text-amber-300">Recovery in progress</div>
              <div className="text-amber-700/90 dark:text-amber-400/80">
                Review 10 cards or complete 2 quizzes to save your streak — {formatTimeLeft(recoveryDeadline)}
              </div>
            </div>
          </motion.div>
        )}

        {/* Hero: streak count + shields */}
        <div className="relative mb-5">
          <div className="relative flex items-end justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[56px] leading-none font-bold text-foreground tabular-nums tracking-tight"
                  aria-label={`${studyStreak} day study streak`}
                >
                  {studyStreak}
                </span>
                <span className="text-sm text-muted-foreground pb-1.5">
                  {studyStreak === 1 ? 'day streak' : 'days streak'}
                </span>
              </div>
              {todayQualifies && !isRecoveryActive && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {/* Tier badge — cyan tonal with gold peak mirrors the
                      heatmap (cyan-light → cyan-dark → amber) so same color
                      means same tier across the dashboard. Gold stays a
                      distinct warm hue so peak days read as "different class"
                      at a glance, not just "darker cyan". */}
                  {todayTier === 'gold' ? (
                    <div
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-400/70 dark:border-amber-500/40"
                      aria-label="Gold day — flashcards cleared, challenges done, and inside your Clarity Mode"
                    >
                      <Sparkles className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
                      Gold day
                    </div>
                  ) : todayTier === 'orange' ? (
                    <div
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border border-cyan-400/60 dark:border-cyan-500/40"
                      aria-label="Flashcards cleared today"
                    >
                      <Check className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
                      Flashcards cleared
                    </div>
                  ) : (
                    <div
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-200/70 dark:border-cyan-500/20"
                      aria-label="Studied today"
                    >
                      <Check className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
                      Studied today
                    </div>
                  )}
                  {studyContract && (
                    <div
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-background text-muted-foreground border border-border"
                      aria-label={`Clarity Mode ${studyContract.windowStart}–${studyContract.windowEnd}`}
                      title="Your Clarity Mode hours. Activity inside them earns the Gold tier."
                    >
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {studyContract.windowStart}–{studyContract.windowEnd}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shield cluster — click the "N / 3 shields (i)" button to toggle info */}
            <div
              ref={shieldClusterRef}
              className="shrink-0 flex flex-col items-end gap-1.5 relative"
              aria-label={`${streakShields} of 3 shields available`}
            >
              <div className="flex items-center gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => {
                  const earned = i < streakShields;
                  return (
                    <Shield
                      key={i}
                      className={
                        earned
                          ? 'w-5 h-5 text-accent fill-accent/15'
                          : 'w-5 h-5 text-muted-foreground/25'
                      }
                      style={earned ? { filter: 'drop-shadow(0 0 3px rgba(6,182,212,0.35))' } : undefined}
                    />
                  );
                })}
              </div>
              <button
                type="button"
                aria-describedby="shield-info-tooltip"
                aria-expanded={shieldTooltipOpen}
                onClick={() => setShieldTooltipOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer min-h-[32px] -my-1 py-1"
              >
                <span className="tabular-nums">
                  {streakShields} / 3 shield{streakShields === 1 ? '' : 's'}
                </span>
                <Info className="w-3 h-3 opacity-60" aria-hidden="true" />
              </button>
              {/* Floating tooltip — click-toggled, no hover. Outside-click and
                  Escape close it (wired in the useEffect above). */}
              <div
                id="shield-info-tooltip"
                role="tooltip"
                className={`absolute top-full right-0 mt-2 w-72 z-20 rounded-xl border border-border bg-background shadow-lg p-3 text-xs leading-relaxed text-muted-foreground transition-all duration-200 ${
                  shieldTooltipOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-1 pointer-events-none'
                }`}
              >
                <div className="flex items-start gap-2 pb-2 mb-2 border-b border-border">
                  <Shield className="w-4 h-4 text-accent fill-accent/15 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="font-semibold text-foreground">Shields protect your streak</div>
                    <div className="mt-0.5">If you miss a day, one shield is spent automatically to keep your streak alive.</div>
                  </div>
                </div>
                <div className="font-semibold text-foreground mb-1">How to earn them</div>
                <ul className="space-y-1">
                  <li className="flex gap-1.5"><span className="text-orange-500 shrink-0">•</span> Every 7-day streak — 1 shield</li>
                  <li className="flex gap-1.5"><span className="text-orange-500 shrink-0">•</span> Finish today&apos;s challenges — 1 bonus shield</li>
                  <li className="flex gap-1.5"><span className="text-orange-500 shrink-0">•</span> Stack up to 3</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone progress */}
        {nextMilestone ? (
          <div>
            <div className="flex items-end justify-between text-xs mb-2">
              <div>
                <div className="text-muted-foreground">Next milestone</div>
                <div className="font-semibold text-foreground mt-0.5">
                  {daysToNext} {daysToNext === 1 ? 'day' : 'days'} to {MILESTONE_LABEL[nextMilestone]}
                </div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">Progress</div>
                <div className="font-semibold text-foreground tabular-nums mt-0.5">
                  {studyStreak} / {nextMilestone}
                </div>
              </div>
            </div>
            {/* Unified multi-segment bar: each segment = one milestone phase.
                Replaces the old single bar + milestone rail combo. */}
            <div
              className="flex gap-1 h-2"
              role="progressbar"
              aria-valuenow={studyStreak}
              aria-valuemin={0}
              aria-valuemax={nextMilestone}
              aria-label={`${studyStreak} of ${nextMilestone} days to ${MILESTONE_LABEL[nextMilestone]}`}
            >
              {journeySegments.map((seg) => (
                <div
                  key={seg.end}
                  className="flex-1 rounded-full bg-muted/25 overflow-hidden"
                >
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500 origin-left ${seg.current ? 'streak-shimmer' : ''}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: seg.fillPct / 100 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: 'easeOut' }}
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
            </div>
            {/* Segment labels aligned to each segment's right edge */}
            <div className="flex mt-2 text-[10px]" aria-hidden="true">
              {journeySegments.map((seg) => (
                <div
                  key={seg.end}
                  className={`flex-1 text-right ${
                    seg.achieved
                      ? 'text-orange-600 dark:text-orange-400 font-medium'
                      : seg.current
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground opacity-70'
                  }`}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {seg.label}
                    {seg.achieved && <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-orange-200/60 dark:border-orange-500/20 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 px-3 py-2.5 text-xs font-medium text-orange-700 dark:text-orange-300">
            All milestones achieved — legendary!
          </div>
        )}
      </motion.div>

      {celebrationMilestone && (
        <MilestoneCelebration
          milestone={celebrationMilestone}
          shieldEarnedAtMilestone={celebrationMilestone % 7 === 0}
          onClose={() => {
            markCelebrated(celebrationMilestone);
            setCelebrationMilestone(null);
          }}
        />
      )}

      {/* Shield event toasts */}
      <div
        className="fixed top-4 right-4 z-100 flex flex-col gap-3 pointer-events-auto"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              id={t.id}
              message={t.message}
              type={t.type}
              onClose={closeToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
