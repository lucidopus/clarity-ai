'use client';

import { useEffect, useState } from 'react';

const LS_KEY = 'focus-mode:ambient:enabled';
const EVENT = 'focus-mode:ambient-enabled:changed';

function read(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    // Default to true — opt-out, not opt-in.
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

function write(next: boolean) {
  try {
    window.localStorage.setItem(LS_KEY, next ? '1' : '0');
  } catch {
    // non-fatal
  }
}

export function useAmbientEnabled(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabledState] = useState<boolean>(() => read());

  useEffect(() => {
    const sync = () => setEnabledState(read());
    window.addEventListener(EVENT, sync);
    // cross-tab
    window.addEventListener('storage', (e) => {
      if (e.key === LS_KEY) sync();
    });
    return () => {
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const setEnabled = (next: boolean) => {
    write(next);
    setEnabledState(next);
    window.dispatchEvent(new Event(EVENT));
  };

  return [enabled, setEnabled];
}
