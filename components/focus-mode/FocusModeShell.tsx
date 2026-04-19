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

function formatHHMM12(hhmm: string | undefined): string {
  if (!hhmm) return '';
  const [hRaw, mRaw] = hhmm.split(':').map(Number);
  if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return '';
  const hr12 = hRaw === 0 ? 12 : hRaw > 12 ? hRaw - 12 : hRaw;
  const suffix = hRaw >= 12 ? 'PM' : 'AM';
  return `${hr12}:${mRaw.toString().padStart(2, '0')} ${suffix}`;
}

/**
 * Shared toast layout used by both the pre-window nudge and the entry
 * flash. Matches the notes "tag · title · meta" pattern so focus alerts
 * read as the same family of in-app notifications.
 */
function FocusToast({
  tagLabel,
  title,
  meta,
  onDismiss,
}: {
  tagLabel: string;
  title: string;
  meta?: string;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(var(--mobile-chrome-bottom)+5.5rem)] right-4 sm:bottom-24 sm:right-6 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-card-bg/95 backdrop-blur-md shadow-xl overflow-hidden"
    >
      <div className="relative flex items-stretch">
        <div
          className="w-1 shrink-0 bg-accent"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0 py-3.5 pl-4 pr-10">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-accent">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>{tagLabel}</span>
          </div>
          <p className="mt-1 text-base font-bold text-foreground leading-tight">
            {title}
          </p>
          {meta && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {meta}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
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
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => router.push('/dashboard/settings')}
        onFocus={(e) => {
          // Only show the tooltip for keyboard focus, not mouse clicks —
          // otherwise clicking the orb leaves the tooltip stuck open until
          // focus moves somewhere else.
          if (e.currentTarget.matches(':focus-visible')) setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        aria-label={`Clarity Mode active, ${formatRemaining(
          minutesLeft,
        )} remaining. Click to edit in settings.`}
        className="relative inline-flex items-center justify-center rounded-full bg-card-bg/60 backdrop-blur-md hover:bg-card-bg/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
              // minutesLeft is an integer — its prop value only changes once
              // per minute. Match the transition to that cadence so the arc
              // sweeps continuously from one tick to the next instead of
              // finishing early and freezing.
              transition: 'stroke-dashoffset 60s linear',
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

function FocusEntryFlash({
  show,
  windowDurationLabel,
  windowEndLabel,
}: {
  show: boolean;
  windowDurationLabel: string;
  windowEndLabel: string;
}) {
  const meta = windowEndLabel
    ? `${windowDurationLabel} ahead · until ${windowEndLabel}`
    : `${windowDurationLabel} ahead`;
  return (
    <AnimatePresence>
      {show && (
        <FocusToast
          key="focus-entry-flash"
          tagLabel="Clarity Mode"
          title="You’re in. Let’s study."
          meta={meta}
        />
      )}
    </AnimatePresence>
  );
}

function FocusPreWindowFlash({
  show,
  windowDurationLabel,
  windowStartLabel,
}: {
  show: boolean;
  windowDurationLabel: string;
  windowStartLabel: string;
}) {
  // Local dismissed state lives INSIDE the inner toast — AnimatePresence
  // unmount on `show=false` discards it, so next fire starts fresh.
  return (
    <AnimatePresence>
      {show && (
        <PreWindowMountGuard
          windowDurationLabel={windowDurationLabel}
          windowStartLabel={windowStartLabel}
        />
      )}
    </AnimatePresence>
  );
}

function PreWindowMountGuard({
  windowDurationLabel,
  windowStartLabel,
}: {
  windowDurationLabel: string;
  windowStartLabel: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const meta = windowStartLabel
    ? `${windowStartLabel} · ${windowDurationLabel} set aside`
    : `${windowDurationLabel} set aside`;
  return (
    <FocusToast
      tagLabel="Starting soon"
      title="Clarity Mode in 15 minutes"
      meta={meta}
      onDismiss={() => setDismissed(true)}
    />
  );
}

/**
 * Clara's chat bubble (ChatBot.tsx) is only mounted on some pages. When it's
 * absent we don't want an empty 104px reservation on the right — the focus
 * orbs should slide all the way to the bottom-right corner. We detect the
 * bubble via a data-attribute sentinel + a MutationObserver so the layout
 * updates live if Clara mounts/unmounts within the same route.
 */
function useHasChatBubble(): boolean {
  const [present, setPresent] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const check = () =>
      setPresent(!!document.querySelector('[data-chatbot-bubble]'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return present;
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
      className="relative focus-mode-horizon-dissolve pointer-events-none"
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
  const hasChatBubble = useHasChatBubble();
  useFocusTabTitle(isInWindow);

  const windowTotalMinutes = contract
    ? Math.max(0, parseHHMM(contract.windowEnd) - parseHHMM(contract.windowStart))
    : 0;
  const windowDurationLabel = contract ? formatDuration(windowTotalMinutes) : '';
  const windowStartLabel = contract ? formatHHMM12(contract.windowStart) : '';
  const windowEndLabel = contract ? formatHHMM12(contract.windowEnd) : '';

  return (
    <>
      <FocusAmbient active={isInWindow} reduceMotion={reduceMotion} />
      {(isInWindow || justExited) && (
        // Shared row so the timer orb, ambient orb, and Clara bubble can't
        // collide. When Clara is mounted, we reserve ~104px of right-edge
        // space for it (right-[6.5rem]); otherwise the orbs claim the
        // corner at right-6. Flex gap-3 keeps the focus orbs 12px apart.
        // Timer orb sits on the right so the primary focus signal is the
        // corner-most element; ambient is to its left.
        <div
          className={`fixed bottom-[calc(var(--mobile-chrome-bottom)+1rem)] ${
            hasChatBubble ? 'right-[5rem] md:right-[6.5rem]' : 'right-4 md:right-6'
          } md:bottom-6 z-40 flex items-center gap-3 transition-[right] duration-300 ease-out`}
        >
          {ambientEnabled && <FocusAmbientPlayer forcePause={!isInWindow} />}
          {isInWindow && minutesRemaining !== null && windowTotalMinutes > 0 && (
            <FocusBadge
              minutesLeft={minutesRemaining}
              windowTotalMinutes={windowTotalMinutes}
            />
          )}
          {!isInWindow && justExited && <FocusBadgeDissolving />}
        </div>
      )}
      <FocusEntryFlash
        show={justEntered}
        windowDurationLabel={windowDurationLabel}
        windowEndLabel={windowEndLabel}
      />
      <FocusPreWindowFlash
        show={justPreEntered && !!contract}
        windowDurationLabel={windowDurationLabel}
        windowStartLabel={windowStartLabel}
      />
    </>
  );
}
