/**
 * Unit tests for Clara Context Injection (Clarity Mode during-window state).
 *
 * Covers:
 *   - block omitted (inactive) outside the window and when no contract exists
 *   - active block renders exact natural-language shape (no raw schema names)
 *   - phase derivation at 25%/75% boundaries
 *   - tz-correctness with a midnight-crossing window
 */

import {
  buildClarityModeContextBlock,
  derivePhase,
} from './clarityModeContext';

const NYC = 'America/New_York';

const CONTRACT_NYC = {
  windowStart: '20:00',
  windowEnd: '20:40',
  timezone: NYC,
} as const;

/**
 * Build a UTC Date whose NYC wall-clock = (h:m). NYC is UTC-4 in DST and
 * UTC-5 outside DST; we anchor our tests to a summer day so the offset is
 * stable. 2026-06-15 → NYC is UTC-4.
 */
function nycInstant(h: number, m: number): Date {
  return new Date(Date.UTC(2026, 5, 15, h + 4, m, 0));
}

describe('buildClarityModeContextBlock', () => {
  test('returns inactive + empty block when no contract', () => {
    const result = buildClarityModeContextBlock(null, nycInstant(20, 10));
    expect(result.active).toBe(false);
    expect(result.block).toBe('');
  });

  test('returns inactive + empty block when before window', () => {
    const result = buildClarityModeContextBlock(CONTRACT_NYC, nycInstant(19, 30));
    expect(result.active).toBe(false);
    expect(result.block).toBe('');
  });

  test('returns inactive + empty block when after window', () => {
    const result = buildClarityModeContextBlock(CONTRACT_NYC, nycInstant(21, 0));
    expect(result.active).toBe(false);
    expect(result.block).toBe('');
  });

  test('renders natural-language block when active (mid-window)', () => {
    // 20:00 + 24 min = 60% through a 40-min window → midway phase.
    const result = buildClarityModeContextBlock(CONTRACT_NYC, nycInstant(20, 24));
    expect(result.active).toBe(true);
    expect(result.block).toBe(
      [
        '## Clarity Mode',
        'Clarity Mode is ACTIVE.',
        `Window: 20:00–20:40 (${NYC})`,
        'Local time now: 20:24',
        'Elapsed: 24 min. Remaining: 16 min.',
        'Phase: midway (roughly 60% through).',
      ].join('\n'),
    );
  });

  test('renders opening phase below 25% cutoff', () => {
    // 9 min of 40-min window = 22.5% → opening.
    const result = buildClarityModeContextBlock(CONTRACT_NYC, nycInstant(20, 9));
    expect(result.block).toContain('Phase: opening');
  });

  test('renders midway phase at 25% boundary', () => {
    // 10/40 = 25% exactly → midway (cutoff is strict `<`).
    const result = buildClarityModeContextBlock(CONTRACT_NYC, nycInstant(20, 10));
    expect(result.block).toContain('Phase: midway');
  });

  test('renders midway phase just below 75% cutoff', () => {
    // 29/40 = 72.5% → midway.
    const result = buildClarityModeContextBlock(CONTRACT_NYC, nycInstant(20, 29));
    expect(result.block).toContain('Phase: midway');
  });

  test('renders closing phase at 75% boundary', () => {
    // 30/40 = 75% exactly → closing.
    const result = buildClarityModeContextBlock(CONTRACT_NYC, nycInstant(20, 30));
    expect(result.block).toContain('Phase: closing');
  });

  test('does not leak internal schema field names', () => {
    const result = buildClarityModeContextBlock(CONTRACT_NYC, nycInstant(20, 20));
    expect(result.block).not.toMatch(/studyContract|windowStart|windowEnd|timezone:\s/);
  });

  test('block has no trailing whitespace and no blank trailing line', () => {
    const result = buildClarityModeContextBlock(CONTRACT_NYC, nycInstant(20, 20));
    expect(result.block.endsWith('\n')).toBe(false);
    expect(result.block).not.toMatch(/[ \t]+$/m);
  });

  test('handles a midnight-crossing (overnight) window correctly', () => {
    const overnight = {
      windowStart: '23:00',
      windowEnd: '01:00',
      timezone: NYC,
    };
    // 00:30 NYC, which is UTC 04:30 on the following day.
    const at = new Date(Date.UTC(2026, 5, 16, 4, 30, 0));
    const result = buildClarityModeContextBlock(overnight, at);
    expect(result.active).toBe(true);
    expect(result.block).toContain('Elapsed: 90 min. Remaining: 30 min.');
    expect(result.block).toContain('Window: 23:00–01:00');
  });
});

describe('derivePhase', () => {
  test('opening below 0.25', () => {
    expect(derivePhase(0)).toBe('opening');
    expect(derivePhase(0.24)).toBe('opening');
  });
  test('midway at 0.25 through below 0.75', () => {
    expect(derivePhase(0.25)).toBe('midway');
    expect(derivePhase(0.5)).toBe('midway');
    expect(derivePhase(0.74)).toBe('midway');
  });
  test('closing at 0.75 and above', () => {
    expect(derivePhase(0.75)).toBe('closing');
    expect(derivePhase(1)).toBe('closing');
  });
});
