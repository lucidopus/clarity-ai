'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  isNowInContractWindow,
  minutesUntilWindowStart,
} from '@/lib/services/studyContract';
import { nextWindowStartUtc } from '@/lib/breathing/timing';
import { CLARITY_MODE } from '@/lib/limits';

export interface StudyContractLite {
  windowStart: string;
  windowEnd: string;
  timezone: string;
}

interface FocusModeState {
  contract: StudyContractLite | null;
  isInWindow: boolean;
  minutesRemaining: number | null;
  justEntered: boolean;
  /** True for a few seconds after the window closes — lets the shell play
   *  a dignified exit animation (Horizon Dissolve) before unmounting. */
  justExited: boolean;
  minutesUntilStart: number | null;
  isPreWindow: boolean;
  justPreEntered: boolean;
  /** Precise ms until the next window opens, or null if no contract. Derived
   *  from the same tick loop as the rest of this context — consumers should
   *  not run their own schedulers. */
  msUntilWindowStart: number | null;
  /** True when `0 < msUntilWindowStart <= 5 * 60_000` — the 5-minute warm-up
   *  zone for the pre-session breathing nudge. */
  isWarmupWindow: boolean;
  /** The UTC instant of the upcoming window start (or null). */
  nextWindowStartAt: Date | null;
  /** True once per window when we cross into the Echo T-3 zone. Flips to
   *  false after a consumer acknowledges by calling `acknowledgeEchoPrompt`.
   *  Suppressed silently if the consumer chooses not to fire (e.g. user
   *  is mid-pause). */
  echoPromptDue: boolean;
  acknowledgeEchoPrompt: () => void;
}

const defaultState: FocusModeState = {
  contract: null,
  isInWindow: false,
  minutesRemaining: null,
  justEntered: false,
  justExited: false,
  minutesUntilStart: null,
  isPreWindow: false,
  justPreEntered: false,
  msUntilWindowStart: null,
  isWarmupWindow: false,
  nextWindowStartAt: null,
  echoPromptDue: false,
  acknowledgeEchoPrompt: () => {},
};

const PRE_WINDOW_LEAD_MIN = 15;

const FocusModeContext = createContext<FocusModeState>(defaultState);

export function useFocusMode(): FocusModeState {
  return useContext(FocusModeContext);
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function currentMinutesInZone(at: Date, timezone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(at);
    let h = 0;
    let m = 0;
    for (const p of parts) {
      if (p.type === 'hour') h = Number(p.value);
      else if (p.type === 'minute') m = Number(p.value);
    }
    if (h === 24) h = 0;
    return h * 60 + m;
  } catch {
    return null;
  }
}

function computeMinutesRemaining(
  contract: StudyContractLite,
  at: Date,
): number | null {
  const end = parseHHMM(contract.windowEnd);
  const current = currentMinutesInZone(at, contract.timezone);
  if (current === null) return null;
  return Math.max(0, end - current);
}

/**
 * Loads the user's study contract once and keeps a derived `isInWindow` flag
 * in sync. Re-syncs on `visibilitychange` + `focus` so a sleeping laptop
 * doesn't leave the UI lying about state when the user wakes mid-window.
 *
 * Fires the `focus-mode:refresh` custom event from callers (e.g., settings
 * page after save/clear) to force a re-fetch without a reload.
 */
