'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { CLARITY_MODE } from '@/lib/limits';

interface EchoPromptOverlayProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const MAX = CLARITY_MODE.echo.maxQuestionChars;

export default function EchoPromptOverlay({
  open,
  onClose,
  onSaved,
}: EchoPromptOverlayProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Esc to skip + focus trap + initial autofocus.
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

  const trimmed = question.trim();
  const disabled = submitting || trimmed.length === 0 || trimmed.length > MAX;

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/echo/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Could not save your question.');
        return;
      }
      onSaved();
    } catch {
      setError('Could not save your question.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="echo-prompt"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="echo-prompt-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-62"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-black/55 backdrop-blur-[28px]" />
          <div aria-hidden="true" className="echo-halo" />
          <div className="relative h-full w-full overflow-y-auto">
            <div className="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-14 sm:gap-10">
              <div className="flex items-center gap-2.5">
                <Brain aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                  Recall · 3 min left
                </span>
              </div>

              <div className="max-w-xl text-center">
                <h2
                  id="echo-prompt-title"
                  className="text-3xl font-medium leading-tight text-white sm:text-[2.5rem]"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  What&rsquo;s one thing you want to remember tomorrow?
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
                  Write a self-quiz question about today&rsquo;s session. We&rsquo;ll surface it when your next window opens — try to answer from memory.
                </p>
              </div>

              <div className="w-full max-w-xl">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={MAX}
                  placeholder="e.g. What causes DNS propagation delay?"
                  aria-label="Your question"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-base text-white placeholder:text-white/30 backdrop-blur-md transition-colors focus:border-white/30 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <div
                  className={`mt-2 text-xs tabular-nums ${
                    trimmed.length > MAX - 20 ? 'text-amber-400' : 'text-white/40'
                  }`}
                >
                  {trimmed.length} / {MAX}
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
                  onClick={onClose}
                  className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm text-white/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={disabled}
                  className="cursor-pointer rounded-full border border-white/30 bg-white/15 px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30">
                Press Esc to skip
              </p>
            </div>
          </div>

          <style jsx>{`
            .echo-halo {
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
              animation: ${reduceMotion ? 'none' : 'echo-halo-breathe 8s ease-in-out infinite'};
            }
            @keyframes echo-halo-breathe {
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
