'use client';

import { useCallback, useState } from 'react';
import CostSummaryCards from './CostSummaryCards';
import SpendingHeatmap from './SpendingHeatmap';
import TokenTrendChart from './TokenTrendChart';
import AnomalyBanner from './shared/AnomalyBanner';
import TopCostDrivers from './shared/TopCostDrivers';
import { formatCost, formatPercent } from '@/lib/cost/format';

interface ServiceStatusBreakdown {
  service: string;
  totalCost: number;
  successCost: number;
  wastedCost: number;
  rejectedCost: number;
  operations: number;
}

interface CostSummary {
  totalCost: number;
  successCost: number;
  wastedCost: number;
  rejectedCost: number;
  projectedMonthlyCost: number;
  activeUsers: number;
  totalUsers: number;
  byService: ServiceStatusBreakdown[];
}

interface OverviewTabProps {
  days: number;
  refreshToken: number;
  onDataLoaded?: () => void;
}

// Composes the Overview tab:
//   - Anomaly banner (if wasted-spend ratio exceeds warning threshold)
//   - Summary cards (4 spend buckets + run rate + active users)
//   - Top cost drivers (Pareto strip)
//   - Spending heatmap (day-of-week patterns)
//   - Token trend (scale vs. cost)
// Driven by a single `days` window so every child stays in sync.
export default function OverviewTab({ days, refreshToken, onDataLoaded }: OverviewTabProps) {
  // Tag each loaded summary with the window that produced it; if days or
  // refreshToken changes we ignore the stale value until the next load
  // rather than clearing state in an effect.
  const [entry, setEntry] = useState<{ summary: CostSummary; days: number; refreshToken: number } | null>(null);

  const handleSummaryLoaded = useCallback(
    (s: CostSummary) => {
      setEntry({ summary: s, days, refreshToken });
      onDataLoaded?.();
    },
    [days, refreshToken, onDataLoaded]
  );

  const summary =
    entry && entry.days === days && entry.refreshToken === refreshToken ? entry.summary : null;

  const wastedPct = summary && summary.totalCost > 0
    ? (summary.wastedCost / summary.totalCost) * 100
    : 0;
  const showAnomaly = summary ? summary.wastedCost > 0 && wastedPct >= 5 : false;
  const criticalAnomaly = wastedPct >= 15;

  return (
    <div className="space-y-6">
      {showAnomaly && summary && (
        <AnomalyBanner
          severity={criticalAnomaly ? 'critical' : 'warning'}
          title={`${formatPercent(wastedPct)} of spend is wasted`}
          detail={`${formatCost(summary.wastedCost)} was billed by providers for operations that failed downstream in the last ${days} days. Check the Breakdown tab to find the offending service.`}
        />
      )}

      <CostSummaryCards days={days} key={`cards-${days}-${refreshToken}`} onLoaded={handleSummaryLoaded} />

      {summary && summary.byService.length > 0 && (
        <TopCostDrivers services={summary.byService} totalCost={summary.totalCost} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SpendingHeatmap days={days} key={`heatmap-${days}-${refreshToken}`} />
        <TokenTrendChart days={days} key={`trend-${days}-${refreshToken}`} />
      </div>
    </div>
  );
}
