/**
 * Cognitive Contract helpers (Layer 3 of the streak system).
 *
 * A user's `studyContract` is a self-chosen daily study window anchored to an
 * IANA timezone. Activity recorded inside that window earns the Gold tier.
 * Rooted in Gollwitzer's implementation-intentions research (if-then planning).
 *
 * See issue #104 for the budget + extension + start-grace mechanics: the
 * active window is the commitment device, while `pending` edits activate at
 * the next local midnight, `editHistory` enforces a 3/7-day rolling budget,
 * and `todayExtensions` lets the user push windowEnd later while in-flow.
 */

import { STUDY_CONTRACT } from '@/lib/limits';
import { zonedWallClockToUtc, zonedYmd } from '@/lib/time/zone';

// Re-export so existing server callers keep working without direct import churn.
export { zonedWallClockToUtc, zonedYmd };

export interface TodayExtensions {
  date: string;              // "YYYY-MM-DD" in contract tz
  count: number;
  totalMinutesAdded: number;
}

export interface PendingContract {
  windowStart: string;
  windowEnd: string;
  timezone: string;
  effectiveAt: Date;
  queuedAt: Date;
}

export interface StudyContract {
  windowStart: string;  // "HH:MM" 24h
  windowEnd: string;    // "HH:MM" 24h (may cross midnight for overnight windows)
  timezone: string;     // IANA, e.g. "America/New_York"
  contractedAt: Date;
  pending?: PendingContract | null;
  editHistory?: Date[];
  todayExtensions?: TodayExtensions | null;
}

type ContractLike = Pick<StudyContract, 'windowStart' | 'windowEnd' | 'timezone'> & {
  todayExtensions?: TodayExtensions | null;
};

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

