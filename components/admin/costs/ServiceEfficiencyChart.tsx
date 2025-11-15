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
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ServiceData {
  service: string;
  totalCost: number;
  operations: number;
  avgCostPerOperation: number;
  successRate: number;
  efficiencyScore: number;
}

export default function ServiceEfficiencyChart() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/costs/services');

      if (!response.ok) {
        throw new Error('Failed to fetch service data');
      }

      const data = await response.json();
      if (data.success) {
        setServices(data.services);
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

  const getServiceName = (service: string) => {
    const names: Record<string, string> = {
      groq_llm: 'Groq LLM',
      apify_transcript: 'Apify Transcript',
    };
    return names[service] || service;
  };

  const getEfficiencyIcon = (score: number) => {
    if (score >= 95) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (score >= 80) return <Minus className="w-4 h-4 text-yellow-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getEfficiencyColor = (score: number) => {
    if (score >= 95) return 'text-green-500';
    if (score >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

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
          <span>Error loading service data: {error}</span>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Service Efficiency</h3>
        <p className="text-muted-foreground">No service data available</p>
      </div>
    );
  }

  // Chart data
  const chartData = {
    labels: services.map((s) => getServiceName(s.service)),
    datasets: [
      {
        label: 'Avg Cost per Operation ($)',
        data: services.map((s) => s.avgCostPerOperation),
        backgroundColor: 'rgba(6, 182, 212, 0.9)',
        borderColor: 'rgba(6, 182, 212, 1)',
        borderWidth: 1,
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
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(6, 182, 212, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const service = services[context.dataIndex];
            return [
              `Avg Cost/Op: ${formatCost(service.avgCostPerOperation)}`,
              `Total Cost: ${formatCost(service.totalCost)}`,
              `Operations: ${service.operations.toLocaleString()}`,
              `Success Rate: ${service.successRate.toFixed(1)}%`,
              `Efficiency: ${service.efficiencyScore.toFixed(1)}/100`,
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
          callback: (value: any) => `$${value.toFixed(4)}`,
        },
        title: {
          display: true,
          text: 'Average Cost per Operation',
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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Service Efficiency Comparison</h3>

      <div className="bg-card-bg border border-border rounded-xl p-6">
        {/* Chart */}
        <div className="h-[300px] mb-6">
          <Bar data={chartData} options={chartOptions} />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-sm font-medium text-muted-foreground pb-3">Service</th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-3">Total Cost</th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-3">Operations</th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-3">Avg Cost/Op</th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-3">Success Rate</th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-3">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, idx) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-3 text-sm text-foreground font-medium">{getServiceName(service.service)}</td>
                  <td className="py-3 text-sm text-right text-foreground">
                    {formatCost(service.totalCost)}
                  </td>
                  <td className="py-3 text-sm text-right text-muted-foreground">
                    {service.operations.toLocaleString()}
                  </td>
                  <td className="py-3 text-sm text-right text-muted-foreground">
                    {formatCost(service.avgCostPerOperation)}
                  </td>
                  <td className="py-3 text-sm text-right text-muted-foreground">
                    {service.successRate.toFixed(1)}%
                  </td>
                  <td className="py-3 text-sm text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {getEfficiencyIcon(service.efficiencyScore)}
                      <span className={`font-medium ${getEfficiencyColor(service.efficiencyScore)}`}>
                        {service.efficiencyScore.toFixed(1)}
                      </span>
                    </div>
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
