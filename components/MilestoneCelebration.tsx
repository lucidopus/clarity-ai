'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Shield } from 'lucide-react';
import Button from './Button';

interface MilestoneCelebrationProps {
  milestone: number;
  onClose: () => void;
}

const MILESTONE_MESSAGES: Record<number, { title: string; description: string }> = {
  7: {
    title: '1 Week Strong!',
    description: "You've built a solid habit. Keep the momentum going!",
  },
  30: {
    title: '30-Day Legend!',
    description: "A whole month of consistent studying. You're unstoppable.",
  },
  100: {
    title: '100-Day Milestone!',
    description: 'Triple digits. This is mastery-level dedication.',
  },
  365: {
    title: 'One Full Year!',
    description: 'A year of learning every day. Truly extraordinary.',
  },
};

export default function MilestoneCelebration({ milestone, onClose }: MilestoneCelebrationProps) {
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId = 'milestone-celebration-title';

  const message = MILESTONE_MESSAGES[milestone] ?? {
    title: `${milestone}-Day Milestone!`,
    description: 'An incredible achievement. Keep going!',
  };

  // Save the element that had focus before opening, then focus the dialog
  useEffect(() => {
    triggerRef.current = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      (triggerRef.current as HTMLElement | null)?.focus();
    };
  }, []);

  // Escape key to dismiss
  useEffect(() => {
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
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-card-bg border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Flame icon */}
        <div className="relative inline-flex items-center justify-center mb-4" aria-hidden="true">
          <div className="absolute inset-0 rounded-full bg-orange-400/20 blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Flame className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        {/* Milestone badge */}
        <div
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-bold mb-3"
          aria-hidden="true"
        >
          <Flame className="w-3.5 h-3.5" />
          {milestone} days
        </div>

        <h2 id={titleId} className="text-2xl font-bold text-foreground mb-2">
          {message.title}
        </h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">{message.description}</p>

        {/* Shield earned notice */}
        <div className="flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 mb-6">
          <Shield className="w-4 h-4 text-accent" aria-hidden="true" />
          <span className="text-sm font-medium text-accent">+1 streak shield earned</span>
        </div>

        <Button variant="primary" onClick={onClose} className="w-full">
          Keep it going!
        </Button>
      </motion.div>
    </div>
  );
}