/** Local-date key "YYYY-MM-DD" in the given timezone. */
export function localDateKey(at: Date, timezone: string): string {
  const { year, month, day } = zonedYmd(at, timezone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Extension minutes that apply RIGHT NOW in the contract's timezone. Returns
 * 0 when `todayExtensions` is for a different local-date than `at`.
 */
export function activeExtensionMinutes(
  contract: ContractLike | null | undefined,
  at: Date = new Date(),
): number {
  if (!contract?.todayExtensions) return 0;
  let today: string;
  try {
    today = localDateKey(at, contract.timezone);
  } catch {
    return 0;
  }
  return contract.todayExtensions.date === today
    ? contract.todayExtensions.totalMinutesAdded
    : 0;
}

/**
 * Builds the effective window as a pair of absolute UTC instants rooted to
 * the most recent session-opening day. Returns null when the window is
 * malformed or `at` falls outside every candidate session.
 *
 * We check two candidate opening days (today, yesterday) in the contract's
 * timezone so that:
 *   - An overnight window (23:00–01:00) whose post-midnight tail is still
 *     open on "today" still resolves to yesterday's session.
 *   - An extension pushing a non-overnight window past midnight (e.g.
 *     23:00–23:30 +60min = 00:30) keeps the session anchored to yesterday.
 *
 * Grace applies symmetrically to the opening edge: the session is
 * considered "open" starting `startGraceMinutes` BEFORE `windowStart`.
 */
interface EffectiveWindow {
  openAt: Date;      // grace-adjusted earliest qualifying instant
  closeAt: Date;     // exclusive end (after extensions)
  sessionDateKey: string; // "YYYY-MM-DD" of the session-opening day in tz
}

function candidateWindow(
  contract: ContractLike,
  ymd: { year: number; month: number; day: number },
  at: Date,
): EffectiveWindow | null {
  const start = parseHHMM(contract.windowStart);
  const end = parseHHMM(contract.windowEnd);
  if (start === null || end === null) return null;

  const graceMinutes = STUDY_CONTRACT.startGraceMinutes;
  const rawDuration = end > start ? end - start : end - start + 1440;

  const sessionDateKey = `${ymd.year}-${String(ymd.month).padStart(2, '0')}-${String(ymd.day).padStart(2, '0')}`;
  // Extensions only apply to the session whose opening-day key matches.
  const extMinutes =
    contract.todayExtensions && contract.todayExtensions.date === sessionDateKey
      ? contract.todayExtensions.totalMinutesAdded
      : 0;

  const startUtc = zonedWallClockToUtc(ymd.year, ymd.month, ymd.day, Math.floor(start / 60), start % 60, contract.timezone);
  const openAt = new Date(startUtc.getTime() - graceMinutes * 60_000);
  const closeAt = new Date(startUtc.getTime() + (rawDuration + extMinutes) * 60_000);

  if (at >= openAt && at < closeAt) {
    return { openAt, closeAt, sessionDateKey };
  }
  return null;
}

/**
 * Returns the effective (grace + extensions) window containing `at`, or
 * null if `at` is outside every candidate session. Handles overnight
 * windows and cross-midnight extension spillover.
 */
export function effectiveWindowAt(
  contract: ContractLike | null | undefined,
  at: Date = new Date(),
): EffectiveWindow | null {
  if (!contract) return null;
  let todayYmd: { year: number; month: number; day: number };
  try {
    todayYmd = zonedYmd(at, contract.timezone);
  } catch {
    return null;
  }
  // Yesterday: anchor to local noon today, subtract 24h, zonedYmd of result.
  const todayNoonUtc = zonedWallClockToUtc(
    todayYmd.year, todayYmd.month, todayYmd.day, 12, 0, contract.timezone,
  );
  const yesterdayAnchor = new Date(todayNoonUtc.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayYmd = zonedYmd(yesterdayAnchor, contract.timezone);

  // Yesterday's session takes priority when both would match (spill-over
  // attribution — a 00:15 click with a still-open yesterday session belongs
  // to yesterday, never today).
  return (
    candidateWindow(contract, yesterdayYmd, at) ||
    candidateWindow(contract, todayYmd, at)
  );
}

/** True when `at` falls inside the contract's effective (grace + extension) window. */
export function isNowInContractWindow(
  contract: ContractLike | null | undefined,
  at: Date = new Date(),
): boolean {
  return effectiveWindowAt(contract, at) !== null;
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
 * Minutes until the effective window closes (inclusive of extensions). Returns
 * null when the user is not currently in the window.
 */
export function minutesUntilWindowEnd(
  contract: ContractLike | null | undefined,
  at: Date = new Date(),
): number | null {
  const win = effectiveWindowAt(contract, at);
  if (!win) return null;
  const ms = win.closeAt.getTime() - at.getTime();
  return Math.max(0, Math.floor(ms / 60_000));
}

/**
 * Length of a contract window in minutes, overnight-safe. Returns null if
 * the window times are malformed.
 */
export function contractWindowMinutes(
  contract: Pick<StudyContract, 'windowStart' | 'windowEnd'> | null | undefined,
): number | null {
  if (!contract) return null;
  const start = parseHHMM(contract.windowStart);
  const end = parseHHMM(contract.windowEnd);
  if (start === null || end === null) return null;
  const raw = end - start;
  return raw <= 0 ? raw + 1440 : raw;
}

/**
 * `sessionDate` key for a Clarity Mode window: YYYY-MM-DD in the contract's
 * timezone, anchored to the calendar day the *opening* edge falls on. For
 * overnight windows and extension spillovers, a user inside the post-midnight
 * tail still rolls up to the day the window opened.
 */
export function contractSessionDate(
  contract: ContractLike | null | undefined,
  at: Date = new Date(),
): string | null {
  const win = effectiveWindowAt(contract, at);
  return win ? win.sessionDateKey : null;
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

// ── Edit budget + pending resolution ─────────────────────────────────────────

/** Next local midnight (UTC instant) in the given timezone, after `at`. */
export function nextLocalMidnightUtc(timezone: string, at: Date = new Date()): Date {
  const today = zonedYmd(at, timezone);
  const todayMidnight = zonedWallClockToUtc(
    today.year, today.month, today.day, 0, 0, timezone,
  );
  if (todayMidnight.getTime() > at.getTime()) return todayMidnight;
  // Anchor at local noon to side-step DST wobble, +24h, re-derive midnight.
  const tomorrowAnchor = new Date(
    zonedWallClockToUtc(today.year, today.month, today.day, 12, 0, timezone).getTime()
      + 24 * 60 * 60 * 1000,
  );
  const tomorrow = zonedYmd(tomorrowAnchor, timezone);
  return zonedWallClockToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, timezone);
}

/**
 * Counts how many edits in `editHistory` are still inside the rolling window
 * (`STUDY_CONTRACT.editBudget.windowSec`). Returns `{ used, max, remaining,
 * resetAt }` so the caller can render UI and enforce the gate.
 */
export function computeEditBudget(
  editHistory: Date[] | undefined,
  at: Date = new Date(),
): { used: number; max: number; remaining: number; resetAt: Date | null } {
  const { max, windowSec } = STUDY_CONTRACT.editBudget;
  const windowStartMs = at.getTime() - windowSec * 1000;
  const inWindow = (editHistory ?? []).filter(d => new Date(d).getTime() > windowStartMs);
  const used = inWindow.length;
  // resetAt: when the OLDEST in-window edit exits the rolling window.
  let resetAt: Date | null = null;
  if (inWindow.length > 0) {
    const oldestMs = Math.min(...inWindow.map(d => new Date(d).getTime()));
    resetAt = new Date(oldestMs + windowSec * 1000);
  }
  return {
    used,
    max,
    remaining: Math.max(0, max - used),
    resetAt,
  };
}

// `resolvePendingContract` lives in `./studyContract.server.ts` — it touches
// Mongoose's User model and must not be imported from client components.
