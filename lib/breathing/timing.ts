/**
 * Pure helpers that compute "when does the next study window start in UTC" and
 * a stable per-session date key for client-side dismissal dedupe. No React, no
 * side effects at import time. Safe to import from both client and server.
 *
 * Reuses the DST-correction algorithm from `lib/time/zone.ts` — never
 * duplicate that logic.
 */

import { zonedWallClockToUtc, zonedYmd } from '@/lib/time/zone';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseHHMM(value: string): { hour: number; minute: number } | null {
  const m = TIME_RE.exec(value);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/**
 * Next UTC instant when the user's study window opens. Returns today's UTC
 * instant if still in the future, otherwise tomorrow's — mirroring the
 * rollover logic in `computeNextReminderAt` but with leadMinutes=0.
 *
 * Returns null if `windowStart` is malformed or `timezone` is not a valid
 * IANA identifier.
 */
export function nextWindowStartUtc(
  windowStart: string,
  timezone: string,
  now: Date = new Date(),
): Date | null {
  const parsed = parseHHMM(windowStart);
  if (!parsed) return null;

  let today: { year: number; month: number; day: number };
  try {
    today = zonedYmd(now, timezone);
  } catch {
    return null;
  }

  let todayCandidate: Date;
  try {
    todayCandidate = zonedWallClockToUtc(
      today.year, today.month, today.day, parsed.hour, parsed.minute, timezone,
    );
  } catch {
    return null;
  }

  if (todayCandidate.getTime() > now.getTime()) return todayCandidate;

  // Today's window has opened — roll to tomorrow. Anchor at local noon to
  // avoid DST jumping us a day early/late.
  const tomorrowAnchor = new Date(
    zonedWallClockToUtc(today.year, today.month, today.day, 12, 0, timezone).getTime()
      + 24 * 60 * 60 * 1000,
  );
  const tomorrow = zonedYmd(tomorrowAnchor, timezone);
  return zonedWallClockToUtc(
    tomorrow.year, tomorrow.month, tomorrow.day, parsed.hour, parsed.minute, timezone,
  );
}

/**
 * YYYY-MM-DD date key in the given IANA tz for a UTC instant. Used as the
 * per-session dismissal key so a late-night window (e.g., 23:00 start that
 * bleeds past midnight) is tied to the day the window *opened in the user's
 * local time*, not today's UTC date.
 */
export function sessionDateKey(windowStartUtc: Date, timezone: string): string {
  // en-CA formats as YYYY-MM-DD natively, which dodges a locale-dependent
  // parse step compared to en-US.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(windowStartUtc);
  let y = '', m = '', d = '';
  for (const p of parts) {
    if (p.type === 'year') y = p.value;
    else if (p.type === 'month') m = p.value;
    else if (p.type === 'day') d = p.value;
  }
  return `${y}-${m}-${d}`;
}
