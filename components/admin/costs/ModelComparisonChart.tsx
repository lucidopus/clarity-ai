'use client';

import { useEffect, useState, useRef } from 'react';
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

// Register Chart.js plugins and components once - safe to call multiple times
try {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
} catch {
  // Already registered, ignore
}

interface ModelData {
  model: string;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costPerToken: number;
}

export default function ModelComparisonChart() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/costs/models');

      if (!response.ok) {
        throw new Error('Failed to fetch model data');
      }

      const data = await response.json();
      if (data.success) {
        setModels(data.models);
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
        <div className="h-64 flex items-center justify-center">
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
          <span>Error loading model data: {error}</span>
        </div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Model Usage & Efficiency</h3>
        <p className="text-muted-foreground">No model data available</p>
      </div>
    );
  }

  // Chart data - Input and Output Tokens side-by-side
  const tokensChartData = {
    labels: models.map((m) => m.model.split('/').pop() || m.model),
    datasets: [
      {
        label: 'Input Tokens',
        data: models.map((m) => m.inputTokens),
        backgroundColor: 'rgba(251, 191, 36, 0.9)', // Vibrant yellow
        borderColor: 'rgba(251, 191, 36, 1)',
        borderWidth: 1,
      },
      {
        label: 'Output Tokens',
        data: models.map((m) => m.outputTokens),
        backgroundColor: 'rgba(34, 197, 94, 0.9)', // Vibrant green
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
        labels: {
          color: 'rgba(107, 114, 128, 0.8)',
          padding: 15,
          usePointStyle: true,
        },
      },
      datalabels: {
        display: false,
      },
      title: {
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
          label: (context: TooltipItem<'bar'>) => {
            const value = context.parsed.y || 0;
            return `${context.dataset.label || 'Unknown'}: ${value.toLocaleString()}`;
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
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
          callback: (value: number | string) => typeof value === 'number' ? `${(value / 1000).toFixed(0)}k` : value,
        },
        title: {
          display: true,
          text: 'Tokens',
          color: 'rgba(107, 114, 128, 0.8)',
          font: {
            size: 12,
          },
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
    barPercentage: 1.0,
    categoryPercentage: 1.0,
  };

  return (
    <div className="space-y-4 my-10">
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Token Usage by Model</h3>
        <div className="h-[350px] mb-6" ref={chartRef}>
          <Bar key={`chart-${models.length}`} data={tokensChartData} options={chartOptions} />
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-sm font-medium text-muted-foreground pb-3">Model</th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-3">Total Cost</th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-3">Input Tokens</th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-3">Output Tokens</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model, idx) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-3 text-sm text-foreground">{model.model}</td>
                  <td className="py-3 text-sm text-right font-medium text-foreground">
                    {formatCost(model.totalCost)}
                  </td>
                  <td className="py-3 text-sm text-right text-muted-foreground">
                    {model.inputTokens.toLocaleString()}
                  </td>
                  <td className="py-3 text-sm text-right text-muted-foreground">
                    {model.outputTokens.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
