'use client';

import FeatureBreakdownChart from './FeatureBreakdownChart';
import ServiceEfficiencyChart from './ServiceEfficiencyChart';
import ModelComparisonChart from './ModelComparisonChart';
import OperationLegend from './OperationLegend';

interface BreakdownTabProps {
  days: number;
  refreshToken: number;
  onDataLoaded?: () => void;
}

// Breakdown consolidates the "where did the money go?" views:
//   - Feature doughnut (CostSource granularity)
//   - Service efficiency (per-service health + wasted spend)
//   - Model usage (per-LLM token economics)
//   - Operation legend (collapsible glossary)
export default function BreakdownTab({ days, refreshToken, onDataLoaded }: BreakdownTabProps) {
  return (
    <div className="space-y-6">
      <FeatureBreakdownChart days={days} key={`feat-${days}-${refreshToken}`} onLoaded={onDataLoaded} />
      <ServiceEfficiencyChart days={days} key={`svc-${days}-${refreshToken}`} />
      <ModelComparisonChart days={days} key={`model-${days}-${refreshToken}`} />
      <OperationLegend days={days} key={`legend-${days}-${refreshToken}`} />
    </div>
  );
}
