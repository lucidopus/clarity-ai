/**
 * Clara Context Injection for Clarity Mode.
 *
 * When the user's study window is active, we append a short natural-language
 * block to Clara's system prompt telling her the ritual state (elapsed,
 * remaining, phase). It is *state-only*: no "be terse" / response-length
 * rules. Clara's existing pedagogical voice stands.
 *
 * The block is absent outside the window — not "Clarity Mode inactive",
 * simply omitted — so Clara's normal tutor behavior is unchanged.
 */

import type { StudyContract } from '@/lib/services/studyContract';
import { isNowInContractWindow } from '@/lib/services/studyContract';
import { CLARITY_MODE } from '@/lib/limits';

export interface ClarityModeBlock {
  /** Whether Clarity Mode is currently active for this user. */
  active: boolean;
  /** The rendered context block, or empty string when inactive. */
  block: string;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseHHMM(value: string): number | null {
  const m = TIME_RE.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Minutes since local midnight, in the given IANA timezone, for a Date. */
function minutesInZone(date: Date, timezone: string): number | null {
  try {
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
    if (h === 24) h = 0;
    return h * 60 + m;
  } catch {
    return null;
  }
}

function formatClock(totalMinutes: number): string {
  const minsInDay = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(minsInDay / 60);
  const m = minsInDay % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Phase of the window the user is currently in, based on elapsed fraction.
 * Boundaries come from CLARITY_MODE.clara (0.25 / 0.75). Exported so tests
 * can assert phase edges without reaching into the block renderer.
 */
export function derivePhase(elapsedFraction: number): 'opening' | 'midway' | 'closing' {
  if (elapsedFraction < CLARITY_MODE.clara.phaseOpeningCutoff) return 'opening';
  if (elapsedFraction < CLARITY_MODE.clara.phaseClosingCutoff) return 'midway';
  return 'closing';
}

function phaseDescriptor(phase: 'opening' | 'midway' | 'closing', pct: number): string {
  const rounded = Math.min(99, Math.max(1, Math.round(pct * 100)));
  return `${phase} (roughly ${rounded}% through)`;
}

/**
 * Build the `## Clarity Mode` context block for a user's current instant.
 *
 * Returns `{ active: false, block: '' }` when the user has no contract or
 * is outside the window — callers must OMIT the field entirely on Clara's
 * prompt context (not pass an empty string).
 */
export function buildClarityModeContextBlock(
  contract: Pick<StudyContract, 'windowStart' | 'windowEnd' | 'timezone'> | null | undefined,
  now: Date = new Date(),
): ClarityModeBlock {
  if (!contract) return { active: false, block: '' };
  if (!isNowInContractWindow(contract, now)) return { active: false, block: '' };

  const startMin = parseHHMM(contract.windowStart);
  const endMin = parseHHMM(contract.windowEnd);
  const current = minutesInZone(now, contract.timezone);
  if (startMin === null || endMin === null || current === null) {
    return { active: false, block: '' };
  }

  // Window length handles overnight windows (e.g. 23:00 → 01:00).
  const rawDuration = endMin - startMin;
  const duration = rawDuration <= 0 ? rawDuration + 1440 : rawDuration;
  if (duration <= 0) return { active: false, block: '' };

  // Elapsed: use the same overnight-safe math. `current` can be either side
  // of midnight depending on window; normalize to minutes-since-start.
  let elapsed = current - startMin;
  if (elapsed < 0) elapsed += 1440;
  elapsed = Math.max(0, Math.min(duration, elapsed));
  const remaining = Math.max(0, duration - elapsed);
  const elapsedFraction = duration > 0 ? elapsed / duration : 0;
  const phase = derivePhase(elapsedFraction);

  const block = [
    '## Clarity Mode',
    'Clarity Mode is ACTIVE.',
    `Window: ${formatClock(startMin)}–${formatClock(endMin)} (${contract.timezone})`,
    `Local time now: ${formatClock(current)}`,
    `Elapsed: ${elapsed} min. Remaining: ${remaining} min.`,
    `Phase: ${phaseDescriptor(phase, elapsedFraction)}.`,
  ].join('\n');

  return { active: true, block };
}
