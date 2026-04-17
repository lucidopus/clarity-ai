'use client';

import { useCallback, useEffect, useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { getCostSourceMeta } from '@/lib/cost/source-labels';
import { formatCost, formatCount, formatPercent } from '@/lib/cost/format';

interface SourceData {
  source: string;
  cost: number;
  operations: number;
  percentage: number;
}

interface OperationLegendProps {
  days: number;
  defaultOpen?: boolean;
}

export default function OperationLegend({ days, defaultOpen = false }: OperationLegendProps) {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectionOpen, setSectionOpen] = useState(defaultOpen);

  const fetchSources = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/costs/by-source?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSources(data.sources);
          if (data.sources.length > 0) {
            setExpandedSource(data.sources[0].source);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch source data:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  if (loading) {
    return null;
  }

  // Derive definitions from live source list — any CostSource with data in MongoDB
  // gets rendered, including future sources that ship without a UI update.
  const relevantDefinitions = sources.map((s) => ({
    source: s.source,
    ...getCostSourceMeta(s.source),
  }));

  if (relevantDefinitions.length === 0) {
    return null;
  }

  return (
    <div className="bg-card-bg border border-border rounded-xl">
      <button
        type="button"
        onClick={() => setSectionOpen((o) => !o)}
        aria-expanded={sectionOpen}
        className="w-full flex items-center justify-between p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
      >
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-left">
            <h3 className="text-lg font-semibold text-foreground">About Operations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              What each operation type represents and how costs are attributed
            </p>
          </div>
        </div>
        {sectionOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {sectionOpen && (
      <div className="px-6 pb-6">

      <div className="space-y-2">
        {relevantDefinitions.map((definition) => {
          const isExpanded = expandedSource === definition.source;
          const sourceData = sources.find((s) => s.source === definition.source);

          return (
            <div
              key={definition.source}
              className="border border-border rounded-lg overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() =>
                  setExpandedSource(isExpanded ? null : definition.source)
                }
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-background/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-2xl">{definition.icon}</span>
                  <div className="text-left">
                    <p className="font-medium text-foreground text-sm">
                      {definition.displayName}
                    </p>
                    {sourceData && (
                      <p className="text-xs text-muted-foreground">
                        {formatCount(sourceData.operations)} operation{sourceData.operations !== 1 ? 's' : ''} · {formatCost(sourceData.cost)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {sourceData && (
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded">
                      {formatPercent(sourceData.percentage)}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-background/30 border-t border-border space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    {definition.description}
                  </p>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Associated Services:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {definition.exampleServices.map((service) => (
                        <span
                          key={service}
                          className="inline-block bg-accent/10 text-accent text-xs px-2 py-1 rounded"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>

                  {sourceData && (
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Operations</p>
                        <p className="font-semibold text-foreground">
                          {formatCount(sourceData.operations)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Cost</p>
                        <p className="font-semibold text-foreground">
                          {formatCost(sourceData.cost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Of Total</p>
                        <p className="font-semibold text-accent">
                          {formatPercent(sourceData.percentage)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
        New operation types appear here automatically as they are added to the system.
      </p>
      </div>
      )}
    </div>
  );
}
