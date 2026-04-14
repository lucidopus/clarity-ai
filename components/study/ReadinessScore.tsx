'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, BookOpen, Brain, TrendingUp, Target, Sparkles, Info } from 'lucide-react';
import type { Suggestion } from '@/lib/services/readinessScore';

interface ClarityScoreData {
  score: number;
  quizDimension: number;
  masteryDimension: number;
  coverageDimension: number;
  trendDimension: number;
  suggestions: Suggestion[];
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-accent';
  if (score >= 40) return 'text-amber-500';
  return 'text-slate-400 dark:text-slate-500';
}

function scoreRingColor(score: number): string {
  if (score >= 70) return 'var(--accent)';
  if (score >= 40) return '#f59e0b';
  return '#94a3b8';
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'Crystal Clear';
  if (score >= 40) return 'Gaining Clarity';
  return 'Just Starting';
}

function scoreBadge(score: number): string {
  if (score >= 70) return 'bg-accent/10 text-accent';
  if (score >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400';
}

interface DimensionBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  reduced: boolean;
}

function DimensionBar({ label, value, icon, reduced }: DimensionBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <motion.div
          className="h-full w-full rounded-full bg-accent origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: value / 100 }}
          transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

interface Props {
  sourceId: string;
  refreshKey?: number;
}

export default function ClarityScore({ sourceId, refreshKey }: Props) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [data, setData] = useState<ClarityScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!sourceId) return;
    let mounted = true;
    fetch(`/api/readiness/${sourceId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (mounted) { setData(d); setLoading(false); } })
      .catch(() => { if (mounted) { setError(true); setLoading(false); } });
    return () => { mounted = false; };
  }, [sourceId, refreshKey]);

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-20 h-20 rounded-full bg-secondary/20" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded bg-secondary/20" />
            <div className="h-4 w-20 rounded bg-secondary/20" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 rounded bg-secondary/20" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          <span>Couldn&apos;t load your Clarity Score.</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { score, quizDimension, masteryDimension, coverageDimension, trendDimension, suggestions } = data;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Clarity Score</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground leading-tight relative group/info">
              Mastery of this source
              <button
                type="button"
                className="inline-flex text-muted-foreground/70 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                aria-label="What does this score measure?"
              >
                <Info className="w-3 h-3" aria-hidden="true" />
              </button>
              <span
                role="tooltip"
                className="absolute left-0 top-full mt-1 w-56 bg-card-bg border border-border rounded-lg p-2.5 shadow-xl z-50 opacity-0 pointer-events-none group-hover/info:opacity-100 group-hover/info:pointer-events-auto transition-opacity duration-200 text-[11px] text-muted-foreground leading-snug"
              >
                Reflects how well you know this specific source. It doesn&apos;t change when your learning goals change.
              </span>
            </span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${scoreBadge(score)}`}>
          {scoreLabel(score)}
        </span>
      </div>

      {/* Score ring */}
      <div className="flex items-center gap-5 mb-6">
        <div className="relative shrink-0" aria-label={`Clarity score: ${score} out of 100`}>
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
            <motion.circle
              cx="44" cy="44" r={radius}
              fill="none"
              stroke={scoreRingColor(score)}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: 'easeOut' }}
              transform="rotate(-90 44 44)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold tabular-nums ${scoreColor(score)}`}>{score}</span>
          </div>
        </div>

        <div>
          <div className={`text-lg font-bold ${scoreColor(score)}`}>{scoreLabel(score)}</div>
          <div className="text-sm text-muted-foreground">How well you know this content</div>
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="space-y-3 mb-6">
        <DimensionBar label="Quiz Performance" value={quizDimension} icon={<Brain className="w-3.5 h-3.5" />} reduced={shouldReduceMotion} />
        <DimensionBar label="Flashcard Mastery" value={masteryDimension} icon={<BookOpen className="w-3.5 h-3.5" />} reduced={shouldReduceMotion} />
        <DimensionBar label="Topic Coverage" value={coverageDimension} icon={<Target className="w-3.5 h-3.5" />} reduced={shouldReduceMotion} />
        <DimensionBar label="Improvement Trend" value={trendDimension} icon={<TrendingUp className="w-3.5 h-3.5" />} reduced={shouldReduceMotion} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Next Steps
          </div>
          <ul className="space-y-1.5">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-foreground">{s.action}</span>
                <span className="shrink-0 text-xs font-semibold text-accent">{s.impact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
