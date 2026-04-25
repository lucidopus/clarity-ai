'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { CLARITY_MODE } from '@/lib/limits';

interface EchoAnswerOverlayProps {
  open: boolean;
  echo: { id: string; question: string } | null;
  onClose: () => void;
  /** Fires AFTER the exit animation completes, so callers can sequence a
   *  follow-up surface (e.g. the Clarity Mode entry flash) without a
   *  frame-racy setTimeout. */
  onExited?: () => void;
}

const MAX = CLARITY_MODE.echo.maxAnswerChars;
const CONFIDENCE: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
const CONFIDENCE_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'guessing',
  2: 'unsure',
  3: 'rough idea',
  4: 'fairly sure',
  5: 'certain',
};

/**
 * "Take a shot" overlay shown at next windowStart if a pending Echo exists.
 * Gates the entry flash — `FocusModeShell` suppresses its toast while this
 * is open so the moments don't collide.
 */
export default function EchoAnswerOverlay({ open, echo, onClose, onExited }: EchoAnswerOverlayProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [answer, setAnswer] = useState('');
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    const focusT = setTimeout(() => textareaRef.current?.focus(), 60);

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

  const trimmed = answer.trim();
  const disabled = submitting || !echo || trimmed.length === 0 || confidence == null || trimmed.length > MAX;

  async function handleSubmit() {
    if (!echo || confidence == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          echoId: echo.id,
          action: 'submit',
          attemptedAnswer: trimmed,
          selfConfidence: confidence,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Could not log your answer.');
        return;
      }
      onClose();
    } catch {
      setError('Could not log your answer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    if (!echo) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ echoId: echo.id, action: 'skip' }),
      });
    } catch {
      // Non-fatal; we still close.
    } finally {
      setSubmitting(false);
      onClose();
    }
  }

  return (
    <AnimatePresence onExitComplete={onExited}>
      {open && echo && (
        <motion.div
          key="echo-answer"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="echo-answer-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-62"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-black/55 backdrop-blur-[28px]" />
          <div aria-hidden="true" className="echo-answer-halo" />
          <div className="relative h-full w-full overflow-y-auto">
            <div className="flex min-h-full flex-col items-center justify-center gap-7 px-6 py-14 sm:gap-9">
              <div className="flex items-center gap-2.5">
                <Brain aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                  Recall · yesterday
                </span>
              </div>

              <div className="max-w-xl text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  Yesterday you asked yourself this — take a shot
                </p>
                <h2
                  id="echo-answer-title"
                  className="mt-3 text-2xl font-medium leading-snug text-white sm:text-3xl"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  {echo.question}
                </h2>
              </div>

              <div className="w-full max-w-xl">
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={MAX}
                  placeholder="Take a shot — even a rough answer counts."
                  aria-label="Your answer"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-base text-white placeholder:text-white/30 backdrop-blur-md transition-colors focus:border-white/30 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <div className="mt-2 text-xs tabular-nums text-white/40">
                  {trimmed.length} / {MAX}
                </div>
              </div>

              <div className="w-full max-w-xl">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  How sure are you?
                </div>
                <div role="radiogroup" aria-label="Self confidence" className="flex gap-2">
                  {CONFIDENCE.map((n) => {
                    const active = confidence === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`${n} out of 5 — ${CONFIDENCE_LABEL[n]}`}
                        onClick={() => setConfidence(n)}
                        className={`flex-1 cursor-pointer rounded-xl border py-3 text-sm font-medium transition-colors backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                          active
                            ? 'border-white/40 bg-white/15 text-white'
                            : 'border-white/15 bg-white/5 text-white/60 hover:border-white/25 hover:text-white/90'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/35">
                  <span>1 — guessing</span>
                  <span>5 — certain</span>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-xs text-red-300">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm text-white/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={disabled}
                  className="cursor-pointer rounded-full border border-white/30 bg-white/15 px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Logging…' : 'Submit'}
                </button>
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30">
                Press Esc to skip
              </p>
            </div>
          </div>

          <style jsx>{`
            .echo-answer-halo {
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
              animation: ${reduceMotion ? 'none' : 'echo-answer-halo-breathe 8s ease-in-out infinite'};
            }
            @keyframes echo-answer-halo-breathe {
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
