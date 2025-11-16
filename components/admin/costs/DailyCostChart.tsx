'use client';

import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { AlertCircle } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TrendData {
  date: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  movingAverage7d: number;
  isAnomaly: boolean;
}

export default function DailyCostChart() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <h3 className="text-lg font-semibold text-foreground mb-4">Daily Cost Trend</h3>
        <p className="text-muted-foreground">No trend data available</p>
      </div>
    );
  }

  // Calculate metrics
  const totalCost = trends.reduce((sum, t) => sum + t.cost, 0);
  const avgDailyCost = totalCost / trends.length;
  const maxDailyCost = Math.max(...trends.map(t => t.cost));
  const costPerDay = avgDailyCost;
  const projectedMonthlyCost = avgDailyCost * 30;

  // Simple bar chart with single metric (total cost per day)
  const chartData = {
    labels: trends.map((t) => {
      const date = new Date(t.date + 'T00:00:00Z');
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: 'Daily Cost',
        data: trends.map((t) => t.cost),
        backgroundColor: 'rgba(6, 182, 212, 0.8)', // Vibrant cyan
        borderColor: 'rgba(6, 182, 212, 1)',
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(6, 182, 212, 1)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
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
            const trend = trends[context.dataIndex];
            return [
              `Cost: ${formatCost(trend.cost)}`,
              `Tokens: ${trend.totalTokens.toLocaleString()}`,
              `Input: ${trend.inputTokens.toLocaleString()} | Output: ${trend.outputTokens.toLocaleString()}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
          callback: (value: number | string) => typeof value === 'number' ? `$${value.toFixed(4)}` : value,
        },
        title: {
          display: true,
          text: 'Cost ($)',
          color: 'rgba(107, 114, 128, 0.8)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Daily Cost Trend</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDays(7)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              days === 7
                ? 'bg-accent text-white'
                : 'bg-background border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              days === 30
                ? 'bg-accent text-white'
                : 'bg-background border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            30d
          </button>
          <button
            onClick={() => setDays(90)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              days === 90
                ? 'bg-accent text-white'
                : 'bg-background border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            90d
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card-bg border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Total Cost</p>
          <p className="text-2xl font-bold text-foreground">{formatCost(totalCost)}</p>
          <p className="text-xs text-muted-foreground mt-2">{trends.length} days</p>
        </div>

        <div className="bg-card-bg border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Avg Daily Cost</p>
          <p className="text-2xl font-bold text-foreground">{formatCost(costPerDay)}</p>
          <p className="text-xs text-muted-foreground mt-2">~{formatCost(projectedMonthlyCost)}/month</p>
        </div>

        <div className="bg-card-bg border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Peak Daily Cost</p>
          <p className="text-2xl font-bold text-foreground">{formatCost(maxDailyCost)}</p>
          <p className="text-xs text-muted-foreground mt-2">Highest single day</p>
        </div>

        <div className="bg-card-bg border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Total Tokens</p>
          <p className="text-2xl font-bold text-foreground">{(trends.reduce((sum, t) => sum + t.totalTokens, 0) / 1000).toFixed(1)}K</p>
          <p className="text-xs text-muted-foreground mt-2">Input + Output</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="h-[300px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
