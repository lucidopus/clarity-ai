'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Sparkles } from 'lucide-react';

interface WeeklySummary {
  kept: number;
  total: number;
  windowStart: string;
  windowEnd: string;
}

// All three card states (skeleton, empty, ratio) share this min-height so
// the Today's Focus grid doesn't shift when the fetch resolves.
const CARD_MIN_H = 'min-h-[200px]';

function Skeleton() {
  return (
    <div className={`bg-card-bg border border-border rounded-2xl p-5 animate-pulse h-full ${CARD_MIN_H}`}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-secondary/20" />
        <div className="h-4 w-32 rounded bg-secondary/20" />
      </div>
      <div className="h-12 w-32 rounded bg-secondary/20 mb-4" />
      <div className="h-2 rounded-full bg-secondary/20" />
    </div>
  );
}

/**
 * Weekly Promise summary — surfaces the "X of Y kept this week" ratio for
 * Clarity Mode's identity-trail mechanic. Read-only by design: no streak,
 * no day-by-day ticker, no shame copy. Just the running ratio.
 */
export default function ClarityModePromiseCard() {
  const reduceMotion = useReducedMotion() ?? false;
  const [data, setData] = useState<WeeklySummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/promise/weekly-summary')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: WeeklySummary) => { if (mounted) setData(d); })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, []);

  if (!data && !error) return <Skeleton />;

  if (error) {
    return (
      <div className={`bg-card-bg border border-border rounded-2xl p-5 h-full ${CARD_MIN_H}`}>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          <span>Couldn&apos;t load your promises.</span>
        </div>
      </div>
    );
  }

  const { kept, total } = data!;

  // Hide entirely until the user has at least one reviewed Promise in the
  // last 7 days. The empty / "pending only" states are zero-signal on the
  // dashboard — the user can't act on them here (review happens inside
  // Clarity Mode at next-window-open via PromiseReviewOverlay), and a
  // dashboard tile that says "you have nothing to do here" wastes the slot.
  if (total === 0) return null;

  const fillPct = (kept / total) * 100;

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`bg-card-bg border border-border rounded-2xl p-5 h-full flex flex-col ${CARD_MIN_H}`}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
        </div>
        <div>
          <span className="font-semibold text-foreground">Promises this week</span>
          <span className="block text-[11px] text-muted-foreground leading-tight">
            How you&rsquo;ve shown up — last 7 days
          </span>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span
          className="text-[40px] leading-none font-bold text-foreground tabular-nums tracking-tight"
          aria-label={`${kept} of ${total} promises kept this week`}
        >
          {kept}
        </span>
        <span className="text-sm text-muted-foreground">
          of {total} kept
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-muted/30 overflow-hidden"
        role="progressbar"
        aria-valuenow={kept}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${kept} of ${total} promises kept`}
      >
        <motion.div
          className="h-full rounded-full bg-accent origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: fillPct / 100 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: 'easeOut' }}
          style={{ width: '100%' }}
        />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
        Self-reported. Private to you — never used for streaks.
      </p>
    </motion.div>
  );
}
