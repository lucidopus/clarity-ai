'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AvgDimensions } from '@/lib/services/readinessScore';

interface AggregateData {
  overallScore: number;
  sources: { sourceId: string; score: number }[];
  avgDimensions: AvgDimensions | null;
}

// Visually distinct tiers — all accent-family, but clearly differentiated
function scoreConfig(score: number): { text: string; ring: string; badge: string; label: string; barColor: string } {
  if (score >= 70) return {
    text: 'text-accent',
    ring: 'stroke-accent',
    badge: 'bg-accent/15 text-accent',
    label: 'Crystal Clear',
    barColor: 'bg-accent',
  };
  if (score >= 40) return {
    text: 'text-accent',
    ring: 'stroke-accent',
    badge: 'bg-accent/15 text-accent',
    label: 'Gaining Clarity',
    barColor: 'bg-accent',
  };
  return {
    text: 'text-accent',
    ring: 'stroke-accent',
    badge: 'bg-accent/15 text-accent',
    label: 'Just Starting',
    barColor: 'bg-accent',
  };
}

// ── Dimension bar ─────────────────────────────────────────────────────────────

const DIMENSIONS = [
  { key: 'quiz',     label: 'Quiz Performance',   weight: 40 },
  { key: 'mastery',  label: 'Flashcard Mastery',   weight: 25 },
  { key: 'coverage', label: 'Topic Coverage',      weight: 20 },
  { key: 'trend',    label: 'Study Trend',          weight: 15 },
] as const;

function DimensionBar({
  label,
  value,
  barColor,
  reduced,
}: {
  label: string;
  value: number;
  barColor: string;
  reduced: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-foreground font-medium">{label}</span>
        <span className="font-semibold text-foreground tabular-nums">{value}%</span>
      </div>
      <div
        className="h-1.5 rounded-full bg-muted/30 overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value}%`}
      >
        <motion.div
          className={`h-full w-full rounded-full origin-left ${barColor}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: value / 100 }}
          transition={{ duration: reduced ? 0 : 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary/20" />
          <div className="h-4 w-28 rounded bg-secondary/20" />
        </div>
        <div className="h-5 w-24 rounded-full bg-secondary/20" />
      </div>
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="w-24 h-24 rounded-full bg-secondary/20" />
        </div>
        <div className="flex-1 space-y-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="flex justify-between mb-1.5">
                <div className="h-3 w-32 rounded bg-secondary/20" />
                <div className="h-3 w-12 rounded bg-secondary/20" />
              </div>
              <div className="h-1.5 rounded-full bg-secondary/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClarityScoreWidget() {
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
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          <span>Couldn&apos;t load your Clarity Score.</span>
        </div>
      </div>
    );
  }

  const { overallScore, sources, avgDimensions } = data!;

  // Empty state: no sources with any score yet
  if (sources.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
          </div>
          <span className="font-semibold text-foreground">Clarity Score</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Take quizzes and review flashcards to build your Clarity Score — it tracks quiz performance, flashcard mastery, and study consistency.
        </p>
      </div>
    );
  }

  const config = scoreConfig(overallScore);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const dims = avgDimensions ?? { quiz: 0, mastery: 0, coverage: 0, trend: 0 };

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-card-bg border border-border rounded-2xl p-5 h-full flex flex-col overflow-visible"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Clarity Score</span>
            <span className="block text-[11px] text-muted-foreground leading-tight">Averaged across all sources</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${config.badge}`}>
          {config.label}
        </span>
      </div>

      {/* Body: ring + dimension bars */}
      <div className="flex items-center gap-5">
        {/* Score ring — hover to see breakdown */}
        <div className="relative flex flex-col items-center shrink-0 group/ring">
          <div
            aria-label={`Clarity Score: ${overallScore} out of 100. ${config.label}. Hover to see how it's calculated.`}
            className="relative rounded-full cursor-default"
          >
            <svg aria-hidden="true" width="80" height="80" viewBox="0 0 80 80">
              <circle
                cx="40" cy="40" r={radius}
                fill="none" strokeWidth="7"
                className="stroke-accent/15"
              />
              <motion.circle
                cx="40" cy="40" r={radius}
                fill="none" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.9, ease: 'easeOut' }}
                transform="rotate(-90 40 40)"
                className={config.ring}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
              <span className={`text-xl font-bold tabular-nums leading-none ${config.text}`}>{overallScore}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
            </div>
          </div>

          {/* Breakdown popover — hover triggered, positioned to the right */}
          <div
            role="tooltip"
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-48 bg-card-bg border border-border rounded-xl p-3 shadow-xl z-[60] opacity-0 pointer-events-none group-hover/ring:opacity-100 group-hover/ring:pointer-events-auto transition-opacity duration-200"
          >
            <p className="text-xs font-semibold text-foreground mb-2">How it&apos;s calculated</p>
            <div className="space-y-1.5">
              {[
                { label: 'Quiz scores', weight: '40%' },
                { label: 'Flashcard mastery', weight: '25%' },
                { label: 'Topics covered', weight: '20%' },
                { label: 'Study consistency', weight: '15%' },
              ].map(({ label, weight }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{weight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dimension breakdown */}
        <div className="flex-1 space-y-2.5">
          {DIMENSIONS.map((d) => (
            <DimensionBar
              key={d.key}
              label={d.label}
              value={dims[d.key]}
              barColor={config.barColor}
              reduced={shouldReduceMotion}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Across {sources.length} {sources.length === 1 ? 'source' : 'sources'}
        </span>
        <button
          onClick={() => router.push('/dashboard/gallery')}
          className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
          aria-label="View per-source clarity scores"
        >
          View per-source details
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
