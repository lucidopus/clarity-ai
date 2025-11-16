'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface ServiceCost {
  service: string;
  totalCost: number;
  percentage: number;
}

export default function CostDriversTable() {
  const [drivers, setDrivers] = useState<ServiceCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCostDrivers();
  }, []);

  const fetchCostDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/costs/by-source');

      if (!response.ok) {
        throw new Error('Failed to fetch cost drivers');
      }

      const data = await response.json();
      if (data.success && data.sources) {
        const costData = data.sources.map((item: { source: string; cost: number; percentage: number }) => ({
          service: item.source,
          totalCost: item.cost,
          percentage: item.percentage,
        }));

        // Already sorted by cost from API, but ensure it here
        costData.sort((a: ServiceCost, b: ServiceCost) => b.totalCost - a.totalCost);
        setDrivers(costData);
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
  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      learning_material_generation: 'Video Processing',
      learning_chatbot: 'Learning Chatbot',
      challenge_chatbot: 'Challenge Chatbot',
      groq_llm: 'Groq LLM',
      apify_transcript: 'Apify Transcript',
    };
    return labels[source] || source;
  };

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <span>Error loading cost drivers: {error}</span>
        </div>
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Cost Drivers</h3>
        <p className="text-muted-foreground">No cost data available</p>
      </div>
    );
  }

  const totalCost = drivers.reduce((sum, d) => sum + d.totalCost, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Where Your Money Goes</h3>

      <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
        <div className="space-y-0">
          {drivers.map((driver, index) => (
            <div key={driver.service} className={`px-6 py-4 ${index !== drivers.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground">{getSourceLabel(driver.service)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{formatCost(driver.totalCost)}</p>
                  <p className="text-sm text-accent font-medium">{typeof driver.percentage === 'number' ? driver.percentage.toFixed(1) : driver.percentage}%</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{
                    width: `${(driver.totalCost / totalCost) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div className="px-6 py-4 bg-background/50 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">Total Cost</p>
            <p className="text-lg font-bold text-accent">{formatCost(totalCost)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
