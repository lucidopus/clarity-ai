'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

type ReviewOutcome = 'kept' | 'broke' | 'skipped';

interface PromiseReviewOverlayProps {
  open: boolean;
  promise: { id: string; text: string } | null;
  onClose: () => void;
  /** Fires AFTER the exit animation completes, so the shell can sequence
   *  the entry flash without a frame-racy setTimeout. */
  onExited?: () => void;
}

const OUTCOME_LABEL: Record<ReviewOutcome, string> = {
  kept: 'Kept',
  broke: 'Broke',
  skipped: 'Skipped',
};

const OUTCOME_HINT: Record<ReviewOutcome, string> = {
  kept: 'You showed up the way you said.',
  broke: 'You didn’t this time. Note it, move on.',
  skipped: 'You didn’t hold yourself to it today.',
};

/**
 * Next-window-open overlay: replays yesterday's Promise and asks the user
 * to self-report Kept / Broke / Skipped. Sequenced *after* the Echo answer
 * overlay by `FocusModeShell` — the shell opens this only when the Echo
 * chain has fully unmounted.
 */
export default function PromiseReviewOverlay({
  open,
  promise,
  onClose,
  onExited,
}: PromiseReviewOverlayProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    const focusT = setTimeout(() => firstButtonRef.current?.focus(), 60);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const enabled = Array.from(focusables).filter((n) => !n.hasAttribute('disabled'));
      if (enabled.length === 0) return;
      const first = enabled[0];
      const last = enabled[enabled.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(focusT);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  async function submitOutcome(next: ReviewOutcome) {
    if (!promise || submitting) return;
    setOutcome(next);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/promise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promiseId: promise.id, outcome: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Could not save that.');
        setOutcome(null);
        setSubmitting(false);
        return;
      }
      onClose();
    } catch {
      setError('Could not save that.');
      setOutcome(null);
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence onExitComplete={onExited}>
      {open && promise && (
        <>
          <motion.div
            key="promise-review-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            key="promise-review"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promise-review-title"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card-bg shadow-2xl overflow-hidden"
          >
            <div className="px-5 pt-5 pb-4 relative">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                disabled={submitting}
                className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase text-accent bg-accent/10 rounded px-2 py-0.5">
                Promise · yesterday
              </div>
              <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Yesterday you promised:
              </p>
              <h2
                id="promise-review-title"
                className="mt-1 text-[15px] font-semibold leading-snug text-foreground"
              >
                {promise.text}
              </h2>

              <div className="mt-4">
                <div role="radiogroup" aria-label="Outcome" className="flex gap-2">
                  {(['kept', 'broke', 'skipped'] as const).map((opt, idx) => {
                    const active = outcome === opt;
                    return (
                      <button
                        key={opt}
                        ref={idx === 0 ? firstButtonRef : undefined}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`${OUTCOME_LABEL[opt]} — ${OUTCOME_HINT[opt]}`}
                        onClick={() => submitOutcome(opt)}
                        disabled={submitting}
                        className={`flex-1 min-h-11 rounded-lg py-2 text-sm font-medium border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed ${
                          active
                            ? 'border-accent/60 bg-accent/10 text-accent'
                            : 'border-border bg-background text-foreground hover:border-accent/40 hover:bg-accent/5'
                        }`}
                      >
                        {submitting && active ? 'Saving…' : OUTCOME_LABEL[opt]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                  Self-reported. No streak, no count — just a note for you.
                </p>
              </div>

              {error && (
                <p role="alert" className="mt-3 text-[11px] text-red-400">
                  {error}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
