/**
 * Unit tests for lib/services/studyContract.ts.
 *
 * Exercises: edit-budget math, extension-aware window logic, cross-midnight
 * session attribution, and the computeEditBudget helper. All tests are pure
 * functions — no MongoDB round-trips.
 */

import {
  validateStudyContract,
  isNowInContractWindow,
  minutesUntilWindowEnd,
  contractSessionDate,
  computeEditBudget,
  nextLocalMidnightUtc,
  effectiveWindowAt,
} from './studyContract';
import { STUDY_CONTRACT } from '@/lib/limits';

// Pin a reference timezone. UTC keeps the arithmetic clean — local-minutes
// in this tz equal UTC minutes, so we can build test instants with Date.UTC.
const TZ = 'UTC';

function utcAt(hh: number, mm: number, day: number = 1): Date {
  return new Date(Date.UTC(2026, 0, day, hh, mm, 0));
}

describe('validateStudyContract', () => {
  test('rejects malformed times', () => {
    expect(validateStudyContract('25:00', '08:00', TZ)).toMatch(/HH:MM/);
    expect(validateStudyContract('07:00', '8:00', TZ)).toMatch(/HH:MM/);
  });
  test('rejects sub-15min windows', () => {
    expect(validateStudyContract('07:00', '07:10', TZ)).toMatch(/15 minutes/);
  });
  test('rejects > 8h windows', () => {
    expect(validateStudyContract('07:00', '16:00', TZ)).toMatch(/8 hours/);
  });
  test('accepts valid window', () => {
    expect(validateStudyContract('07:00', '08:00', TZ)).toBeNull();
  });
});

describe('isNowInContractWindow — open at exact start, extensions', () => {
  const contract = { windowStart: '07:00', windowEnd: '08:00', timezone: TZ };

  test('true at exact start', () => {
    expect(isNowInContractWindow(contract, utcAt(7, 0))).toBe(true);
  });
  test('false one minute before start', () => {
    expect(isNowInContractWindow(contract, utcAt(6, 59))).toBe(false);
  });
  test('false ten minutes before start (no early-entry grace)', () => {
    expect(isNowInContractWindow(contract, utcAt(6, 50))).toBe(false);
  });
  test('true shortly after start', () => {
    expect(isNowInContractWindow(contract, utcAt(7, 30))).toBe(true);
  });
  test('false at end (half-open interval)', () => {
    expect(isNowInContractWindow(contract, utcAt(8, 0))).toBe(false);
  });
  test('extension pushes the end later', () => {
    const today = '2026-01-01';
    const extended = {
      ...contract,
      todayExtensions: { date: today, count: 1, totalMinutesAdded: 30 },
    };
    // Without extension: false at 8:15. With extension: true.
    expect(isNowInContractWindow(contract, utcAt(8, 15))).toBe(false);
    expect(isNowInContractWindow(extended, utcAt(8, 15))).toBe(true);
    expect(isNowInContractWindow(extended, utcAt(8, 30))).toBe(false);
  });
  test('extension for a DIFFERENT session-date is ignored', () => {
    const extended = {
      ...contract,
      todayExtensions: { date: '2025-12-31', count: 1, totalMinutesAdded: 30 },
    };
    // Still using January 1 instants; extension belongs to a different day.
    expect(isNowInContractWindow(extended, utcAt(8, 15))).toBe(false);
  });
});

describe('minutesUntilWindowEnd', () => {
  const contract = { windowStart: '07:00', windowEnd: '08:00', timezone: TZ };
  test('counts down normally', () => {
    expect(minutesUntilWindowEnd(contract, utcAt(7, 15))).toBe(45);
  });
  test('null outside window', () => {
    expect(minutesUntilWindowEnd(contract, utcAt(9, 0))).toBeNull();
  });
  test('extension bumps the count', () => {
    const extended = {
      ...contract,
      todayExtensions: { date: '2026-01-01', count: 1, totalMinutesAdded: 30 },
    };
    expect(minutesUntilWindowEnd(extended, utcAt(7, 45))).toBe(45);
  });
});

