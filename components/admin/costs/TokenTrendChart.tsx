'use client';

import { useCallback, useEffect, useState } from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { AlertCircle } from 'lucide-react';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';
import { formatCost, formatCount } from '@/lib/cost/format';
import CostSkeleton from './shared/CostSkeleton';

try {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
  );
} catch {
  // Already registered
}

interface TrendData {
  date: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  movingAverage7d: number;
  isAnomaly: boolean;
}

interface TokenTrendChartProps {
  days: number;
}

// Compact K/M formatter for the token axis — keeps ticks legible regardless of
// whether the window is a slow day (~1K) or a heavy batch (~5M).
function formatTokensShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toString();
}

export default function TokenTrendChart({ days }: TokenTrendChartProps) {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/costs/tokens-trend?days=${days}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trend data');
      }
      const data = await response.json();
      if (data.success) {
        setTrends(data.trends);
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (err) {
      setError(getUserFriendlyMessage(err, "We couldn't load token trend data."));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  if (loading) return <CostSkeleton variant="chart" />;

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6" role="alert">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>Error loading trend data: {error}</span>
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Token Consumption Trend</h3>
        <p className="text-muted-foreground">No trend data available in the selected window.</p>
      </div>
    );
  }

  // Mixed chart: stacked bars for input/output tokens (left axis, real token
  // counts) + a line for 7-day moving avg cost (right axis, real USD). No
  // scaling hacks — each series renders in its native units so tick labels are
  // always meaningful, including sub-cent days (uses tiered formatCost).
  const chartData = {
    labels: trends.map((t) => {
      const date = new Date(t.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Input Tokens',
        data: trends.map((t) => t.inputTokens),
        backgroundColor: 'rgba(148, 163, 184, 0.55)',
        borderColor: 'rgba(148, 163, 184, 0.9)',
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'tokens',
        order: 2,
      },
      {
        type: 'bar' as const,
        label: 'Output Tokens',
        data: trends.map((t) => t.outputTokens),
        backgroundColor: 'rgba(6, 182, 212, 0.7)',
        borderColor: 'rgba(6, 182, 212, 1)',
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'tokens',
        order: 2,
      },
      {
        type: 'line' as const,
        label: '7-Day Avg Cost',
        data: trends.map((t) => t.movingAverage7d),
        borderColor: 'rgba(244, 114, 182, 0.95)',
        backgroundColor: 'rgba(244, 114, 182, 0.15)',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: trends.map((t) => (t.isAnomaly ? 5 : 2)),
        pointHoverRadius: trends.map((t) => (t.isAnomaly ? 7 : 4)),
        pointBackgroundColor: trends.map((t) =>
          t.isAnomaly ? 'rgba(239, 68, 68, 1)' : 'rgba(244, 114, 182, 1)',
        ),
        pointBorderColor: trends.map((t) =>
          t.isAnomaly ? 'rgba(239, 68, 68, 1)' : 'rgba(244, 114, 182, 1)',
        ),
        yAxisID: 'y1',
        order: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { color: 'rgba(107, 114, 128, 0.9)', usePointStyle: true, padding: 16 },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(6, 182, 212, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: (context: { dataIndex: number; datasetIndex: number }) => {
            const trend = trends[context.dataIndex];
            if (context.datasetIndex === 0) return `Input: ${formatCount(trend.inputTokens)} tokens`;
            if (context.datasetIndex === 1) return `Output: ${formatCount(trend.outputTokens)} tokens`;
            return `7-Day Avg Cost: ${formatCost(trend.movingAverage7d)}`;
          },
          afterBody: (context: Array<{ dataIndex: number }>) => {
            const trend = trends[context[0].dataIndex];
            return [
              `Total: ${formatCount(trend.totalTokens)} tokens`,
              `Daily Cost: ${formatCost(trend.cost)}`,
              trend.isAnomaly ? '⚠ Anomaly (>3σ above 7-day mean)' : '',
            ].filter(Boolean);
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        stacked: true,
        beginAtZero: true,
        grid: { color: 'rgba(156, 163, 175, 0.12)' },
        ticks: {
          color: 'rgba(107, 114, 128, 0.9)',
          callback: (value: number | string) =>
            typeof value === 'number' ? formatTokensShort(value) : value,
        },
        title: { display: true, text: 'Tokens', color: 'rgba(107, 114, 128, 0.9)' },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: {
          color: 'rgba(244, 114, 182, 0.95)',
          callback: (value: number | string) =>
            typeof value === 'number' ? formatCost(value) : value,
        },
        title: { display: true, text: 'Cost (USD)', color: 'rgba(244, 114, 182, 0.95)' },
      },
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: 'rgba(107, 114, 128, 0.9)', maxRotation: 45, minRotation: 0 },
      },
    },
  };

  const totalTokens = trends.reduce((sum, t) => sum + t.totalTokens, 0);
  const avgDailyCost = trends.length > 0 ? trends.reduce((sum, t) => sum + t.cost, 0) / trends.length : 0;
  const anomalyCount = trends.filter((t) => t.isAnomaly).length;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Token Consumption Trend</h3>

      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Stat label="Total Tokens" value={formatTokensShort(totalTokens)} />
          <Stat label="Avg Daily Cost" value={formatCost(avgDailyCost)} />
          <Stat
            label="Anomalies"
            value={String(anomalyCount)}
            helper={anomalyCount > 0 ? `Days >3σ above mean` : 'None detected'}
          />
        </div>

        <div className="h-[360px]">
          <Chart type="bar" data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="bg-background/50 rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {helper && <p className="text-xs text-muted-foreground mt-1">{helper}</p>}
    </div>
  );
}
