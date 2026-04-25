/**
 * Pure helpers that compute "when does the next study window start in UTC" and
 * a stable per-session-instance key for client-side dismissal dedupe. No
 * React, no side effects at import time. Safe to import from both client and
 * server.
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
 * Per-session dismissal key. Returns the window-start UTC instant as epoch ms
 * (string form). Each distinct window opening — including a same-day contract
 * change — gets its own dismissal slot, so dismissing one warm-up cannot
 * silently suppress the next.
 *
 * Previously this returned YYYY-MM-DD, which collapsed all windows on the
 * same calendar date into a single dismissal slot — a footgun if the user
 * edited their contract mid-day.
 *
 * The `timezone` parameter is unused now but kept for caller compatibility;
 * the windowStart instant is already an unambiguous global identifier.
 */
export function sessionInstanceKey(windowStartUtc: Date, _timezone: string): string {
  return String(windowStartUtc.getTime());
}
