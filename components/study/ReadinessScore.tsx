'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, BookOpen, Brain, TrendingUp, Target, Calendar } from 'lucide-react';
import type { Suggestion } from '@/lib/services/readinessScore';

interface ReadinessData {
  score: number;
  quizDimension: number;
  masteryDimension: number;
  coverageDimension: number;
  trendDimension: number;
  suggestions: Suggestion[];
  examDate?: string | null;
  examName?: string | null;
  daysUntilExam?: number | null;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function scoreRingColor(score: number): string {
  if (score >= 70) return '#22c55e'; // green-500
  if (score >= 40) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'Ready';
  if (score >= 40) return 'Getting There';
  return 'Not Ready';
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
      <div
        className="h-1.5 rounded-full bg-muted/30 overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

interface Props {
  sourceId: string;
  /** Refresh when this value changes (e.g. after a quiz or review) */
  refreshKey?: number;
}

export default function ReadinessScore({ sourceId, refreshKey }: Props) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!sourceId) return;
    let mounted = true;
    fetch(`/api/readiness/${sourceId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        if (mounted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [sourceId, refreshKey]);

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-20 h-20 rounded-full bg-secondary/20" />
          <div className="flex-1">
            <div className="h-5 w-32 rounded bg-secondary/20 mb-2" />
            <div className="h-4 w-20 rounded bg-secondary/20" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 rounded bg-secondary/20" />
          ))}
        </div>
      </div>
    );
  }

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

  if (!data) return null;

  const { score, quizDimension, masteryDimension, coverageDimension, trendDimension,
    suggestions, daysUntilExam, examName } = data;

  // SVG ring parameters
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const ringColor = scoreRingColor(score);

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6">
      {/* Score circle + label */}
      <div className="flex items-center gap-5 mb-6">
        <div className="relative shrink-0" aria-label={`Exam readiness: ${score} out of 100`}>
          <svg width="88" height="88" viewBox="0 0 88 88">
            {/* Track */}
            <circle
              cx="44" cy="44" r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            {/* Progress */}
            <motion.circle
              cx="44" cy="44" r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: shouldReduceMotion ? strokeDashoffset : strokeDashoffset }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: 'easeOut' }}
              transform="rotate(-90 44 44)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold tabular-nums ${scoreColor(score)}`}>{score}</span>
          </div>
        </div>

        <div>
          <div className={`text-lg font-bold ${scoreColor(score)}`}>{scoreLabel(score)}</div>
          <div className="text-sm text-muted-foreground">Exam Readiness</div>
          {daysUntilExam != null && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {examName ? `${examName}: ` : ''}
                {daysUntilExam === 0 ? 'Exam today!' : `${daysUntilExam}d until exam`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="space-y-3 mb-6">
        <DimensionBar
          label="Quiz Performance"
          value={quizDimension}
          icon={<Brain className="w-3.5 h-3.5" />}
          reduced={shouldReduceMotion}
        />
        <DimensionBar
          label="Flashcard Mastery"
          value={masteryDimension}
          icon={<BookOpen className="w-3.5 h-3.5" />}
          reduced={shouldReduceMotion}
        />
        <DimensionBar
          label="Topic Coverage"
          value={coverageDimension}
          icon={<Target className="w-3.5 h-3.5" />}
          reduced={shouldReduceMotion}
        />
        <DimensionBar
          label="Improvement Trend"
          value={trendDimension}
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          reduced={shouldReduceMotion}
        />
      </div>

      {/* Improvement suggestions */}
      {suggestions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Suggested Actions
          </div>
          <ul className="space-y-1.5">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-foreground">{s.action}</span>
                <span className="shrink-0 text-xs font-semibold text-green-600 dark:text-green-400">
                  {s.impact}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
