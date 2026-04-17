/**
 * Tiered cost formatter. Costs in this dashboard span seven orders of
 * magnitude (a fraction-of-a-cent embedding call vs. thousands of dollars
 * in monthly LLM spend). A single `.toFixed(4)` either loses signal on the
 * low end or adds noise on the high end. This picks precision per tier:
 *
 *   >= $100      → $4,820.93     (whole dollars matter)
 *   $1 .. $100   → $47.82        (cents matter)
 *   $0.01 .. $1  → $0.0421       (4 decimals)
 *   < $0.01      → $0.000043     (6 decimals — sub-cent signals)
 */
export function formatCost(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '$0.00';
  const abs = Math.abs(amount);
  if (abs >= 100) {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (abs >= 1) {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (abs >= 0.01) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toFixed(6)}`;
}

export function formatCount(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US');
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0%';
  return `${n.toFixed(digits)}%`;
}

// Semantic success-rate bucket — used across charts/tables so "healthy" means
// the same thing everywhere. Thresholds match the legacy color cutoffs.
export type SuccessTier = 'healthy' | 'degraded' | 'failing';

export function classifySuccessRate(rate: number): SuccessTier {
  if (rate >= 95) return 'healthy';
  if (rate >= 80) return 'degraded';
  return 'failing';
}

export function successTierLabel(tier: SuccessTier): string {
  switch (tier) {
    case 'healthy':
      return 'Healthy';
    case 'degraded':
      return 'Degraded';
    case 'failing':
      return 'Failing';
  }
}
