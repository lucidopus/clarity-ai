'use client';

import { useCallback, useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);
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

  const chartData = {
    labels: trends.map((t) => {
      const date = new Date(t.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: 'Input Tokens',
        data: trends.map((t) => t.inputTokens),
        borderColor: 'rgba(156, 163, 175, 0.6)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Output Tokens',
        data: trends.map((t) => t.outputTokens),
        borderColor: 'rgba(6, 182, 212, 0.9)',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: '7-Day Avg Cost',
        data: trends.map((t) => t.movingAverage7d * 1000),
        borderColor: 'rgba(239, 68, 68, 0.6)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
        yAxisID: 'y1',
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
        labels: { color: 'rgba(107, 114, 128, 0.8)', usePointStyle: true, padding: 15 },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
            return `7-Day Avg: ${formatCost(trend.movingAverage7d)}`;
          },
          afterBody: (context: Array<{ dataIndex: number }>) => {
            const trend = trends[context[0].dataIndex];
            return [
              `Total: ${formatCount(trend.totalTokens)} tokens`,
              `Cost: ${formatCost(trend.cost)}`,
              trend.isAnomaly ? 'Anomaly detected (>3σ above mean)' : '',
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
        beginAtZero: true,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
          callback: (value: number | string) =>
            typeof value === 'number' ? `${(value / 1000).toFixed(0)}K` : value,
        },
        title: { display: true, text: 'Tokens', color: 'rgba(107, 114, 128, 0.8)' },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: {
          color: 'rgba(239, 68, 68, 0.6)',
          callback: (value: number | string) =>
            typeof value === 'number' ? `$${(value / 1000).toFixed(2)}` : value,
        },
        title: { display: true, text: 'Cost (scaled)', color: 'rgba(239, 68, 68, 0.6)' },
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(107, 114, 128, 0.8)', maxRotation: 45, minRotation: 0 },
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
          <Stat label="Total Tokens" value={`${(totalTokens / 1_000_000).toFixed(2)}M`} />
          <Stat label="Avg Daily Cost" value={formatCost(avgDailyCost)} />
          <Stat
            label="Anomalies"
            value={String(anomalyCount)}
            helper={anomalyCount > 0 ? `Days >3σ above mean` : 'None detected'}
          />
        </div>

        <div className="h-[350px]">
          <Line data={chartData} options={chartOptions} />
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
