'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AlertCircle } from 'lucide-react';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';
import { getCostSourceDisplayName } from '@/lib/cost/source-labels';
import { formatCost, formatCount, formatPercent } from '@/lib/cost/format';
import CostSkeleton from './shared/CostSkeleton';

try {
  ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);
} catch {
  // Already registered
}

interface SourceData {
  source: string;
  cost: number;
  operations: number;
  percentage: number;
}

interface FeatureBreakdownChartProps {
  days: number;
  onLoaded?: () => void;
}

export default function FeatureBreakdownChart({ days, onLoaded }: FeatureBreakdownChartProps) {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef(null);

  const fetchSources = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/costs/by-source?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch source data');
      const data = await response.json();
      if (data.success) {
        setSources(data.sources);
        setTotalCost(data.totalCost || 0);
        onLoaded?.();
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (err) {
      setError(getUserFriendlyMessage(err, "We couldn't load the feature breakdown."));
    } finally {
      setLoading(false);
    }
  }, [days, onLoaded]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const getSourceName = (source: string) => getCostSourceDisplayName(source);

  const getSourceColor = (index: number) => {
    const colors = [
      'rgba(6, 182, 212, 0.9)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(249, 115, 22, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(59, 130, 246, 0.8)',
    ];
    return colors[index % colors.length];
  };

  if (loading) return <CostSkeleton variant="chart" />;

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6" role="alert">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>Error loading source data: {error}</span>
        </div>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Cost Breakdown by Feature</h3>
        <p className="text-muted-foreground">No activity in the selected window.</p>
      </div>
    );
  }

  const totalOps = sources.reduce((sum, s) => sum + s.operations, 0);

  const chartData = {
    labels: sources.map((s) => getSourceName(s.source)),
    datasets: [
      {
        data: sources.map((s) => s.cost),
        backgroundColor: sources.map((_, idx) => getSourceColor(idx)),
        borderColor: sources.map(() => 'rgba(255, 255, 255, 0.1)'),
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold' as const, size: 13 },
        formatter: (_value: number | string, context: { dataIndex: number }) => {
          const source = sources[context.dataIndex];
          return source.percentage >= 5 ? `${source.percentage.toFixed(0)}%` : '';
        },
        anchor: 'center' as const,
        align: 'center' as const,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(6, 182, 212, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: (context: { dataIndex: number }) => {
            const source = sources[context.dataIndex];
            const avg = source.operations > 0 ? source.cost / source.operations : 0;
            return [
              `${formatPercent(source.percentage)} of total`,
              `Cost: ${formatCost(source.cost)}`,
              `Operations: ${formatCount(source.operations)}`,
              `Avg / op: ${formatCost(avg)}`,
            ];
          },
        },
      },
    },
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Cost Breakdown by Feature</h3>

      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="relative h-[320px] flex items-center justify-center">
            <div className="w-full max-w-[320px] h-[320px] relative" ref={chartRef}>
              <Doughnut key={`chart-${sources.length}-${days}`} data={chartData} options={chartOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Total</span>
                <span className="text-2xl font-bold text-foreground">{formatCost(totalCost)}</span>
                <span className="text-xs text-muted-foreground">{formatCount(totalOps)} ops</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-2">
            {sources.map((source, idx) => (
              <div
                key={source.source}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-transparent hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded shrink-0"
                    style={{ backgroundColor: getSourceColor(idx) }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {getSourceName(source.source)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCount(source.operations)} {source.operations === 1 ? 'op' : 'ops'} · {formatPercent(source.percentage)}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground shrink-0 ml-3">
                  {formatCost(source.cost)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
