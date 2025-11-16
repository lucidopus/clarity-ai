'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Activity, AlertCircle } from 'lucide-react';

interface ServiceSummary {
  service: string;
  totalCost: number;
  operations: number;
  avgCostPerOperation: number;
}

interface CostSummary {
  totalCost: number;
  totalOperations: number;
  avgCostPerOperation: number;
  byService: ServiceSummary[];
}

export default function CostSummaryCards() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/costs/summary');

      if (!response.ok) {
        throw new Error('Failed to fetch cost summary');
      }

      const data = await response.json();
      if (data.success) {
        setSummary(data.summary);
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const getServiceIcon = (service: string) => {
    if (service.includes('llm')) return <Activity className="w-5 h-5" />;
    if (service.includes('transcript')) return <TrendingUp className="w-5 h-5" />;
    return <DollarSign className="w-5 h-5" />;
  };

  const getServiceName = (service: string) => {
    const names: Record<string, string> = {
      groq_llm: 'Groq LLM',
      apify_transcript: 'Apify Transcript',
    };
    return names[service] || service;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card-bg border border-border rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-secondary/20 rounded mb-2 w-24"></div>
            <div className="h-8 bg-secondary/20 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <span>Error loading cost summary: {error}</span>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-4 my-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Cost Card */}
        <div className="bg-card-bg border border-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Cost</p>
              <p className="text-3xl font-bold text-foreground">{formatCost(summary.totalCost)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {summary.totalOperations.toLocaleString()} operations
              </p>
            </div>
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
          </div>
        </div>

        {/* Average Cost Card */}
        <div className="bg-card-bg border border-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Cost/Op</p>
              <p className="text-3xl font-bold text-foreground">{formatCost(summary.avgCostPerOperation)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Per operation
              </p>
            </div>
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
          </div>
        </div>

        {/* Service Cards */}
        {summary.byService.map((service) => (
          <div
            key={service.service}
            className="bg-card-bg border border-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{getServiceName(service.service)}</p>
                <p className="text-2xl font-bold text-foreground">{formatCost(service.totalCost)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {service.operations.toLocaleString()} ops • {formatCost(service.avgCostPerOperation)}/op
                </p>
              </div>
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <span className="text-accent">{getServiceIcon(service.service)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