describe('contractSessionDate — cross-midnight extension attribution', () => {
  test('overnight window: post-midnight tail attributes to opening day', () => {
    // 22:00 Jan 1 → 01:00 Jan 2. At 00:30 Jan 2 UTC, session date is Jan 1.
    const contract = { windowStart: '22:00', windowEnd: '01:00', timezone: TZ };
    const at = new Date(Date.UTC(2026, 0, 2, 0, 30));
    expect(contractSessionDate(contract, at)).toBe('2026-01-01');
  });
  test('extension pushing non-overnight window past midnight attributes to opener', () => {
    // 23:00 Jan 1 → 23:30 Jan 1, extended +60 → 00:30 Jan 2. At 00:15 Jan 2,
    // session date must be Jan 1 (activity belongs to opening day).
    const contract = {
      windowStart: '23:00',
      windowEnd: '23:30',
      timezone: TZ,
      todayExtensions: { date: '2026-01-01', count: 1, totalMinutesAdded: 60 },
    };
    const at = new Date(Date.UTC(2026, 0, 2, 0, 15));
    expect(contractSessionDate(contract, at)).toBe('2026-01-01');
  });
  test('non-overnight daytime window attributes to today', () => {
    const contract = { windowStart: '07:00', windowEnd: '08:00', timezone: TZ };
    const at = new Date(Date.UTC(2026, 0, 1, 7, 30));
    expect(contractSessionDate(contract, at)).toBe('2026-01-01');
  });
});

describe('effectiveWindowAt — priority for yesterday spillover', () => {
  test('when both today and yesterday-spillover would match, yesterday wins', () => {
    // Overnight contract 22:00–01:00 + extension +30 → spills to 01:30.
    // At 00:30 Jan 2, both yesterday's session (still open until 01:30) and
    // today's (opens at 22:00 Jan 2) could qualify. Must anchor to yesterday.
    const contract = {
      windowStart: '22:00',
      windowEnd: '01:00',
      timezone: TZ,
      todayExtensions: { date: '2026-01-01', count: 1, totalMinutesAdded: 30 },
    };
    const at = new Date(Date.UTC(2026, 0, 2, 0, 30));
    const win = effectiveWindowAt(contract, at);
    expect(win?.sessionDateKey).toBe('2026-01-01');
  });
});

describe('computeEditBudget — rolling 7-day window', () => {
  const { max, windowSec } = STUDY_CONTRACT.editBudget;

  test('empty history → full budget', () => {
    const b = computeEditBudget([], utcAt(12, 0));
    expect(b.used).toBe(0);
    expect(b.remaining).toBe(max);
    expect(b.resetAt).toBeNull();
  });
  test('three in-window edits → 0 remaining, resetAt = oldest + 7d', () => {
    const now = new Date(Date.UTC(2026, 0, 10, 12, 0));
    const t1 = new Date(now.getTime() - 6 * 86_400_000);
    const t2 = new Date(now.getTime() - 3 * 86_400_000);
    const t3 = new Date(now.getTime() - 60 * 60_000);
    const b = computeEditBudget([t1, t2, t3], now);
    expect(b.used).toBe(3);
    expect(b.remaining).toBe(0);
    expect(b.resetAt?.getTime()).toBe(t1.getTime() + windowSec * 1000);
  });
  test('entries older than window are pruned', () => {
    const now = new Date(Date.UTC(2026, 0, 10, 12, 0));
    const tOld = new Date(now.getTime() - 8 * 86_400_000);
    const tIn1 = new Date(now.getTime() - 2 * 86_400_000);
    const tIn2 = new Date(now.getTime() - 1 * 60 * 60_000);
    const b = computeEditBudget([tOld, tIn1, tIn2], now);
    expect(b.used).toBe(2);
    expect(b.remaining).toBe(max - 2);
  });
});

describe('nextLocalMidnightUtc', () => {
  test('returns tomorrow midnight UTC when tz = UTC', () => {
    // Jan 1 14:00 UTC → next midnight = Jan 2 00:00 UTC.
    const at = new Date(Date.UTC(2026, 0, 1, 14, 0));
    const next = nextLocalMidnightUtc('UTC', at);
    expect(next.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });
  test('respects IANA offset', () => {
    // In America/New_York (UTC-5 in January), Jan 1 14:00 UTC is 09:00 local.
    // Next local midnight = Jan 2 00:00 EST = Jan 2 05:00 UTC.
    const at = new Date(Date.UTC(2026, 0, 1, 14, 0));
    const next = nextLocalMidnightUtc('America/New_York', at);
    expect(next.toISOString()).toBe('2026-01-02T05:00:00.000Z');
  });
});
