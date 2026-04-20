'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

function formatMMSS(seconds: number, padMinutes: boolean): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const mm = padMinutes ? m.toString().padStart(2, '0') : m.toString();
  return `${mm}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Single character "slot" in the countdown. Each slot runs its own
 * AnimatePresence keyed on the character, so only the digit that actually
 * changes animates — the stable chars (minutes tens, the colon, seconds tens
 * most of the time) stay perfectly still.
 */
function DigitSlot({
  char,
  reduceMotion,
  isColon,
}: {
  char: string;
  reduceMotion: boolean;
  isColon: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-block tabular-nums ${isColon ? 'opacity-70' : ''}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0, y: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
          className="inline-block"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

interface PauseOverlayProps {
  pauseActive: boolean;
  pauseSecondsRemaining: number;
  pauseMinutesBudgeted: number;
  onResume: () => void;
  pending: boolean;
}

const RING_SIZE = 280;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Full-screen pause overlay. Matches the pre-session breathing overlay's
 * aesthetic (dim backdrop, soft halo, white/low-contrast text) so the pause
 * feels like an intentional break, not a tooltip. The centerpiece is a large
 * draining ring whose stroke maps to remaining pause budget; the inner number
 * is the primary "how much time do I have left" signal the user asked for.
 */
export default function PauseOverlay({
  pauseActive,
  pauseSecondsRemaining,
  pauseMinutesBudgeted,
  onResume,
  pending,
}: PauseOverlayProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const totalBudgetSec = Math.max(1, pauseMinutesBudgeted * 60);
  const progress = Math.min(1, Math.max(0, pauseSecondsRemaining / totalBudgetSec));
  const dashoffset = RING_CIRCUMFERENCE * (1 - progress);
  // Pad minutes to two digits only when the budget can exceed 9 minutes, so
  // the slot count stays fixed for the whole session and no digit ever shifts
  // horizontally.
  const padMinutes = pauseMinutesBudgeted >= 10;
  const mmss = formatMMSS(pauseSecondsRemaining, padMinutes);
  const chars = mmss.split('');

  useEffect(() => {
    if (!pauseActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onResume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pauseActive, pending, onResume]);

  return (
    <AnimatePresence>
      {pauseActive && (
        <motion.div
          key="pause-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Session paused"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-62"
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[28px]" />
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-10 px-6 sm:gap-12">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full bg-accent ${
                  reduceMotion ? '' : 'pause-status-dot'
                }`}
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                Focus Mode · Paused
              </span>
            </div>

            <div
              className="relative flex items-center justify-center"
              style={{ width: RING_SIZE, height: RING_SIZE }}
            >
              {!reduceMotion && (
                <span
                  aria-hidden="true"
                  className="pause-halo-glow absolute inset-0 rounded-full"
                />
              )}
              <svg
                viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                className="absolute inset-0 -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={RING_STROKE}
                />
                {/* Continuous drain — each prop tick (1s) chains a 1s linear
                    tween so the stroke moves smoothly instead of stepping. */}
                <motion.circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  initial={false}
                  animate={{ strokeDashoffset: dashoffset }}
                  transition={{ duration: reduceMotion ? 0 : 1, ease: 'linear' }}
                />
              </svg>
              <div className="relative flex h-[96px] flex-col items-center justify-center sm:h-[112px]">
                <div
                  role="timer"
                  aria-label={`${mmss} remaining`}
                  className="flex items-center font-medium tabular-nums text-white text-6xl sm:text-7xl"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {chars.map((char, idx) => (
                    <DigitSlot
                      key={idx}
                      char={char}
                      isColon={char === ':'}
                      reduceMotion={reduceMotion}
                    />
                  ))}
                </div>
                <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  break left
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onResume}
              disabled={pending}
              className="mt-2 cursor-pointer rounded-full border border-white/20 bg-white/5 px-8 py-3 text-sm font-semibold text-white/90 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Resume session
            </button>

            <p className="absolute bottom-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30">
              Press Esc to resume
            </p>
          </div>

          <style jsx>{`
            .pause-halo-glow {
              background: radial-gradient(
                circle,
                color-mix(in srgb, var(--accent) 32%, transparent) 0%,
                color-mix(in srgb, var(--accent) 10%, transparent) 45%,
                transparent 72%
              );
              animation: pause-halo-breathe 6s ease-in-out infinite;
              filter: blur(18px);
            }
            @keyframes pause-halo-breathe {
              0%,
              100% {
                opacity: 0.55;
                transform: scale(0.96);
              }
              50% {
                opacity: 0.9;
                transform: scale(1.04);
              }
            }
            .pause-status-dot {
              animation: pause-status-dot-pulse 2.4s ease-in-out infinite;
              box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 60%, transparent);
            }
            @keyframes pause-status-dot-pulse {
              0%,
              100% {
                opacity: 0.5;
              }
              50% {
                opacity: 1;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
