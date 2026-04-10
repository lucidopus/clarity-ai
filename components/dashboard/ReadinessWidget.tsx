'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, GraduationCap, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AggregateData {
  overallScore: number;
  sources: { sourceId: string; score: number }[];
}

function scoreColor(score: number): { text: string; ring: string; badge: string } {
  if (score >= 70) return {
    text: 'text-green-600 dark:text-green-400',
    ring: 'stroke-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  if (score >= 40) return {
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'stroke-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return {
    text: 'text-red-600 dark:text-red-400',
    ring: 'stroke-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'Ready';
  if (score >= 40) return 'Getting There';
  return 'Not Ready';
}

function Skeleton() {
  return (
    <div className="bg-card-bg border border-border rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary/20" />
          <div className="h-4 w-28 rounded bg-secondary/20" />
        </div>
        <div className="h-5 w-16 rounded-full bg-secondary/20" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-secondary/20" />
        <div className="flex-1">
          <div className="h-6 w-12 rounded bg-secondary/20 mb-1" />
          <div className="h-3 w-24 rounded bg-secondary/20" />
        </div>
      </div>
    </div>
  );
}

export default function ReadinessWidget() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const router = useRouter();
  const [data, setData] = useState<AggregateData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/readiness/aggregate')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (mounted) setData(d); })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, []);

  if (!data && !error) return <Skeleton />;

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          <span>Couldn&apos;t load readiness score.</span>
        </div>
      </div>
    );
  }

  const { overallScore, sources } = data!;

  // No data yet (new user)
  if (sources.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-accent" aria-hidden="true" />
          </div>
          <span className="font-semibold text-foreground">Exam Readiness</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Process a source and take its quiz to get your readiness score.
        </p>
      </div>
    );
  }

  const colors = scoreColor(overallScore);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;
  const weakest = sources.length > 0 ? sources.reduce((a, b) => (a.score < b.score ? a : b)) : null;

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
            <GraduationCap className="w-4 h-4 text-accent" aria-hidden="true" />
          </div>
          <span className="font-semibold text-foreground">Exam Readiness</span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${colors.badge}`}>
          {scoreLabel(overallScore)}
        </span>
      </div>

      {/* Score ring + info */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="relative shrink-0"
          aria-label={`Overall exam readiness: ${overallScore} out of 100`}
        >
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle
              cx="32" cy="32" r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/30"
            />
            <motion.circle
              cx="32" cy="32" r={radius}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: 'easeOut' }}
              transform="rotate(-90 32 32)"
              className={colors.ring}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold tabular-nums ${colors.text}`}>{overallScore}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">
            Across {sources.length} {sources.length === 1 ? 'source' : 'sources'}
          </div>
          {weakest && weakest.score < overallScore && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              Weakest: score {weakest.score}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push('/dashboard/gallery')}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors text-sm text-foreground cursor-pointer"
        aria-label="View detailed readiness per source"
      >
        <span>View per-source details</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      </button>
    </motion.div>
  );
}
