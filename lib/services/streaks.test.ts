/**
 * Pure-function tests for the streak/shield decision logic.
 *
 * These exercise `decideStreakAction` and `applyStreakAction` — the two
 * helpers extracted from `recordStudyActivity`. Together they capture the
 * full state transition for a streak-relevant activity, without DB I/O.
 *
 * Focus: the multi-day shield bridge. Asserts that shields are consumed
 * correctly across diff = 2…N, that an under-supplied shield bank falls
 * through to the recovery branch, and that earn-on-multiple-of-7 still
 * fires after a shield bridge.
 */

import {
  decideStreakAction,
  applyStreakAction,
  computeRecoveryCutoff,
  SHIELD_CAP,
} from './streaks';

const SOFT = {
  flashcardReviews: 5,
  quizzesCompleted: 0,
  sourcesProcessed: 0,
  flashcardsCreated: 0,
  documentStudySessions: 0,
};
const HARD = {
  flashcardReviews: 10,
  quizzesCompleted: 0,
  sourcesProcessed: 0,
  flashcardsCreated: 0,
  documentStudySessions: 0,
};

// Pin a "today" + a `now` UTC instant inside that day, so tests can move
// `lastStudy` around it deterministically.
const TODAY = '2026-04-25';
const NOW = new Date('2026-04-25T12:00:00Z');

