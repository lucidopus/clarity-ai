'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useFocusMode } from '@/lib/focus-mode/FocusModeContext';
import { sessionInstanceKey } from '@/lib/breathing/timing';
import { useBreathing } from '@/lib/breathing/useBreathing';
import BreathingOverlay from './BreathingOverlay';

function mmss(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PreSessionNudge() {
  const { user } = useAuth();
  const {
    contract,
    isWarmupWindow,
    isInWindow,
    nextWindowStartAt,
  } = useFocusMode();
  const breathing = useBreathing(user?.id ?? null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  // 1-second local tick so the mm:ss countdown updates smoothly regardless
  // of the coarser FocusModeContext tick (30s) or tab throttling. Countdown
  // text derives from `nextWindowStartAt - nowMs` on every render, so a
  // returning tab sees a correct value immediately (via the context's
  // visibilitychange recompute), not a decrementing local counter.
  const [nowMs, setNowMs] = useState(() => Date.now());

  const sessionKey = useMemo(() => {
    if (!nextWindowStartAt || !contract) return null;
    return sessionInstanceKey(nextWindowStartAt, contract.timezone);
  }, [nextWindowStartAt, contract]);

  // The warm-up is the 5-min pre-window period itself, so the overlay picks
  // up breathing from "now" when opened mid-way. sessionStartAt is always
  // 5 minutes before windowStart.
  const sessionStartAt = useMemo(() => {
    if (!nextWindowStartAt) return null;
    return new Date(nextWindowStartAt.getTime() - 5 * 60 * 1000);
  }, [nextWindowStartAt]);

  useEffect(() => {
    if (!isWarmupWindow) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isWarmupWindow]);

  const msUntilStart = nextWindowStartAt
    ? nextWindowStartAt.getTime() - nowMs
    : null;

  const dismissed = sessionKey ? breathing.isDismissedForSession(sessionKey) : false;

  const nudgeVisible =
    !!contract &&
    breathing.enabled &&
    !isInWindow &&
    !overlayOpen &&
    !dismissed &&
    msUntilStart !== null &&
    msUntilStart > 0 &&
    msUntilStart <= 5 * 60 * 1000;

  const handleDismiss = () => {
    if (sessionKey) breathing.dismissForSession(sessionKey);
  };

  const handleStart = () => {
    setOverlayOpen(true);
  };

  const handleOverlayClose = () => {
    setOverlayOpen(false);
    if (sessionKey) breathing.dismissForSession(sessionKey);
  };

  return (
    <>
      <AnimatePresence>
        {nudgeVisible && msUntilStart !== null && (
          <motion.div
            key="pre-session-nudge"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            role="dialog"
            aria-label="Pre-session breathing warm-up"
            className="fixed right-4 bottom-[calc(var(--mobile-chrome-bottom)+11rem)] z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card-bg/95 backdrop-blur-md shadow-xl md:bottom-24 md:right-6"
          >
            <div className="relative flex items-stretch">
              <div className="w-1 shrink-0 bg-accent" aria-hidden="true" />
              <div className="min-w-0 flex-1 py-3.5 pl-4 pr-10">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  <span>Starting soon</span>
                </div>
                <p className="mt-1 text-base font-bold leading-tight text-foreground">
                  Clarity Mode in {mmss(msUntilStart)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Settle in with a 5-min warm-up — helps you focus faster.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStart}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Start warm-up
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="shrink-0 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Not today
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="absolute right-2 top-2 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <BreathingOverlay
        open={overlayOpen}
        sessionStartAt={sessionStartAt}
        onClose={handleOverlayClose}
      />
    </>
  );
}
