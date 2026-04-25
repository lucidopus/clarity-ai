'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { CLARITY_MODE } from '@/lib/limits';

interface PromisePromptOverlayProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const MAX = CLARITY_MODE.promise.maxTextChars;

/**
 * Close-of-window prompt: a single-line commitment for tomorrow's window.
 * Mounted by `FocusModeShell` while `justExited` is true (during the
 * Horizon Dissolve), so the user lands here moments after the window
 * closes — but before the orb chrome unmounts.
 */
export default function PromisePromptOverlay({
  open,
  onClose,
  onSaved,
}: PromisePromptOverlayProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    const focusT = setTimeout(() => inputRef.current?.focus(), 60);

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

  const trimmed = text.trim();
  const disabled = submitting || trimmed.length === 0 || trimmed.length > MAX;

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/promise/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Could not save your promise.');
        return;
      }
      onSaved();
    } catch {
      setError('Could not save your promise.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    handleSave();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="promise-prompt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            key="promise-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promise-prompt-title"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card-bg shadow-2xl overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="px-5 pt-5 pb-4 relative">
              <button
                type="button"
                onClick={onClose}
                aria-label="Skip"
                className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase text-accent bg-accent/10 rounded px-2 py-0.5">
                Promise · tomorrow
              </div>
              <h2
                id="promise-prompt-title"
                className="mt-2 text-base font-semibold leading-snug text-foreground"
              >
                One promise for tomorrow&rsquo;s window.
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                How you&rsquo;ll show up — not what you&rsquo;ll finish. Private to you. You&rsquo;ll see it when your next window opens.
              </p>

              <div className="mt-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={MAX}
                  placeholder="One sentence."
                  aria-label="Your promise"
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
                />
                <div
                  className={`mt-1 flex items-center justify-between text-[11px] ${
                    trimmed.length > MAX - 20 ? 'text-amber-500' : 'text-muted-foreground'
                  }`}
                >
                  <span className="italic">
                    e.g. &ldquo;start with the hard thing&rdquo; · &ldquo;no phone in the first 10&rdquo;
                  </span>
                  <span className="tabular-nums shrink-0 ml-2">{trimmed.length} / {MAX}</span>
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
                  onClick={onClose}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-2 py-1"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={disabled}
                  className="inline-flex items-center rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
