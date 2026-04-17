import { startOfDay, subDays } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  days: number;
}

// Shared parser for ?days=N on admin cost endpoints. Clamps to [1, 365] so a
// crafted query can't run an unbounded aggregation. `days=0` → 0 results
// (caller handles the match explicitly).
export function parseDateRange(searchParams: URLSearchParams, fallback = 30): DateRange {
  const raw = parseInt(searchParams.get('days') || String(fallback), 10);
  const days = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 365) : fallback;
  const endDate = new Date();
  const startDate = startOfDay(subDays(new Date(), days));
  return { startDate, endDate, days };
}
