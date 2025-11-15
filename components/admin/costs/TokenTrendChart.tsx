'use client';

import { useEffect, useState } from 'react';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface TrendData {
  date: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  movingAverage7d: number;
  isAnomaly: boolean;
}

export default function TokenTrendChart() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchTrends();
  }, [days]);

  const fetchTrends = async () => {
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
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <span>Error loading trend data: {error}</span>
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Token Consumption Trend</h3>
        <p className="text-muted-foreground">No trend data available</p>
      </div>
    );
  }

  // Chart data
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
        data: trends.map((t) => t.movingAverage7d * 1000), // Scale for visibility
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
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgba(107, 114, 128, 0.8)',
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(6, 182, 212, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const trend = trends[context.dataIndex];
            if (context.datasetIndex === 0) {
              return `Input: ${trend.inputTokens.toLocaleString()} tokens`;
            } else if (context.datasetIndex === 1) {
              return `Output: ${trend.outputTokens.toLocaleString()} tokens`;
            } else {
              return `7-Day Avg: ${formatCost(trend.movingAverage7d)}`;
            }
          },
          afterBody: (context: any) => {
            const trend = trends[context[0].dataIndex];
            return [
              `Total: ${trend.totalTokens.toLocaleString()} tokens`,
              `Cost: ${formatCost(trend.cost)}`,
              trend.isAnomaly ? '⚠️ Anomaly detected' : '',
            ];
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
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
          callback: (value: any) => `${(value / 1000).toFixed(0)}K`,
        },
        title: {
          display: true,
          text: 'Tokens',
          color: 'rgba(107, 114, 128, 0.8)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'rgba(239, 68, 68, 0.6)',
          callback: (value: any) => `$${(value / 1000).toFixed(2)}`,
        },
        title: {
          display: true,
          text: 'Cost (scaled)',
          color: 'rgba(239, 68, 68, 0.6)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
          maxRotation: 45,
          minRotation: 0,
        },
      },
    },
  };

  // Calculate stats
  const totalTokens = trends.reduce((sum, t) => sum + t.totalTokens, 0);
  const avgDailyCost = trends.reduce((sum, t) => sum + t.cost, 0) / trends.length;
  const anomalyCount = trends.filter((t) => t.isAnomaly).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Token Consumption Trend</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDays(7)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              days === 7 ? 'bg-accent text-white' : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              days === 30 ? 'bg-accent text-white' : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            30d
          </button>
          <button
            onClick={() => setDays(90)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              days === 90 ? 'bg-accent text-white' : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            90d
          </button>
        </div>
      </div>

      <div className="bg-card-bg border border-border rounded-xl p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-background/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
            <p className="text-xl font-bold text-foreground">{(totalTokens / 1000000).toFixed(2)}M</p>
          </div>
          <div className="bg-background/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Daily Cost</p>
            <p className="text-xl font-bold text-foreground">{formatCost(avgDailyCost)}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Anomalies</p>
            <p className="text-xl font-bold text-foreground">{anomalyCount}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[350px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
