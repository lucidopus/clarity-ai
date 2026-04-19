/**
 * Cognitive Contract helpers (Layer 3 of the streak system).
 *
 * A user's `studyContract` is a self-chosen daily study window anchored to an
 * IANA timezone. Activity recorded inside that window earns the Gold tier.
 * Rooted in Gollwitzer's implementation-intentions research (if-then planning).
 */

import { zonedWallClockToUtc, zonedYmd } from '@/lib/time/zone';

// Re-export so existing server callers keep working without direct import churn.
export { zonedWallClockToUtc, zonedYmd };

export interface StudyContract {
  windowStart: string;  // "HH:MM" 24h
  windowEnd: string;    // "HH:MM" 24h (may cross midnight for overnight windows)
  timezone: string;     // IANA, e.g. "America/New_York"
  contractedAt: Date;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" → minutes since local midnight, or null if malformed. */
function parseHHMM(value: string): number | null {
  const m = TIME_RE.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Validate a proposed contract. Returns an error string or null if OK. */
export function validateStudyContract(
  windowStart: string,
  windowEnd: string,
  timezone: string,
): string | null {
  const start = parseHHMM(windowStart);
  const end = parseHHMM(windowEnd);
  if (start === null) return 'Start time must be in HH:MM format (24-hour).';
  if (end === null) return 'End time must be in HH:MM format (24-hour).';
  const raw = end - start;
  const durationMinutes = raw < 0 ? raw + 1440 : raw;
  if (durationMinutes < 15) return 'Pick a window of at least 15 minutes.';
  if (durationMinutes > 8 * 60) return 'Pick a window of at most 8 hours.';
  try {
    // Throws RangeError if timezone is not a supported IANA identifier.
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    return 'Pick a valid timezone.';
  }
  return null;
}

/** Minutes since local midnight, in the given IANA timezone, for a Date. */
function minutesInZone(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  let h = 0;
  let m = 0;
  for (const p of parts) {
    if (p.type === 'hour') h = Number(p.value);
    else if (p.type === 'minute') m = Number(p.value);
  }
  // Intl sometimes renders midnight as "24" — normalize.
  if (h === 24) h = 0;
  return h * 60 + m;
}

/** True when `at` falls inside the contract's [start, end) window in its timezone. */
export function isNowInContractWindow(
  contract: Pick<StudyContract, 'windowStart' | 'windowEnd' | 'timezone'> | null | undefined,
  at: Date = new Date(),
): boolean {
  if (!contract) return false;
  const start = parseHHMM(contract.windowStart);
  const end = parseHHMM(contract.windowEnd);
  if (start === null || end === null) return false;
  let current: number;
  try {
    current = minutesInZone(at, contract.timezone);
  } catch {
    return false;
  }
  if (end > start) return current >= start && current < end;
  // overnight window (e.g. 11:00 PM – 1:00 AM)
  return current >= start || current < end;
}

/** Minutes until the window opens (positive) or negative if past start / no contract. */
export function minutesUntilWindowStart(
  contract: Pick<StudyContract, 'windowStart' | 'windowEnd' | 'timezone'> | null | undefined,
  at: Date = new Date(),
): number | null {
  if (!contract) return null;
  const start = parseHHMM(contract.windowStart);
  if (start === null) return null;
  let current: number;
  try {
    current = minutesInZone(at, contract.timezone);
  } catch {
    return null;
  }
  return start - current;
}

/**
 * Next UTC instant when we should fire the pre-window reminder for a user.
 * Fires 15 minutes before `windowStart` in the user's local timezone, and
 * rolls forward to tomorrow if today's slot has already passed. DST-safe
 * because the computation is redone each time this is called.
 */
export function computeNextReminderAt(
  windowStart: string,
  timezone: string,
  leadMinutes: number = 15,
  now: Date = new Date(),
): Date | null {
  const start = parseHHMM(windowStart);
  if (start === null) return null;
  const targetTotalMin = ((start - leadMinutes) % 1440 + 1440) % 1440;
  const targetHour = Math.floor(targetTotalMin / 60);
  const targetMinute = targetTotalMin % 60;

  const today = zonedYmd(now, timezone);
  const todayCandidate = zonedWallClockToUtc(
    today.year, today.month, today.day, targetHour, targetMinute, timezone,
  );
  if (todayCandidate.getTime() > now.getTime()) return todayCandidate;

  // Today's reminder slot is past — use tomorrow's local date.
  const tomorrowAnchor = new Date(
    zonedWallClockToUtc(today.year, today.month, today.day, 12, 0, timezone).getTime()
      + 24 * 60 * 60 * 1000,
  );
  const tomorrow = zonedYmd(tomorrowAnchor, timezone);
  return zonedWallClockToUtc(
    tomorrow.year, tomorrow.month, tomorrow.day, targetHour, targetMinute, timezone,
  );
}