function ymdMinus(today: string, days: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

describe('decideStreakAction — basic transitions', () => {
  test('firstEver when no lastStudy', () => {
    expect(
      decideStreakAction({
        lastStudy: null,
        today: TODAY,
        shields: 0,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: SOFT,
      }),
    ).toEqual({ action: 'firstEver', shieldsToConsume: 0 });
  });

  test('noop when same UTC day (diff = 0)', () => {
    expect(
      decideStreakAction({
        lastStudy: TODAY,
        today: TODAY,
        shields: 3,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: SOFT,
      }),
    ).toEqual({ action: 'noop', shieldsToConsume: 0 });
  });

  test('increment when diff = 1', () => {
    expect(
      decideStreakAction({
        lastStudy: ymdMinus(TODAY, 1),
        today: TODAY,
        shields: 3,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: SOFT,
      }),
    ).toEqual({ action: 'increment', shieldsToConsume: 0 });
  });
});

describe('decideStreakAction — shield bridge (the bug-fix surface)', () => {
  test('1-day gap, 1 shield → bridge consuming 1', () => {
    expect(
      decideStreakAction({
        lastStudy: ymdMinus(TODAY, 2),
        today: TODAY,
        shields: 1,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: SOFT,
      }),
    ).toEqual({ action: 'shield', shieldsToConsume: 1 });
  });

  test('2-day gap, 2 shields → bridge consuming 2', () => {
    expect(
      decideStreakAction({
        lastStudy: ymdMinus(TODAY, 3),
        today: TODAY,
        shields: 2,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: SOFT,
      }),
    ).toEqual({ action: 'shield', shieldsToConsume: 2 });
  });

  test('3-day gap, 3 shields → bridge consuming 3 (max bridgeable gap)', () => {
    expect(
      decideStreakAction({
        lastStudy: ymdMinus(TODAY, 4),
        today: TODAY,
        shields: SHIELD_CAP,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: SOFT,
      }),
    ).toEqual({ action: 'shield', shieldsToConsume: 3 });
  });

  test('2-day gap, 1 shield (insufficient) → falls through, past cutoff → reset', () => {
    // diff = 3 means now is on lastStudy + 3 days; cutoff is lastStudy + 3 days 00:00Z.
    // NOW is 12:00Z, past cutoff → reset.
    expect(
      decideStreakAction({
        lastStudy: ymdMinus(TODAY, 3),
        today: TODAY,
        shields: 1,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: HARD,
      }),
    ).toEqual({ action: 'reset', shieldsToConsume: 0 });
  });

  test('4-day gap, 3 shields (exceeds bridge capacity) → reset', () => {
    expect(
      decideStreakAction({
        lastStudy: ymdMinus(TODAY, 5),
        today: TODAY,
        shields: SHIELD_CAP,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: HARD,
      }),
    ).toEqual({ action: 'reset', shieldsToConsume: 0 });
  });

  test('1-day gap, 0 shields → no bridge available, falls to recovery (within cutoff)', () => {
    // diff = 2 means now is on lastStudy + 2 days; cutoff is lastStudy + 3 days 00:00Z.
    // NOW = 12:00Z on day 2, before cutoff (day 3 00:00Z). Soft threshold → recoveryPending.
    expect(
      decideStreakAction({
        lastStudy: ymdMinus(TODAY, 2),
        today: TODAY,
        shields: 0,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: SOFT,
      }),
    ).toEqual({ action: 'recoveryPending', shieldsToConsume: 0 });
  });

  test('1-day gap, 0 shields, hard threshold met → recover', () => {
    expect(
      decideStreakAction({
        lastStudy: ymdMinus(TODAY, 2),
        today: TODAY,
        shields: 0,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: HARD,
      }),
    ).toEqual({ action: 'recover', shieldsToConsume: 0 });
  });

  test('shields preferred over recovery when both available (current priority)', () => {
    // diff=2, shields >= 1, hard threshold met. Shield wins.
    expect(
      decideStreakAction({
        lastStudy: ymdMinus(TODAY, 2),
        today: TODAY,
        shields: 1,
        recoveryRedemptions: [],
        now: NOW,
        todayActivity: HARD,
      }),
    ).toEqual({ action: 'shield', shieldsToConsume: 1 });
  });

  test('recovery cap exhausted → reset even within cutoff', () => {
    const recent = new Date(NOW.getTime() - 10 * 86_400_000);
    expect(
      decideStreakAction({
        lastStudy: ymdMinus(TODAY, 2),
        today: TODAY,
        shields: 0,
        recoveryRedemptions: [recent],
        now: NOW,
        todayActivity: HARD,
      }),
    ).toEqual({ action: 'reset', shieldsToConsume: 0 });
  });
});

describe('applyStreakAction — state math', () => {
  test('shield bridge: streak +1, shields decremented by shieldsToConsume', () => {
    expect(
      applyStreakAction({
        action: 'shield',
        shieldsToConsume: 2,
        prevStreak: 14,
        prevLongest: 14,
        prevShields: 3,
        prevMilestones: [7],
      }),
    ).toMatchObject({
      newStreak: 15,
      newLongest: 15,
      newShields: 1,
      shieldConsumed: true,
      shieldEarned: false,
    });
  });

  test('shield bridge crossing day-7 milestone: consume + earn → break-even at +1', () => {
    // prevStreak 6 → newStreak 7. Consume 1 (was 1 → 0), then earn 1 (→ 1).
    // shieldEarned compares vs prevShields (1), so newShields == prev → not earned.
    const r = applyStreakAction({
      action: 'shield',
      shieldsToConsume: 1,
      prevStreak: 6,
      prevLongest: 6,
      prevShields: 1,
      prevMilestones: [],
    });
    expect(r.newStreak).toBe(7);
    expect(r.newShields).toBe(1); // 1 - 1 + 1
    expect(r.shieldConsumed).toBe(true);
    expect(r.shieldEarned).toBe(false); // net unchanged
    expect(r.newMilestone).toBe(7);
  });

  test('shield bridge of 3 days landing on day-21 milestone: consume 3, then earn 1', () => {
    // 21 % 7 === 0, so the day-21 landing triggers a shield earn even when
    // the landing happens via a shield bridge. Final shields = 3 - 3 + 1 = 1.
    expect(
      applyStreakAction({
        action: 'shield',
        shieldsToConsume: 3,
        prevStreak: 20,
        prevLongest: 20,
        prevShields: 3,
        prevMilestones: [7],
      }),
    ).toMatchObject({
      newStreak: 21,
      newShields: 1,
      newMilestone: 21,
      shieldConsumed: true,
    });
  });

  test('shield bridge of 3 days NOT landing on a 7-multiple: shields drop by 3 with no earn', () => {
    expect(
      applyStreakAction({
        action: 'shield',
        shieldsToConsume: 3,
        prevStreak: 19,
        prevLongest: 19,
        prevShields: 3,
        prevMilestones: [7],
      }),
    ).toMatchObject({
      newStreak: 20,
      newShields: 0,
      newMilestone: undefined,
      shieldConsumed: true,
    });
  });

  test('reset: streak → 1, shields preserved', () => {
    expect(
      applyStreakAction({
        action: 'reset',
        shieldsToConsume: 0,
        prevStreak: 14,
        prevLongest: 14,
        prevShields: 3,
        prevMilestones: [7],
      }),
    ).toMatchObject({
      newStreak: 1,
      newLongest: 14,
      newShields: 3, // <-- this was the reported bug pre-fix: same outcome here since reset doesn't touch shields
      shieldConsumed: false,
      shieldEarned: false,
    });
  });

  test('increment crossing day-7 earns shield', () => {
    expect(
      applyStreakAction({
        action: 'increment',
        shieldsToConsume: 0,
        prevStreak: 6,
        prevLongest: 6,
        prevShields: 1,
        prevMilestones: [],
      }),
    ).toMatchObject({ newStreak: 7, newShields: 2, shieldEarned: true });
  });

  test('shield earn capped at SHIELD_CAP', () => {
    expect(
      applyStreakAction({
        action: 'increment',
        shieldsToConsume: 0,
        prevStreak: 13,
        prevLongest: 13,
        prevShields: SHIELD_CAP,
        prevMilestones: [7],
      }),
    ).toMatchObject({ newStreak: 14, newShields: SHIELD_CAP, shieldEarned: false });
  });

  test('firstEver: streak 1, no milestone, no shield change', () => {
    expect(
      applyStreakAction({
        action: 'firstEver',
        shieldsToConsume: 0,
        prevStreak: 0,
        prevLongest: 0,
        prevShields: 1,
        prevMilestones: [],
      }),
    ).toMatchObject({
      newStreak: 1,
      newLongest: 1,
      newShields: 1,
      newMilestone: undefined,
    });
  });
});

describe('computeRecoveryCutoff', () => {
  test('cutoff is exactly lastStudy + 3 days at 00:00Z', () => {
    expect(computeRecoveryCutoff('2026-04-22').toISOString()).toBe(
      '2026-04-25T00:00:00.000Z',
    );
  });
});

describe('end-to-end: gap exceeds bridge capacity', () => {
  // When the gap is larger than the user's shield count, the streak must
  // reset and shields must be preserved (no partial spend). This was the
  // surface of the original bug: pre-fix, this path would also fire for
  // gaps of diff>=2 even when shields could have bridged — now `decide`
  // routes those to `shield` instead, and only truly-unbridgeable gaps
  // land here.
  test.each([
    { diff: 5, shields: SHIELD_CAP }, // one beyond max bridge
    { diff: 7, shields: SHIELD_CAP },
    { diff: 30, shields: SHIELD_CAP },
    { diff: 4, shields: 2 }, // shields just short
  ])('diff=$diff with $shields shields → reset, shields preserved', ({ diff, shields }) => {
    const decision = decideStreakAction({
      lastStudy: ymdMinus(TODAY, diff),
      today: TODAY,
      shields,
      recoveryRedemptions: [],
      now: NOW,
      todayActivity: HARD,
    });
    expect(decision).toEqual({ action: 'reset', shieldsToConsume: 0 });

    const prevStreak = 14;
    const next = applyStreakAction({
      action: decision.action,
      shieldsToConsume: decision.shieldsToConsume,
      prevStreak,
      prevLongest: prevStreak,
      prevShields: shields,
      prevMilestones: [7],
    });
    expect(next).toMatchObject({
      newStreak: 1,
      newLongest: prevStreak,
      newShields: shields,
      shieldConsumed: false,
    });
  });
});
