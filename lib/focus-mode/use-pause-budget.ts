'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pause Budget client hook. Owns the user-facing pause state and keeps it
 * anchored to the server. On mount (and on visibility return) we GET the
 * authoritative snapshot from `/api/clarity-mode/pause/start` so a mid-
 * pause refresh or a long-backgrounded tab never silently over-bills.
 *
 * The countup derives from a ref-held `anchorStartMs` so we don't re-render
 * the whole tree every tick of the second-precision timer. We still keep a
 * `displaySeconds` state so consumers can render the counter.
 */

interface PauseState {
  pauseStartedAt: string | null;
  pauseSecondsUsed: number;
  pauseMinutesBudgeted: number;
  pauseCount: number;
  inWindow?: boolean;
}

export interface UsePauseBudget {
  /** True while a pause is in flight (client-visible). */
  pauseActive: boolean;
  /** Budget size in minutes, captured at first pause. */
  pauseMinutesBudgeted: number;
  /** Authoritative seconds-used from the last server response. */
  pauseSecondsUsed: number;
  /** Live extension counting the current in-flight pause (rAF-driven). */
  liveInflightSec: number;
  /** Seconds remaining in the budget (>=0). */
  pauseSecondsRemaining: number;
  /** True when the budget is fully spent (no further pauses allowed). */
  budgetExhausted: boolean;
  /** Pause count for the day (informational, not load-bearing). */
  pauseCount: number;
  /** True while a /start or /resume request is in flight. */
  pending: boolean;
  /** Last error message (for UX surfacing), or null. */
  error: string | null;
  startPause: () => Promise<void>;
  resumePause: () => Promise<void>;
}

const INITIAL: PauseState = {
  pauseStartedAt: null,
  pauseSecondsUsed: 0,
  pauseMinutesBudgeted: 0,
  pauseCount: 0,
  inWindow: false,
};

export function usePauseBudget(enabled: boolean): UsePauseBudget {
  const [state, setState] = useState<PauseState>(INITIAL);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveInflightSec, setLiveInflightSec] = useState(0);
  const anchorStartMsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const hydrate = useCallback(async () => {
    try {
      const res = await fetch('/api/clarity-mode/pause/start', { method: 'GET' });
      if (!res.ok) return;
      const data = (await res.json()) as PauseState;
      setState(data);
    } catch {
      // Non-fatal — we stay in the last-known-good state.
    }
  }, []);

  // Initial hydration + refresh on visibility/focus. Only runs when the
  // feature is enabled (i.e., user is in-window) to avoid a GET every mount.
  useEffect(() => {
    if (!enabled) {
      setState(INITIAL);
      anchorStartMsRef.current = null;
      setLiveInflightSec(0);
      return;
    }
    hydrate();
    const onVis = () => {
      if (document.visibilityState === 'visible') hydrate();
    };
    const onFocus = () => hydrate();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, hydrate]);

  // Anchor the rAF counter to the server's `pauseStartedAt`. If it's null,
  // stop the ticker entirely.
  useEffect(() => {
    if (state.pauseStartedAt) {
      anchorStartMsRef.current = new Date(state.pauseStartedAt).getTime();
    } else {
      anchorStartMsRef.current = null;
      setLiveInflightSec(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const budgetSec = state.pauseMinutesBudgeted * 60;
    const remaining = Math.max(0, budgetSec - state.pauseSecondsUsed);

    const tick = () => {
      if (anchorStartMsRef.current == null) return;
      const elapsed = Math.max(0, Math.round((Date.now() - anchorStartMsRef.current) / 1000));
      setLiveInflightSec(Math.min(elapsed, remaining));
      // Second-precision is plenty — keep the rAF loop but schedule sparsely.
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [state.pauseStartedAt, state.pauseMinutesBudgeted, state.pauseSecondsUsed]);

  const startPause = useCallback(async () => {
    if (!enabled) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/clarity-mode/pause/start', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Could not start pause');
        await hydrate();
        return;
      }
      setState((prev) => ({
        pauseStartedAt: data.pauseStartedAt,
        pauseSecondsUsed: data.pauseSecondsUsed ?? prev.pauseSecondsUsed,
        pauseMinutesBudgeted: data.pauseMinutesBudgeted ?? prev.pauseMinutesBudgeted,
        pauseCount: data.pauseCount ?? prev.pauseCount,
        inWindow: true,
      }));
    } catch {
      setError('Could not start pause');
    } finally {
      setPending(false);
    }
  }, [enabled, hydrate]);

  const resumePause = useCallback(async () => {
    if (!enabled) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/clarity-mode/pause/resume', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Could not resume');
        await hydrate();
        return;
      }
      setState((prev) => ({
        pauseStartedAt: null,
        pauseSecondsUsed: data.pauseSecondsUsed ?? prev.pauseSecondsUsed,
        pauseMinutesBudgeted: data.pauseMinutesBudgeted ?? prev.pauseMinutesBudgeted,
        pauseCount: data.pauseCount ?? prev.pauseCount,
        inWindow: prev.inWindow,
      }));
    } catch {
      setError('Could not resume');
    } finally {
      setPending(false);
    }
  }, [enabled, hydrate]);

  // Auto-resume when the budget is about to blow through. We trigger once
  // the live in-flight counter meets the remaining-seconds figure so a
  // wake-from-sleep doesn't silently over-bill.
  useEffect(() => {
    if (!state.pauseStartedAt) return;
    const budgetSec = state.pauseMinutesBudgeted * 60;
    const remaining = Math.max(0, budgetSec - state.pauseSecondsUsed);
    if (liveInflightSec >= remaining && remaining >= 0) {
      // Debounce to the next tick so we don't fire mid-render.
      const t = setTimeout(() => {
        resumePause();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [liveInflightSec, state.pauseStartedAt, state.pauseMinutesBudgeted, state.pauseSecondsUsed, resumePause]);

  const budgetSec = state.pauseMinutesBudgeted * 60;
  const totalUsedSec = state.pauseSecondsUsed + (state.pauseStartedAt ? liveInflightSec : 0);
  const pauseSecondsRemaining = Math.max(0, budgetSec - totalUsedSec);
  const budgetExhausted = state.pauseMinutesBudgeted > 0 && pauseSecondsRemaining <= 0;

  return {
    pauseActive: !!state.pauseStartedAt,
    pauseMinutesBudgeted: state.pauseMinutesBudgeted,
    pauseSecondsUsed: state.pauseSecondsUsed,
    liveInflightSec,
    pauseSecondsRemaining,
    budgetExhausted,
    pauseCount: state.pauseCount,
    pending,
    error,
    startPause,
    resumePause,
  };
}