function localCalendarDayKey(at: Date, timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(at);
    let y = '', m = '', d = '';
    for (const p of parts) {
      if (p.type === 'year') y = p.value;
      else if (p.type === 'month') m = p.value;
      else if (p.type === 'day') d = p.value;
    }
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const [contract, setContract] = useState<StudyContractLite | null>(null);
  const [contractLoaded, setContractLoaded] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [justEntered, setJustEntered] = useState(false);
  const [justExited, setJustExited] = useState(false);
  const [justPreEntered, setJustPreEntered] = useState(false);
  // `prevIsInWindow` lets us detect the in→out (or out→in) flip synchronously
  // during render, so `justExited` is set in the same render that flips
  // `isInWindow` to false. If we deferred this to a useEffect we'd emit one
  // frame of `(isInWindow=false && justExited=false)`, which unmounts the
  // ambient player mid-fade and cuts the audio abruptly at window close.
  const [prevIsInWindow, setPrevIsInWindow] = useState<boolean | null>(null);
  const wasPreWindowRef = useRef(false);
  const armedRef = useRef(false);
  const [echoPromptDue, setEchoPromptDue] = useState(false);
  const echoFiredForWindowRef = useRef(false);

  const loadContract = useCallback(async () => {
    try {
      const res = await fetch('/api/streaks');
      if (!res.ok) {
        setContractLoaded(true);
        return;
      }
      const data = await res.json();
      const next = (data?.studyContract ?? null) as StudyContractLite | null;
      setContract(next && next.windowStart && next.windowEnd && next.timezone ? next : null);
    } catch {
      // Non-fatal — app works without focus mode.
    } finally {
      setContractLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  useEffect(() => {
    const handler = () => loadContract();
    window.addEventListener('focus-mode:refresh', handler);
    return () => window.removeEventListener('focus-mode:refresh', handler);
  }, [loadContract]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const interval = setInterval(tick, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const onFocus = () => tick();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const isInWindow = contract ? isNowInContractWindow(contract, now) : false;
  const minutesRemaining =
    contract && isInWindow ? computeMinutesRemaining(contract, now) : null;
  const minutesUntilStart = contract ? minutesUntilWindowStart(contract, now) : null;
  const isPreWindow =
    minutesUntilStart !== null &&
    minutesUntilStart > 0 &&
    minutesUntilStart <= PRE_WINDOW_LEAD_MIN;
  const nextWindowStartAt = contract
    ? nextWindowStartUtc(contract.windowStart, contract.timezone, now)
    : null;
  const msUntilWindowStart =
    nextWindowStartAt ? nextWindowStartAt.getTime() - now.getTime() : null;
  const isWarmupWindow =
    msUntilWindowStart !== null &&
    msUntilWindowStart > 0 &&
    msUntilWindowStart <= 5 * 60 * 1000;

  // Synchronous transition detection: set `justEntered` / `justExited` during
  // the same render that flips `isInWindow`. See `prevIsInWindow` comment.
  if (contractLoaded && prevIsInWindow !== isInWindow) {
    setPrevIsInWindow(isInWindow);
    if (prevIsInWindow === null) {
      // First measurement after contract loads — arm without firing, so
      // landing mid-window (or mid-pre-window) doesn't play the flash
      // retroactively.
      armedRef.current = true;
      wasPreWindowRef.current = isPreWindow;
    } else if (armedRef.current) {
      if (isInWindow) {
        // Window (re)opened — cancel any lingering dissolve, flash entry.
        setJustExited(false);
        setJustEntered(true);
        // Fresh window — reset the Echo prompt one-shot so the next T-3
        // transition inside this window can fire it.
        echoFiredForWindowRef.current = false;
      } else {
        // Window closed — flag dissolve in the same render so the ambient
        // player stays mounted and its wrapper fade + audio fade can run.
        setJustExited(true);
        echoFiredForWindowRef.current = false;
        setEchoPromptDue(false);
      }
    }
  }

  // Echo prompt one-shot: fire when we cross into the T-3 zone inside the
  // window. Edge-triggered via a ref so consumer re-renders can't re-fire it.
  // Consumers must call `acknowledgeEchoPrompt()` to flip the flag back to
  // false — suppressing (e.g. during a pause) is still an acknowledge.
  if (
    isInWindow &&
    minutesRemaining !== null &&
    minutesRemaining <= CLARITY_MODE.echo.promptMinutesBeforeEnd &&
    minutesRemaining > 0 &&
    !echoFiredForWindowRef.current &&
    !echoPromptDue
  ) {
    echoFiredForWindowRef.current = true;
    setEchoPromptDue(true);
  }

  // Clear `justEntered` after the entry flash finishes.
  useEffect(() => {
    if (!justEntered) return;
    const t = setTimeout(() => setJustEntered(false), 5000);
    return () => clearTimeout(t);
  }, [justEntered]);

  // Clear `justExited` after the Horizon Dissolve envelope completes.
  // 2s hold + 3s dissolve + small buffer = 5.5s. See Horizon Dissolve
  // variant in docs/mockups/focus-window-close-variants.html.
  useEffect(() => {
    if (!justExited) return;
    const t = setTimeout(() => setJustExited(false), 5500);
    return () => clearTimeout(t);
  }, [justExited]);

  // Pre-window nudge: fires once per local-calendar day when the user is
  // actively in Clarity AI and crosses into the 15-minute pre-window zone.
  // localStorage dedupe survives refresh; armedRef prevents fire on mount
  // when the user is already inside the pre-window.
  useEffect(() => {
    if (!contractLoaded || !contract) return;
    if (!armedRef.current) return;
    if (isPreWindow && !wasPreWindowRef.current) {
      wasPreWindowRef.current = true;
      const dayKey = localCalendarDayKey(now, contract.timezone);
      const storageKey = dayKey ? `focus-mode:prewindow-fired:${dayKey}` : null;
      let alreadyFired = false;
      if (storageKey) {
        try {
          alreadyFired = window.localStorage.getItem(storageKey) === '1';
        } catch {
          // storage unavailable (private mode, quota) — still fire once in-session
        }
      }
      if (!alreadyFired) {
        if (storageKey) {
          try {
            window.localStorage.setItem(storageKey, '1');
          } catch {
            // ignore
          }
        }
        setJustPreEntered(true);
        const t = setTimeout(() => setJustPreEntered(false), 10000);
        return () => clearTimeout(t);
      }
    }
    if (!isPreWindow && wasPreWindowRef.current) {
      wasPreWindowRef.current = false;
    }
  }, [isPreWindow, contractLoaded, contract, now]);

  const acknowledgeEchoPrompt = useCallback(() => {
    setEchoPromptDue(false);
  }, []);

  const value = useMemo<FocusModeState>(
    () => ({
      contract,
      isInWindow,
      minutesRemaining,
      justEntered,
      justExited,
      minutesUntilStart,
      isPreWindow,
      justPreEntered,
      msUntilWindowStart,
      isWarmupWindow,
      nextWindowStartAt,
      echoPromptDue,
      acknowledgeEchoPrompt,
    }),
    [
      contract,
      isInWindow,
      minutesRemaining,
      justEntered,
      justExited,
      minutesUntilStart,
      isPreWindow,
      justPreEntered,
      msUntilWindowStart,
      isWarmupWindow,
      nextWindowStartAt,
      echoPromptDue,
      acknowledgeEchoPrompt,
    ],
  );

  return <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>;
}
