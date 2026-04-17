'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { useFocusMode } from '@/lib/focus-mode/FocusModeContext';
import FocusAmbientPlayer from '@/components/focus-mode/FocusAmbientPlayer';
import { useAmbientEnabled } from '@/lib/focus-mode/use-ambient-enabled';

function formatRemaining(mins: number): string {
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'a moment';
  if (totalMinutes === 1) return '1 minute';
  if (totalMinutes < 60) return `${totalMinutes} minutes`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hUnit = h === 1 ? 'hour' : 'hours';
  if (m === 0) return `${h} ${hUnit}`;
  const mUnit = m === 1 ? 'minute' : 'minutes';
  return `${h} ${hUnit} ${m} ${mUnit}`;
}

function FocusAmbient({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="focus-ambient"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.4, ease: 'easeOut' }}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[1] focus-mode-ambient"
        />
      )}
    </AnimatePresence>
  );
}

function FocusBadge({
  minutesLeft,
  windowTotalMinutes,
}: {
  minutesLeft: number;
  windowTotalMinutes: number;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const show = hovered || focused;

  // Visual: elapsed time grows as an SVG stroke arc around a breathing halo.
  // SVG's 0deg sits at 3 o'clock, so we rotate the arc element -90deg to start
  // the sweep from 12 o'clock and fill clockwise. Tooltip surfaces remaining.
  const SIZE = 46;
  const STROKE = 3.5;
  const radius = (SIZE - STROKE) / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const pctElapsed =
    windowTotalMinutes > 0
      ? Math.max(0, Math.min(1, (windowTotalMinutes - minutesLeft) / windowTotalMinutes))
      : 0;
  const dashOffset = circumference * (1 - pctElapsed);

  return (
    <div
      className="fixed bottom-6 right-6 z-40"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => router.push('/dashboard/settings')}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={`Focus window active, ${formatRemaining(
          minutesLeft,
        )} remaining. Click to edit in settings.`}
        className="relative inline-flex items-center justify-center rounded-full bg-card-bg/60 backdrop-blur-md hover:bg-card-bg/90 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
        style={{ width: SIZE, height: SIZE }}
      >
        <span
          className="absolute rounded-full focus-mode-halo-breathe"
          aria-hidden="true"
          style={{
            width: SIZE - 18,
            height: SIZE - 18,
            background:
              'radial-gradient(circle, rgba(6,182,212,0.55) 0%, rgba(6,182,212,0.25) 45%, rgba(6,182,212,0) 72%)',
          }}
        />
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          className="relative"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-accent/18"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="text-accent/85"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: 'stroke-dashoffset 800ms ease-out',
            }}
          />
        </svg>
      </button>

      <AnimatePresence>
        {show && (
          <motion.span
            key="focus-badge-tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-accent/25 bg-card-bg/95 backdrop-blur-md px-2.5 py-1 shadow-sm text-xs font-medium text-foreground"
          >
            <Clock className="w-3 h-3 text-accent/80" aria-hidden="true" />
            <span>Focus · {formatRemaining(minutesLeft)} left</span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function FocusEntryFlash({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="focus-entry-flash"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-24 right-6 z-50 px-4 py-2.5 rounded-xl border border-accent/40 bg-card-bg/95 backdrop-blur-md shadow-lg text-sm font-medium text-foreground pointer-events-none"
        >
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            Focus window active
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FocusPreWindowToast({
  windowDurationLabel,
  onDismiss,
}: {
  windowDurationLabel: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      key="focus-prewindow-toast"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-accent/40 bg-card-bg/95 backdrop-blur-md shadow-xl p-4"
    >
      <div className="flex items-start gap-3">
        <span className="relative inline-flex mt-1 h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inset-0 rounded-full bg-accent/60 focus-mode-dot-breathe" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">
            Your focus session starts in 15 minutes.
          </p>
          <p className="mt-1 text-sm font-medium text-accent leading-snug">
            You set aside {windowDurationLabel}.
          </p>
          <p className="mt-1 text-xs text-secondary leading-relaxed">
            Five minutes of showing up counts. One card, one note, or one question — any of those makes today a study day.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 -mr-1 -mt-1 p-1 rounded-md text-secondary hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

function FocusPreWindowFlash({
  show,
  windowDurationLabel,
}: {
  show: boolean;
  windowDurationLabel: string;
}) {
  // Local dismissed state lives INSIDE the inner toast — AnimatePresence
  // unmount on `show=false` discards it, so next fire starts fresh.
  return (
    <AnimatePresence>
      {show && <PreWindowMountGuard windowDurationLabel={windowDurationLabel} />}
    </AnimatePresence>
  );
}

function PreWindowMountGuard({ windowDurationLabel }: { windowDurationLabel: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <FocusPreWindowToast
      windowDurationLabel={windowDurationLabel}
      onDismiss={() => setDismissed(true)}
    />
  );
}

function useFocusTabTitle(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const prefix = '● ';
    const applyPrefix = () => {
      if (!document.title.startsWith(prefix)) {
        document.title = `${prefix}${document.title}`;
      }
    };

    applyPrefix();

    const titleEl = document.querySelector('title');
    const observer = titleEl
      ? new MutationObserver(applyPrefix)
      : null;
    if (titleEl && observer) {
      observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      if (document.title.startsWith(prefix)) {
        document.title = document.title.slice(prefix.length);
      }
    };
  }, [active]);
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function FocusBadgeDissolving() {
  const SIZE = 46;
  const STROKE = 3.5;
  const radius = (SIZE - STROKE) / 2 - 1;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="fixed bottom-6 right-6 z-40 focus-mode-horizon-dissolve pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="relative inline-flex items-center justify-center rounded-full bg-card-bg/60 backdrop-blur-md"
        style={{ width: SIZE, height: SIZE }}
      >
        <span
          className="absolute rounded-full"
          style={{
            width: SIZE - 18,
            height: SIZE - 18,
            background:
              'radial-gradient(circle, rgba(6,182,212,0.55) 0%, rgba(6,182,212,0.25) 45%, rgba(6,182,212,0) 72%)',
          }}
        />
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-accent/18"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={0}
            className="text-accent/85"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
      </div>
    </div>
  );
}

export default function FocusModeShell() {
  const {
    isInWindow,
    minutesRemaining,
    justEntered,
    justExited,
    justPreEntered,
    contract,
  } = useFocusMode();
  const reduceMotion = useReducedMotion() ?? false;
  const [ambientEnabled] = useAmbientEnabled();
  useFocusTabTitle(isInWindow);

  const windowTotalMinutes = contract
    ? Math.max(0, parseHHMM(contract.windowEnd) - parseHHMM(contract.windowStart))
    : 0;
  const windowDurationLabel = contract ? formatDuration(windowTotalMinutes) : '';

  return (
    <>
      <FocusAmbient active={isInWindow} reduceMotion={reduceMotion} />
      {isInWindow && minutesRemaining !== null && windowTotalMinutes > 0 && (
        <FocusBadge
          minutesLeft={minutesRemaining}
          windowTotalMinutes={windowTotalMinutes}
        />
      )}
      {!isInWindow && justExited && <FocusBadgeDissolving />}
      <FocusEntryFlash show={justEntered} />
      <FocusPreWindowFlash
        show={justPreEntered && !!contract}
        windowDurationLabel={windowDurationLabel}
      />
      {(isInWindow || justExited) && ambientEnabled && (
        <FocusAmbientPlayer forcePause={!isInWindow} />
      )}
    </>
  );
}
