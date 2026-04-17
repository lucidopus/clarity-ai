'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';
import { AlertCircle } from 'lucide-react';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';
import { formatCost, formatCount } from '@/lib/cost/format';
import CostSkeleton from './shared/CostSkeleton';

try {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
} catch {
  // Already registered
}

interface ModelData {
  model: string;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costPerToken: number;
}

interface ModelComparisonChartProps {
  days: number;
}

export default function ModelComparisonChart({ days }: ModelComparisonChartProps) {
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/costs/models?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch model data');
      const data = await response.json();
      if (data.success) {
        setModels(data.models);
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (err) {
      setError(getUserFriendlyMessage(err, "We couldn't load the model comparison."));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  if (loading) return <CostSkeleton variant="chart" />;

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6" role="alert">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>Error loading model data: {error}</span>
        </div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Model Usage & Efficiency</h3>
        <p className="text-muted-foreground">No model activity in the selected window.</p>
      </div>
    );
  }

  const tokensChartData = {
    labels: models.map((m) => m.model.split('/').pop() || m.model),
    datasets: [
      {
        label: 'Input Tokens',
        data: models.map((m) => m.inputTokens),
        backgroundColor: 'rgba(251, 191, 36, 0.9)',
        borderColor: 'rgba(251, 191, 36, 1)',
        borderWidth: 1,
      },
      {
        label: 'Output Tokens',
        data: models.map((m) => m.outputTokens),
        backgroundColor: 'rgba(34, 197, 94, 0.9)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { color: 'rgba(107, 114, 128, 0.8)', padding: 15, usePointStyle: true },
      },
      datalabels: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(6, 182, 212, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            const value = context.parsed.y || 0;
            return `${context.dataset.label || 'Unknown'}: ${formatCount(value)}`;
          },
          afterLabel: (context: TooltipItem<'bar'>) => {
            const model = models[context.dataIndex];
            return `Total Cost: ${formatCost(model.totalCost)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
          callback: (value: number | string) =>
            typeof value === 'number' ? `${(value / 1000).toFixed(0)}k` : value,
        },
        title: { display: true, text: 'Tokens', color: 'rgba(107, 114, 128, 0.8)', font: { size: 12 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(107, 114, 128, 0.8)' },
      },
    },
    barPercentage: 1.0,
    categoryPercentage: 1.0,
  };

  return (
    <div className="space-y-4">
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Token Usage by Model</h3>
        <div className="h-[350px] mb-6">
          <Bar key={`chart-${models.length}-${days}`} data={tokensChartData} options={chartOptions} />
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="font-medium pb-3">Model</th>
                <th className="font-medium pb-3 text-right">Total Cost</th>
                <th className="font-medium pb-3 text-right">Input</th>
                <th className="font-medium pb-3 text-right">Output</th>
                <th className="font-medium pb-3 text-right">Cost / 1K tokens</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model, idx) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-3 text-foreground">{model.model}</td>
                  <td className="py-3 text-right font-medium text-foreground">
                    {formatCost(model.totalCost)}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {formatCount(model.inputTokens)}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {formatCount(model.outputTokens)}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {model.totalTokens > 0 ? formatCost(model.costPerToken * 1000) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {models.map((model, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-background/50 border border-border">
              <p className="text-sm font-medium text-foreground break-all">{model.model}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Cost: <span className="text-foreground font-medium">{formatCost(model.totalCost)}</span></div>
                <div>Cost/1K: <span className="text-foreground">{model.totalTokens > 0 ? formatCost(model.costPerToken * 1000) : '—'}</span></div>
                <div>In: <span className="text-foreground">{formatCount(model.inputTokens)}</span></div>
                <div>Out: <span className="text-foreground">{formatCount(model.outputTokens)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
