'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Clock, Plus, Settings as SettingsIcon } from 'lucide-react';
import { useFocusMode, type StudyContractLite } from '@/lib/focus-mode/FocusModeContext';
import FocusAmbientPlayer from '@/components/focus-mode/FocusAmbientPlayer';
import { useAmbientEnabled } from '@/lib/focus-mode/use-ambient-enabled';
import { usePauseBudget } from '@/lib/focus-mode/use-pause-budget';
import PauseButton from '@/components/focus-mode/PauseButton';
import PauseOverlay from '@/components/focus-mode/PauseOverlay';
import EchoPromptOverlay from '@/components/focus-mode/EchoPromptOverlay';
import EchoAnswerOverlay from '@/components/focus-mode/EchoAnswerOverlay';
import { STUDY_CONTRACT } from '@/lib/limits';

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
  contract,
}: {
  minutesLeft: number;
  windowTotalMinutes: number;
  contract: StudyContractLite | null;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const show = (hovered || focused) && !popoverOpen;

  useEffect(() => {
    if (!popoverOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setPopoverOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [popoverOpen]);

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
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setPopoverOpen((v) => !v)}
        onFocus={(e) => {
          // Only show the tooltip for keyboard focus, not mouse clicks —
          // otherwise clicking the orb leaves the tooltip stuck open until
          // focus moves somewhere else.
          if (e.currentTarget.matches(':focus-visible')) setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        aria-label={`Clarity Mode active, ${formatRemaining(
          minutesLeft,
        )} remaining. Click to add time or open settings.`}
        aria-haspopup="dialog"
        aria-expanded={popoverOpen}
        className="relative inline-flex items-center justify-center rounded-full bg-card-bg/60 backdrop-blur-md hover:bg-card-bg/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ width: SIZE, height: SIZE }}
      >
        {/* Subtle "+" indicator so returning users discover the extend
            affordance. Nudged to -top-1 -right-1 + background-colored
            outline so the focus-visible ring passes visually behind the
            badge instead of clipping it. */}
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent text-background flex items-center justify-center shadow-sm ring-2 ring-background"
        >
          <Plus className="w-2.5 h-2.5" strokeWidth={3} />
        </span>
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

      <AnimatePresence>
        {popoverOpen && (
          <ExtendPopover
            key="focus-badge-popover"
            minutesLeft={minutesLeft}
            contract={contract}
            onOpenSettings={() => {
              setPopoverOpen(false);
              router.push('/dashboard/settings');
            }}
            onClose={() => setPopoverOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExtendPopover({
  minutesLeft,
  contract,
  onOpenSettings,
  onClose,
}: {
  minutesLeft: number;
  contract: StudyContractLite | null;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const used = contract?.todayExtensions?.totalMinutesAdded ?? 0;
  const usedCount = contract?.todayExtensions?.count ?? 0;
  const countRemaining = Math.max(0, STUDY_CONTRACT.extensions.maxPerDay - usedCount);
  const minutesRemaining = Math.max(0, STUDY_CONTRACT.extensions.maxMinutesPerDay - used);
  const countExhausted = countRemaining === 0;

  // Focus trap — Tab cycles among this dialog's enabled focusables and
  // Shift+Tab loops backward. Without this, Tab would leak into page
  // content behind the popover (UX review flagged; WCAG 2.4.3).
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = dialogRef.current;
    if (!root) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, []);

  const handleExtend = useCallback(async (minutes: number) => {
    if (pending !== null || countExhausted || minutes > minutesRemaining) return;
    setPending(minutes);
    setError(null);
    try {
      const res = await fetch('/api/streak-contract/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Could not add time. Try again.');
        return;
      }
      // Refresh the FocusMode context so minutesLeft reflects the new end.
      window.dispatchEvent(new Event('focus-mode:refresh'));
      onClose();
    } catch {
      setError('Could not add time. Try again.');
    } finally {
      setPending(null);
    }
  }, [pending, countExhausted, minutesRemaining, onClose]);

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-label="Extend Clarity Mode"
      aria-modal="true"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-border bg-card-bg/95 backdrop-blur-md shadow-xl overflow-hidden"
    >
      <div className="px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-accent">
          <Clock className="w-3 h-3" aria-hidden="true" />
          <span>Clarity Mode</span>
        </div>
        <p className="mt-0.5 text-sm font-medium text-foreground">
          {formatRemaining(minutesLeft)} left
        </p>
      </div>
      <div className="p-2">
        {countExhausted ? (
          <div className="px-2 py-2 space-y-1">
            <p className="text-xs text-foreground">No extensions left for this session.</p>
            <p className="text-[11px] text-muted-foreground">Resets when your next window opens.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {STUDY_CONTRACT.extensionIncrements.map((increment, idx) => {
              const wouldExceed = increment > minutesRemaining;
              const disabled = pending !== null || wouldExceed;
              return (
                <button
                  key={increment}
                  type="button"
                  autoFocus={idx === 0}
                  onClick={() => handleExtend(increment)}
                  disabled={disabled}
                  className="w-full min-h-11 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                    <span>{increment} min</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {pending === increment
                      ? 'Adding…'
                      : wouldExceed
                      ? "Over today's limit"
                      : ''}
                  </span>
                </button>
              );
            })}
            <p className="mt-1 px-3 text-[11px] text-muted-foreground">
              {countRemaining} extension{countRemaining === 1 ? '' : 's'} · {minutesRemaining} min left today
            </p>
          </div>
        )}
        {error && (
          <p className="mt-2 px-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
      <div className="border-t border-border">
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="flex items-center gap-2">
            <SettingsIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open settings</span>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </motion.div>
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
    echoPromptDue,
    acknowledgeEchoPrompt,
  } = useFocusMode();
  const reduceMotion = useReducedMotion() ?? false;
  const [ambientEnabled] = useAmbientEnabled();
  const hasChatBubble = useHasChatBubble();
  useFocusTabTitle(isInWindow);

  const pauseState = usePauseBudget(isInWindow);

  const windowTotalMinutes = contract
    ? (() => {
        const s = parseHHMM(contract.windowStart);
        const e = parseHHMM(contract.windowEnd);
        const raw = e - s;
        const base = Math.max(0, raw <= 0 ? raw + 1440 : raw);
        const extMinutes = contract.todayExtensions?.totalMinutesAdded ?? 0;
        return base + extMinutes;
      })()
    : 0;
  const windowDurationLabel = contract ? formatDuration(windowTotalMinutes) : '';
  const windowStartLabel = contract ? formatHHMM12(contract.windowStart) : '';
  const windowEndLabel = contract ? formatHHMM12(contract.windowEnd) : '';

  // Echo state machine:
  //   1. T-3 triggers `echoPromptDue` (context). If pauseActive, we suppress
  //      silently by acknowledging without opening the overlay. Otherwise we
  //      show EchoPromptOverlay modally.
  //   2. On window open, we fetch the most recent pending Echo (if any) and
  //      surface EchoAnswerOverlay. The entry-flash toast is gated on this
  //      overlay being closed so the two can't collide on one frame.
  const [echoPromptOpen, setEchoPromptOpen] = useState(false);
  const [pendingEcho, setPendingEcho] = useState<{ id: string; question: string } | null>(null);
  const [echoAnswerOpen, setEchoAnswerOpen] = useState(false);
  const [entryFlashReady, setEntryFlashReady] = useState(false);

  // Fire T-3 prompt (unless user is paused — we suppress silently).
  // We are syncing React state to an external event signal from the
  // FocusMode context, which is exactly what an effect is for here.
  useEffect(() => {
    if (!echoPromptDue) return;
    if (pauseState.pauseActive) {
      acknowledgeEchoPrompt();
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEchoPromptOpen(true);
    acknowledgeEchoPrompt();
  }, [echoPromptDue, pauseState.pauseActive, acknowledgeEchoPrompt]);

  // When a new window opens, see if there's a pending Echo to surface.
  // We start with the answer overlay hidden and the entry flash gated until
  // either the overlay closes or we confirm there is nothing pending.
  useEffect(() => {
    if (!justEntered) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntryFlashReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/echo');
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.echo) {
          setPendingEcho({ id: data.echo.id, question: data.echo.question });
          setEchoAnswerOpen(true);
        } else {
          setEntryFlashReady(true);
        }
      } catch {
        if (!cancelled) setEntryFlashReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [justEntered]);

  const handleEchoAnswerClose = useCallback(() => {
    setEchoAnswerOpen(false);
  }, []);

  // AnimatePresence's onExitComplete is the only frame-accurate signal that
  // the overlay has finished unmounting. Gate the entry flash on THAT rather
  // than a racy setTimeout — reduced-motion users also get it right.
  const handleEchoAnswerExited = useCallback(() => {
    setPendingEcho(null);
    setEntryFlashReady(true);
  }, []);

  const handleTogglePause = useCallback(() => {
    if (pauseState.pauseActive) {
      pauseState.resumePause();
    } else {
      pauseState.startPause();
    }
  }, [pauseState]);

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
          {ambientEnabled && <FocusAmbientPlayer forcePause={!isInWindow || pauseState.pauseActive} />}
          {isInWindow && (
            <div className="relative">
              <PauseButton
                pauseActive={pauseState.pauseActive}
                budgetExhausted={pauseState.budgetExhausted}
                pauseSecondsRemaining={pauseState.pauseSecondsRemaining}
                pauseMinutesBudgeted={pauseState.pauseMinutesBudgeted}
                pending={pauseState.pending}
                onTogglePause={handleTogglePause}
              />
              <PauseOverlay
                pauseActive={pauseState.pauseActive}
                pauseSecondsRemaining={pauseState.pauseSecondsRemaining}
                pauseMinutesBudgeted={pauseState.pauseMinutesBudgeted}
                onResume={pauseState.resumePause}
                pending={pauseState.pending}
              />
            </div>
          )}
          {isInWindow && minutesRemaining !== null && windowTotalMinutes > 0 && (
            <FocusBadge
              minutesLeft={minutesRemaining}
              windowTotalMinutes={windowTotalMinutes}
              contract={contract}
            />
          )}
          {!isInWindow && justExited && <FocusBadgeDissolving />}
        </div>
      )}
      <FocusEntryFlash
        show={justEntered && entryFlashReady && !echoAnswerOpen}
        windowDurationLabel={windowDurationLabel}
        windowEndLabel={windowEndLabel}
      />
      <FocusPreWindowFlash
        show={justPreEntered && !!contract}
        windowDurationLabel={windowDurationLabel}
        windowStartLabel={windowStartLabel}
      />
      <EchoPromptOverlay
        open={echoPromptOpen}
        onClose={() => setEchoPromptOpen(false)}
        onSaved={() => setEchoPromptOpen(false)}
      />
      <EchoAnswerOverlay
        open={echoAnswerOpen}
        echo={pendingEcho}
        onClose={handleEchoAnswerClose}
        onExited={handleEchoAnswerExited}
      />
    </>
  );
}
