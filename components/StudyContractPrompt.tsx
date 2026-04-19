'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, CheckCircle2, X, Sparkles } from 'lucide-react';
import Button from './Button';

interface StudyContractPromptProps {
  open: boolean;
  initialWindowStart?: string;
  initialWindowEnd?: string;
  onClose: () => void;
  onSaved?: () => void;
}

function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Day-3 Cognitive Contract prompt.
 *
 * The Gollwitzer implementation-intentions research shows that pegging a goal
 * to a concrete time/place ("I will study from 8:00 to 8:30 pm") is 2–3× more
 * effective than willpower. We ask once, save the window, and use it to
 * schedule a supportive pre-window reminder + determine the Gold day tier.
 */
export default function StudyContractPrompt({
  open,
  initialWindowStart = '20:00',
  initialWindowEnd = '20:30',
  onClose,
  onSaved,
}: StudyContractPromptProps) {
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [windowStart, setWindowStart] = useState(initialWindowStart);
  const [windowEnd, setWindowEnd] = useState(initialWindowEnd);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timezone = useMemo(() => defaultTimezone(), []);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, saving]);

  if (!open) return null;

  const durationMinutes = toMinutes(windowEnd) - toMinutes(windowStart);
  const durationOk = durationMinutes >= 15 && durationMinutes <= 8 * 60;

  const handleSave = async () => {
    if (!durationOk) {
      setError('Pick a window between 15 minutes and 8 hours.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/streak-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windowStart, windowEnd, timezone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.message || 'Could not save your Clarity Mode hours. Try again.');
        setSaving(false);
        return;
      }
      onSaved?.();
      onClose();
    } catch {
      setError('Could not save your Clarity Mode hours. Try again.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={!saving ? onClose : undefined}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-contract-title"
        tabIndex={-1}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-card-bg border border-border rounded-2xl p-7 max-w-md w-full shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center" aria-hidden="true">
            <Clock className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-accent mb-1">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              Your Clarity Mode
            </div>
            <h2 id="study-contract-title" className="text-xl font-bold text-foreground leading-tight">
              When do you usually study?
            </h2>
          </div>
          {!saving && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 -mr-2 -mt-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-background"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          Picking a specific time — not &quot;later&quot; — is the single strongest move for
          building a habit. We&apos;ll send one supportive nudge 15 minutes before Clarity Mode
          opens, every day. Studying inside it earns the Gold tier. Change it anytime from Clara.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">Start</span>
            <input
              type="time"
              value={windowStart}
              onChange={(e) => setWindowStart(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent tabular-nums cursor-pointer"
              aria-label="Clarity Mode start time"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">End</span>
            <input
              type="time"
              value={windowEnd}
              onChange={(e) => setWindowEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent tabular-nums cursor-pointer"
              aria-label="Clarity Mode end time"
            />
          </label>
        </div>

        <div className="rounded-lg border border-border bg-background px-3 py-2 mb-4 text-xs text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className={`w-4 h-4 shrink-0 ${durationOk ? 'text-green-500' : 'text-muted-foreground/40'}`} aria-hidden="true" />
          <span>
            {durationOk
              ? `${durationMinutes}-minute window · ${timezone.replace('_', ' ')}`
              : 'Window must be 15 minutes to 8 hours.'}
          </span>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="flex-1">
            Maybe later
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !durationOk} className="flex-1">
            {saving ? 'Saving…' : 'Save window'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
