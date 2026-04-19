'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Client React hook that owns the enabled-pref + per-session dismissal state
 * for the pre-session breathing warm-up. Mirrors the contract of
 * `lib/focus-mode/use-ambient-enabled.ts` so the two surfaces read/write
 * consistently and cross-tab sync works the same way.
 *
 * Storage keys (namespace `focus-mode:` to match sibling prefs):
 *   - focus-mode:breathing:enabled                    ("1"|"0", default "1")
 *   - focus-mode:breathing:dismissed:<userId>:<YYYY-MM-DD>   (presence = dismissed)
 */

const ENABLED_KEY = 'focus-mode:breathing:enabled';
const DISMISS_PREFIX = 'focus-mode:breathing:dismissed';
const ENABLED_EVENT = 'focus-mode:breathing-enabled:changed';
const DISMISS_EVENT = 'focus-mode:breathing-dismissed:changed';

function readEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(ENABLED_KEY);
    // Default to true — opt-out, not opt-in.
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

function writeEnabled(next: boolean) {
  try {
    window.localStorage.setItem(ENABLED_KEY, next ? '1' : '0');
  } catch {
    // non-fatal
  }
}

function dismissKey(userId: string | null, sessionDateKey: string): string {
  return `${DISMISS_PREFIX}:${userId ?? 'anonymous'}:${sessionDateKey}`;
}

function readDismissed(userId: string | null, sessionDateKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(dismissKey(userId, sessionDateKey)) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(userId: string | null, sessionDateKey: string) {
  try {
    window.localStorage.setItem(dismissKey(userId, sessionDateKey), '1');
  } catch {
    // non-fatal
  }
}

export interface UseBreathing {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
  isDismissedForSession: (sessionDateKey: string) => boolean;
  dismissForSession: (sessionDateKey: string) => void;
}

export function useBreathing(userId: string | null): UseBreathing {
  const [enabled, setEnabledState] = useState<boolean>(() => readEnabled());
  // `dismissTick` forces a re-render when any dismissal key changes in this
  // tab or another, so `isDismissedForSession` reads fresh storage.
  const [, setDismissTick] = useState(0);

  useEffect(() => {
    const syncEnabled = () => setEnabledState(readEnabled());
    const onStorage = (e: StorageEvent) => {
      if (e.key === ENABLED_KEY) syncEnabled();
      else if (e.key && e.key.startsWith(`${DISMISS_PREFIX}:`)) {
        setDismissTick((t) => t + 1);
      }
    };
    const bumpDismiss = () => setDismissTick((t) => t + 1);
    window.addEventListener(ENABLED_EVENT, syncEnabled);
    window.addEventListener(DISMISS_EVENT, bumpDismiss);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(ENABLED_EVENT, syncEnabled);
      window.removeEventListener(DISMISS_EVENT, bumpDismiss);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    writeEnabled(next);
    setEnabledState(next);
    window.dispatchEvent(new Event(ENABLED_EVENT));
  }, []);

  const isDismissedForSession = useCallback(
    (sessionDateKey: string) => readDismissed(userId, sessionDateKey),
    [userId],
  );

  const dismissForSession = useCallback(
    (sessionDateKey: string) => {
      writeDismissed(userId, sessionDateKey);
      setDismissTick((t) => t + 1);
      window.dispatchEvent(new Event(DISMISS_EVENT));
    },
    [userId],
  );

  return { enabled, setEnabled, isDismissedForSession, dismissForSession };
}
