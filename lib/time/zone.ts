/**
 * Shared IANA-timezone helpers used by both server-side (study contract /
 * reminder cron) and client-side (breathing warm-up) code. Extracted from
 * lib/services/studyContract.ts so the DST-correction algorithm lives in
 * one place. studyContract.ts re-exports these for back-compat.
 */

/**
 * Convert a wall-clock time (year/month/day/hour/minute) in a given IANA
 * timezone to the corresponding UTC Date. Handles DST transitions by
 * measuring the zone's offset at the candidate instant and correcting once.
 */
export function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(naive));
  const f: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') f[p.type] = Number(p.value);
  }
  if (f.hour === 24) f.hour = 0;
  const asIfUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  const offset = asIfUtc - naive;
  return new Date(naive - offset);
}

/** "Today" in the given timezone, as a {year, month, day}. */
export function zonedYmd(
  at: Date,
  timezone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  let year = 0;
  let month = 0;
  let day = 0;
  for (const p of parts) {
    if (p.type === 'year') year = Number(p.value);
    else if (p.type === 'month') month = Number(p.value);
    else if (p.type === 'day') day = Number(p.value);
  }
  return { year, month, day };
}
