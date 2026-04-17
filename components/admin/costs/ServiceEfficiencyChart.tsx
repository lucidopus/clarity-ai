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
} from 'chart.js';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getServiceLabel } from '@/lib/service-utils';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';
import {
  classifySuccessRate,
  successTierLabel,
  formatCost,
  formatCount,
  formatPercent,
} from '@/lib/cost/format';
import CostSkeleton from './shared/CostSkeleton';

try {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
} catch {
  // Already registered
}

interface ServiceData {
  service: string;
  totalCost: number;
  wastedCost: number;
  successRate: number;
  operations: number;
}

interface ServiceEfficiencyChartProps {
  days: number;
}

export default function ServiceEfficiencyChart({ days }: ServiceEfficiencyChartProps) {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/costs/services?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch service data');
      const data = await response.json();
      if (data.success) {
        setServices(data.services);
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (err) {
      setError(getUserFriendlyMessage(err, "We couldn't load service efficiency data."));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  if (loading) return <CostSkeleton variant="table" rows={5} />;

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6" role="alert">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>Error loading service data: {error}</span>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Service Health & Reliability</h3>
        <p className="text-muted-foreground">No service activity in the selected window.</p>
      </div>
    );
  }

  const tierIcon = (rate: number) => {
    const tier = classifySuccessRate(rate);
    if (tier === 'healthy') return <TrendingUp className="w-4 h-4 text-green-500" aria-hidden="true" />;
    if (tier === 'degraded') return <Minus className="w-4 h-4 text-amber-500" aria-hidden="true" />;
    return <TrendingDown className="w-4 h-4 text-red-500" aria-hidden="true" />;
  };

  const tierTextColor = (rate: number) => {
    const tier = classifySuccessRate(rate);
    if (tier === 'healthy') return 'text-green-600 dark:text-green-400';
    if (tier === 'degraded') return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const chartData = {
    labels: services.map((s) => getServiceLabel(s.service)),
    datasets: [
      {
        label: 'Success Rate',
        data: services.map((s) => s.successRate),
        backgroundColor: services.map((s) => {
          const tier = classifySuccessRate(s.successRate);
          if (tier === 'healthy') return 'rgba(34, 197, 94, 0.85)';
          if (tier === 'degraded') return 'rgba(245, 158, 11, 0.85)';
          return 'rgba(239, 68, 68, 0.85)';
        }),
        borderColor: 'rgba(0, 0, 0, 0.05)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(6, 182, 212, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: (context: { dataIndex: number }) => {
            const service = services[context.dataIndex];
            return [
              `${successTierLabel(classifySuccessRate(service.successRate))} · ${formatPercent(service.successRate)}`,
              `Operations: ${formatCount(service.operations)}`,
              `Total Cost: ${formatCost(service.totalCost)}`,
              service.wastedCost > 0 ? `Wasted: ${formatCost(service.wastedCost)}` : '',
            ].filter(Boolean);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: 'rgba(156, 163, 175, 0.08)' },
        ticks: {
          color: 'rgba(107, 114, 128, 0.7)',
          callback: (value: number | string) =>
            typeof value === 'number' ? `${value.toFixed(0)}` : value,
        },
        title: {
          display: true,
          text: 'Success Rate (%)',
          color: 'rgba(107, 114, 128, 0.8)',
          font: { size: 12 },
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(107, 114, 128, 0.7)' },
      },
    },
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Service Health & Reliability</h3>

      <div className="bg-card-bg border border-border rounded-xl p-6 space-y-6">
        <div className="h-[300px]">
          <Bar key={`chart-${services.length}-${days}`} data={chartData} options={chartOptions} />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="font-medium pb-3">Service</th>
                <th className="font-medium pb-3 text-right">Operations</th>
                <th className="font-medium pb-3 text-right">Total Cost</th>
                <th className="font-medium pb-3 text-right">Wasted</th>
                <th className="font-medium pb-3 text-right">Avg / Op</th>
                <th className="font-medium pb-3 text-right">Health</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, idx) => {
                const avgPerOp = service.operations > 0 ? service.totalCost / service.operations : 0;
                const tier = classifySuccessRate(service.successRate);
                return (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="py-3 text-foreground font-medium">
                      {getServiceLabel(service.service)}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {formatCount(service.operations)}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {formatCost(service.totalCost)}
                    </td>
                    <td className="py-3 text-right">
                      {service.wastedCost > 0 ? (
                        <span className="text-red-500 font-medium">{formatCost(service.wastedCost)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {service.operations > 0 ? formatCost(avgPerOp) : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {tierIcon(service.successRate)}
                        <span className={`font-medium ${tierTextColor(service.successRate)}`}>
                          {successTierLabel(tier)} · {formatPercent(service.successRate)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {services.map((service, idx) => {
            const avgPerOp = service.operations > 0 ? service.totalCost / service.operations : 0;
            const tier = classifySuccessRate(service.successRate);
            return (
              <div key={idx} className="p-3 rounded-lg bg-background/50 border border-border">
                <div className="flex justify-between items-start gap-3">
                  <p className="text-sm font-medium text-foreground">{getServiceLabel(service.service)}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {tierIcon(service.successRate)}
                    <span className={`text-xs font-medium ${tierTextColor(service.successRate)}`}>
                      {successTierLabel(tier)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Ops: <span className="text-foreground">{formatCount(service.operations)}</span></div>
                  <div>Total: <span className="text-foreground">{formatCost(service.totalCost)}</span></div>
                  <div>Avg/op: <span className="text-foreground">{service.operations > 0 ? formatCost(avgPerOp) : '—'}</span></div>
                  <div>
                    Wasted:{' '}
                    {service.wastedCost > 0 ? (
                      <span className="text-red-500 font-medium">{formatCost(service.wastedCost)}</span>
                    ) : (
                      <span className="text-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
