'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Brain, X } from 'lucide-react';
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
        <>
          <motion.div
            key="echo-answer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            key="echo-answer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="echo-answer-title"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card-bg shadow-2xl overflow-hidden"
          >
            <div className="px-5 pt-5 pb-4 relative">
              <button
                type="button"
                onClick={handleSkip}
                aria-label="Skip"
                className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-accent bg-accent/10 rounded px-2.5 py-1">
                <Brain className="h-3 w-3" aria-hidden="true" />
                Recall · yesterday
              </div>
              <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Yesterday you asked yourself this — take a shot:
              </p>
              <h2 id="echo-answer-title" className="mt-1 text-[15px] font-semibold leading-snug text-foreground">
                {echo.question}
              </h2>

              <div className="mt-3">
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={MAX}
                  placeholder="Take a shot — even a rough answer counts."
                  aria-label="Your answer"
                  className="w-full resize-none rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
                  rows={4}
                />
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {trimmed.length} / {MAX}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-[11px] text-muted-foreground mb-1.5">How sure are you?</div>
                <div role="radiogroup" aria-label="Self confidence" className="flex gap-1.5">
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
                        className={`flex-1 rounded-lg py-2 text-xs font-medium border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          active
                            ? 'border-accent/60 bg-accent/10 text-accent'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground/80">
                  <span>1 — guessing</span>
                  <span>5 — certain</span>
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-2 text-[11px] text-red-400">
                  {error}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-2 py-1"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={disabled}
                  className="inline-flex items-center rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {submitting ? 'Logging…' : 'Submit'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
