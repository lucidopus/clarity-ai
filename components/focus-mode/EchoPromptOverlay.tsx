'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Brain, X } from 'lucide-react';
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

  // Escape-to-close + focus-trap + initial-focus when the modal opens.
  // Keeps keyboard users inside the dialog until they explicitly save or skip.
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    // Give the textarea initial focus after the enter animation settles.
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
        <>
          <motion.div
            key="echo-prompt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            key="echo-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="echo-prompt-title"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(32rem,calc(100vw-2rem))] max-h-[90dvh] overflow-y-auto rounded-2xl border border-border bg-card-bg shadow-2xl"
          >
            <div className="relative px-5 pt-5 pb-5 sm:px-7 sm:pt-7 sm:pb-6">
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss"
                className="absolute top-3.5 right-3.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-accent bg-accent/10 rounded px-2.5 py-1">
                <Brain className="h-3 w-3" aria-hidden="true" />
                Recall · 3 min left
              </div>
              <h2 id="echo-prompt-title" className="mt-3 text-xl font-semibold leading-snug text-foreground">
                What&rsquo;s one thing you want to remember tomorrow?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Write a self-quiz question about today&rsquo;s session. We&rsquo;ll surface it when your next window opens — try to answer from memory.
              </p>

              <div className="mt-5">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={MAX}
                  placeholder="e.g. What causes DNS propagation delay?"
                  aria-label="Your question"
                  className="w-full resize-none rounded-lg bg-background border border-border px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
                  rows={4}
                />
                <div
                  className={`mt-1.5 text-xs ${
                    trimmed.length > MAX - 20 ? 'text-amber-500' : 'text-muted-foreground'
                  }`}
                >
                  {trimmed.length} / {MAX}
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-2.5 text-xs text-red-400">
                  {error}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-2 py-1.5"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={disabled}
                  className="inline-flex items-center rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white hover:brightness-110 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
