/**
 * Pause Budget computation for Clarity Mode.
 *
 * The budget is a *time budget* (minutes) per window, not a fixed count of
 * 90-second slots — real pauses aren't 90 s. Formula:
 *   max(floor, min(ceiling, floor(windowMinutes / 15)))
 * where floor/ceiling come from `CLARITY_MODE.pause`. All knobs in lib/limits.ts.
 */

import { CLARITY_MODE } from '@/lib/limits';

export function computePauseBudgetMinutes(windowMinutes: number): number {
  if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) {
    return CLARITY_MODE.pause.budgetFloorMinutes;
  }
  const raw = Math.floor(windowMinutes * CLARITY_MODE.pause.budgetPerWindowMinute);
  return Math.max(
    CLARITY_MODE.pause.budgetFloorMinutes,
    Math.min(CLARITY_MODE.pause.budgetCeilingMinutes, raw),
  );
}
