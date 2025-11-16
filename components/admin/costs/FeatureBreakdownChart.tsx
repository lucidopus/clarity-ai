'use client';

import { useEffect, useState, useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AlertCircle } from 'lucide-react';

// Register Chart.js plugins and components once - safe to call multiple times
try {
  ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);
} catch {
  // Already registered, ignore
}

interface SourceData {
  source: string;
  cost: number;
  percentage: number;
}

export default function FeatureBreakdownChart() {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/costs/by-source');

      if (!response.ok) {
        throw new Error('Failed to fetch source data');
      }

      const data = await response.json();
      if (data.success) {
        setSources(data.sources);
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

  const getSourceName = (source: string) => {
    const names: Record<string, string> = {
      learning_material_generation: 'Learning Material Generation',
      learning_chatbot: 'Learning Chatbot',
      challenge_chatbot: 'Challenge Chatbot',
    };
    return names[source] || source;
  };

  const getSourceColor = (index: number) => {
    const colors = [
      'rgba(6, 182, 212, 0.9)',   // Vibrant cyan (primary accent)
      'rgba(139, 92, 246, 0.8)',  // Vibrant purple
      'rgba(34, 197, 94, 0.8)',   // Vibrant green
      'rgba(249, 115, 22, 0.8)',  // Vibrant orange
      'rgba(236, 72, 153, 0.8)',  // Vibrant pink
      'rgba(59, 130, 246, 0.8)',  // Vibrant blue
    ];
    return colors[index % colors.length];
  };

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
          <span>Error loading source data: {error}</span>
        </div>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Cost Breakdown by Feature</h3>
        <p className="text-muted-foreground">No source data available</p>
      </div>
    );
  }

  // Chart data
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
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        color: '#fff',
        font: {
          weight: 'bold' as const,
          size: 14,
        },
        formatter: (_value: number | string, context: { dataIndex: number }) => {
          const source = sources[context.dataIndex];
          return `${source.percentage.toFixed(1)}%`;
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
            return [
              `${source.percentage.toFixed(1)}% of total`,
              `Cost: ${formatCost(source.cost)}`,
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart */}
          <div className="h-[400px] flex items-center justify-center">
            <div className="w-[350px] h-[350px]" ref={chartRef}>
              <Doughnut key={`chart-${sources.length}`} data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Legend & Stats */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-3">
              {sources.map((source, idx) => (
                <div key={source.source} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: getSourceColor(idx) }}
                    ></div>
                    <p className="text-sm font-medium text-foreground">{getSourceName(source.source)}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatCost(source.cost)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
