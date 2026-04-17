'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Shield, Sparkles } from 'lucide-react';
import Button from './Button';

interface FreshmanBufferModalProps {
  onClose: () => void;
}

/**
 * One-time modal that names and justifies the signup shield.
 *
 * Research: the endowed-progress effect (Nunes & Drèze) only fires when the
 * head-start is named and reasoned about. A silent +1 shield wastes the effect.
 * Shown once per user (localStorage-gated) on their first dashboard visit.
 */
export default function FreshmanBufferModal({ onClose }: FreshmanBufferModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = 'freshman-buffer-title';

  useEffect(() => {
    dialogRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-card-bg border border-border rounded-2xl p-7 max-w-md w-full shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="relative inline-flex items-center justify-center shrink-0" aria-hidden="true">
            <div className="absolute inset-0 rounded-xl bg-accent/15 blur-lg" />
            <div className="relative w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-accent fill-accent/20" />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-accent mb-1">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              Welcome gift
            </div>
            <h2 id={titleId} className="text-xl font-bold text-foreground leading-tight">
              You start with 1 Streak Shield
            </h2>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Most people who try a learning app stop in the first week. One missed day shouldn&apos;t
          end everything you&apos;ve built — so we&apos;ve given you a safety net to start.
        </p>

        <div className="rounded-xl border border-border bg-background px-4 py-3 mb-5">
          <div className="text-sm font-semibold text-foreground mb-1.5">How shields work</div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-accent shrink-0">•</span>
              If you miss a day, one shield is spent automatically — your streak survives.
            </li>
            <li className="flex gap-2">
              <span className="text-accent shrink-0">•</span>
              Earn more: every 7-day streak, and any day you finish all three challenges.
            </li>
            <li className="flex gap-2">
              <span className="text-accent shrink-0">•</span>
              You can hold up to 3 at a time.
            </li>
          </ul>
        </div>

        <Button variant="primary" onClick={onClose} className="w-full">
          Got it — let&apos;s learn
        </Button>
      </motion.div>
    </div>
  );
}
