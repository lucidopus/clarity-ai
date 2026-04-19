import { nextWindowStartUtc, sessionDateKey } from './timing';

describe('nextWindowStartUtc', () => {
  it('returns today\'s UTC instant when the window is still ahead today', () => {
    // 2026-04-19T12:00:00Z is 08:00 EDT on 2026-04-19. 09:00 EDT is still ahead.
    const now = new Date('2026-04-19T12:00:00Z');
    const result = nextWindowStartUtc('09:00', 'America/New_York', now);
    expect(result).not.toBeNull();
    // 09:00 EDT (UTC-4) === 13:00 UTC same day
    expect(result!.toISOString()).toBe('2026-04-19T13:00:00.000Z');
  });

  it('rolls over to tomorrow when today\'s window has already opened', () => {
    // 2026-04-19T18:00:00Z is 14:00 EDT. 09:00 window is past — roll to tomorrow.
    const now = new Date('2026-04-19T18:00:00Z');
    const result = nextWindowStartUtc('09:00', 'America/New_York', now);
    expect(result!.toISOString()).toBe('2026-04-20T13:00:00.000Z');
  });

  it('rolls over when now === windowStart exactly (no negative-ms frame)', () => {
    // now is exactly 09:00 EDT. Since todayCandidate.getTime() > now.getTime() is
    // strictly greater-than, rollover fires — returns tomorrow.
    const now = new Date('2026-04-19T13:00:00Z');
    const result = nextWindowStartUtc('09:00', 'America/New_York', now);
    expect(result!.getTime()).toBeGreaterThan(now.getTime());
    expect(result!.toISOString()).toBe('2026-04-20T13:00:00.000Z');
  });

  it('handles spring-forward DST (2026-03-08 in America/New_York)', () => {
    // Day before DST. 08:00 local on 2026-03-08 still falls after 02:00→03:00
    // jump; result should be 12:00 UTC (EDT now in effect after the skip).
    const now = new Date('2026-03-08T06:00:00Z'); // 01:00 EST, before DST skip
    const result = nextWindowStartUtc('08:00', 'America/New_York', now);
    expect(result).not.toBeNull();
    // 08:00 EDT on 2026-03-08 === 12:00 UTC
    expect(result!.toISOString()).toBe('2026-03-08T12:00:00.000Z');
  });

  it('handles fall-back DST (2026-11-01 in America/New_York)', () => {
    // Day of fall-back. 08:00 local on 2026-11-01 falls after the duplicated
    // 01:00 hour. Intl picks the first occurrence by default for wall clocks
    // before 02:00 — but 08:00 is unambiguous, EST in effect.
    const now = new Date('2026-11-01T10:00:00Z'); // 06:00 EDT before fall-back
    const result = nextWindowStartUtc('08:00', 'America/New_York', now);
    expect(result).not.toBeNull();
    // 08:00 EST on 2026-11-01 === 13:00 UTC
    expect(result!.toISOString()).toBe('2026-11-01T13:00:00.000Z');
  });

  it('handles a late-night window crossing midnight (Asia/Tokyo 23:00)', () => {
    // 22:50 JST on 2026-04-19 → next 23:00 JST is today.
    // 22:50 JST (UTC+9) === 13:50 UTC same day.
    const now = new Date('2026-04-19T13:50:00Z');
    const result = nextWindowStartUtc('23:00', 'Asia/Tokyo', now);
    expect(result).not.toBeNull();
    // 23:00 JST on 2026-04-19 === 14:00 UTC same day.
    expect(result!.toISOString()).toBe('2026-04-19T14:00:00.000Z');
  });

  it('rolls over a late-night window once past (Asia/Tokyo 23:00 at 23:30 JST)', () => {
    // 23:30 JST → 14:30 UTC → today's 23:00 JST has already opened → roll.
    const now = new Date('2026-04-19T14:30:00Z');
    const result = nextWindowStartUtc('23:00', 'Asia/Tokyo', now);
    expect(result!.toISOString()).toBe('2026-04-20T14:00:00.000Z');
  });

  it('returns null for malformed HH:MM', () => {
    expect(nextWindowStartUtc('25:00', 'America/New_York')).toBeNull();
    expect(nextWindowStartUtc('9:00', 'America/New_York')).toBeNull(); // requires leading zero
    expect(nextWindowStartUtc('garbage', 'America/New_York')).toBeNull();
  });
});

describe('sessionDateKey', () => {
  it('returns YYYY-MM-DD in the window\'s local timezone', () => {
    // 13:00 UTC is 09:00 EDT — same calendar day.
    const windowStartUtc = new Date('2026-04-19T13:00:00Z');
    expect(sessionDateKey(windowStartUtc, 'America/New_York')).toBe('2026-04-19');
  });

  it('uses the window\'s local calendar date, not UTC (late-night PST window)', () => {
    // 07:45 UTC on 2026-04-20 is 23:45 PDT on 2026-04-19.
    // The session belongs to 2026-04-19 in the user's tz.
    const windowStartUtc = new Date('2026-04-20T06:45:00Z'); // 23:45 PDT prev day
    expect(sessionDateKey(windowStartUtc, 'America/Los_Angeles')).toBe('2026-04-19');
  });

  it('pairs with nextWindowStartUtc to produce the upcoming window\'s date', () => {
    // 22:50 JST → nextWindowStartUtc for 23:00 JST returns today's 23:00 JST.
    const now = new Date('2026-04-19T13:50:00Z');
    const target = nextWindowStartUtc('23:00', 'Asia/Tokyo', now)!;
    expect(sessionDateKey(target, 'Asia/Tokyo')).toBe('2026-04-19');
  });
});
