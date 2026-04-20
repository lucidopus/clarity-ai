'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';

const ORB_SIZE = 46;

interface PauseButtonProps {
  pauseActive: boolean;
  budgetExhausted: boolean;
  pauseSecondsRemaining: number;
  pauseMinutesBudgeted: number;
  pending: boolean;
  onTogglePause: () => void;
}

function formatMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec.toString().padStart(2, '0')}s`;
}

/**
 * Dedicated pause button that lives next to the focus orb cluster. Not a
 * replacement for the existing focus orb — it sits as its own sibling so
 * the orb's settings-route click stays intact.
 *
 * States: idle (Pause icon), paused (Play icon + accent halo), disabled
 * (budget exhausted, muted color, tooltip explains).
 */
export default function PauseButton({
  pauseActive,
  budgetExhausted,
  pauseSecondsRemaining,
  pauseMinutesBudgeted,
  pending,
  onTogglePause,
}: PauseButtonProps) {
  const [hovered, setHovered] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;

  const disabled = (budgetExhausted && !pauseActive) || pending;
  const Icon = pauseActive ? Play : Pause;

  let tooltipText: string;
  if (budgetExhausted && !pauseActive) {
    tooltipText = 'Pause budget spent · 0m left';
  } else if (pauseActive) {
    tooltipText = `Paused · tap to resume (${formatMMSS(pauseSecondsRemaining)} left)`;
  } else if (pauseMinutesBudgeted > 0) {
    tooltipText = `Pause · ${formatMMSS(pauseSecondsRemaining)} budget left`;
  } else {
    tooltipText = 'Pause';
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onTogglePause}
        disabled={disabled}
        // Keep aria-label stable ("Pause") — the state flip is carried by
        // aria-pressed so screen readers don't re-announce the name each
        // click. A descriptive tooltip still appears on hover/focus for
        // sighted users and is the source of our aria-describedby.
        aria-label="Pause"
        aria-pressed={pauseActive}
        aria-describedby="pause-button-status"
        title={tooltipText}
        className={`relative inline-flex items-center justify-center rounded-full border backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          disabled
            ? 'bg-card-bg/30 border-border cursor-not-allowed'
            : pauseActive
              ? 'bg-accent/15 border-accent/50 hover:bg-accent/25 hover:border-accent/70 cursor-pointer'
              : 'bg-card-bg/60 border-border hover:bg-card-bg/90 hover:border-accent/40 cursor-pointer'
        }`}
        style={{ width: ORB_SIZE, height: ORB_SIZE }}
      >
        {pauseActive && !reduceMotion && (
          <span
            aria-hidden="true"
            className="absolute rounded-full focus-mode-halo-breathe"
            style={{
              width: ORB_SIZE - 18,
              height: ORB_SIZE - 18,
              background:
                'radial-gradient(circle, rgba(6,182,212,0.55) 0%, rgba(6,182,212,0.25) 45%, rgba(6,182,212,0) 72%)',
              animationDuration: '10s',
            }}
          />
        )}
        <Icon
          className={`relative w-4 h-4 ${
            pauseActive
              ? 'text-accent'
              : disabled
                ? 'text-foreground/35'
                : 'text-secondary'
          }`}
          aria-hidden="true"
        />
        {disabled && (
          // Explicit strikethrough so "disabled" reads at a glance on touch
          // (no hover) and in both themes. Diagonal line across the icon.
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-auto w-5 h-[2px] rotate-45 rounded-full bg-foreground/45"
            style={{ top: '50%', left: '50%', marginLeft: '-0.625rem', marginTop: '-1px' }}
          />
        )}
      </button>
      <span id="pause-button-status" className="sr-only">
        {tooltipText}
      </span>

      <AnimatePresence>
        {hovered && (
          <motion.span
            key="pause-tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-accent/25 bg-card-bg/95 backdrop-blur-md px-2.5 py-1 shadow-sm text-xs font-medium text-foreground"
          >
            <span>{tooltipText}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
