'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Target } from 'lucide-react';

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
        <motion.div
          key="promise-review"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="promise-review-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-62"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-black/55 backdrop-blur-[28px]" />
          <div aria-hidden="true" className="promise-review-halo" />
          <div className="relative h-full w-full overflow-y-auto">
            <div className="flex min-h-full flex-col items-center justify-center gap-7 px-6 py-14 sm:gap-9">
              <div className="flex items-center gap-2.5">
                <Target aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                  Promise · yesterday
                </span>
              </div>

              <div className="max-w-xl text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  Yesterday you promised
                </p>
                <h2
                  id="promise-review-title"
                  className="mt-3 text-2xl font-medium leading-snug text-white sm:text-3xl"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  &ldquo;{promise.text}&rdquo;
                </h2>
              </div>

              <div className="w-full max-w-xl">
                <div role="radiogroup" aria-label="Outcome" className="flex flex-col gap-2 sm:flex-row sm:gap-3">
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
                        className={`min-h-12 flex-1 cursor-pointer rounded-xl border py-3.5 text-sm font-semibold transition-colors backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                          active
                            ? 'border-white/40 bg-white/15 text-white'
                            : 'border-white/15 bg-white/5 text-white/75 hover:border-white/25 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {submitting && active ? 'Saving…' : OUTCOME_LABEL[opt]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-white/45">
                  Self-reported. No streak, no count — just a note for you.
                </p>
              </div>

              {error && (
                <p role="alert" className="text-xs text-red-300">
                  {error}
                </p>
              )}

              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30">
                Press Esc to decide later
              </p>
            </div>
          </div>

          <style jsx>{`
            .promise-review-halo {
              position: absolute;
              top: 50%;
              left: 50%;
              width: 720px;
              height: 720px;
              max-width: 90vw;
              max-height: 90vh;
              transform: translate(-50%, -50%);
              pointer-events: none;
              background: radial-gradient(
                circle,
                color-mix(in srgb, var(--accent) 22%, transparent) 0%,
                color-mix(in srgb, var(--accent) 8%, transparent) 40%,
                transparent 68%
              );
              filter: blur(48px);
              opacity: 0.6;
              animation: ${reduceMotion ? 'none' : 'promise-review-halo-breathe 8s ease-in-out infinite'};
            }
            @keyframes promise-review-halo-breathe {
              0%, 100% {
                opacity: 0.5;
                transform: translate(-50%, -50%) scale(0.96);
              }
              50% {
                opacity: 0.75;
                transform: translate(-50%, -50%) scale(1.04);
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
