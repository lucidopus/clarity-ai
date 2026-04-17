'use client';

import { getServiceLabel } from '@/lib/service-utils';
import { formatCost, formatPercent } from '@/lib/cost/format';

interface ServiceStatusBreakdown {
  service: string;
  totalCost: number;
  successCost: number;
  wastedCost: number;
  operations: number;
}

interface TopCostDriversProps {
  services: ServiceStatusBreakdown[];
  totalCost: number;
  maxItems?: number;
}

// Pareto strip: surfaces the services driving the biggest slice of spend so
// the admin can triage without scanning the full Breakdown tab. Sorted by
// total cost (not success cost) so a service bleeding wasted spend still
// ranks high.
export default function TopCostDrivers({
  services,
  totalCost,
  maxItems = 3,
}: TopCostDriversProps) {
  const drivers = [...services]
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, maxItems);

  if (drivers.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">Top cost drivers</h3>
        <p className="text-sm text-muted-foreground">No service activity in this window.</p>
      </div>
    );
  }

  return (
    <div className="bg-card-bg border border-border rounded-xl p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Top cost drivers</h3>
        <span className="text-xs text-muted-foreground">
          Share of {formatCost(totalCost)} total
        </span>
      </div>

      <ol className="space-y-3">
        {drivers.map((service, idx) => {
          const share = totalCost > 0 ? (service.totalCost / totalCost) * 100 : 0;
          const wastedShare = service.totalCost > 0
            ? (service.wastedCost / service.totalCost) * 100
            : 0;
          return (
            <li key={service.service}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-semibold items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-foreground truncate">
                    {getServiceLabel(service.service)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-foreground font-semibold">{formatCost(service.totalCost)}</div>
                  <div className="text-xs text-muted-foreground">{formatPercent(share)}</div>
                </div>
              </div>
              <div className="mt-2 flex h-1.5 rounded-full overflow-hidden bg-secondary/20" aria-hidden="true">
                <div
                  className="bg-green-500"
                  style={{ width: `${Math.min(Math.max(share - wastedShare * (share / 100), 0), share)}%` }}
                />
                {service.wastedCost > 0 && (
                  <div
                    className="bg-red-500"
                    style={{ width: `${(service.wastedCost / totalCost) * 100}%` }}
                    title={`${formatCost(service.wastedCost)} wasted`}
                  />
                )}
              </div>
              {service.wastedCost > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  {formatCost(service.wastedCost)} wasted ({formatPercent(wastedShare)} of this service)
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
