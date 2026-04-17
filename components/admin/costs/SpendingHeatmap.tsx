'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';
import { formatCost } from '@/lib/cost/format';
import CostSkeleton from './shared/CostSkeleton';

interface HeatmapCell {
  date: string;
  dayOfWeek: number;
  cost: number;
  intensity: number;
}

interface HeatmapStats {
  minCost: number;
  maxCost: number;
  avgCost: number;
  trendIndicator: 'up' | 'down' | 'stable';
}

interface SpendingHeatmapProps {
  days: number;
}

export default function SpendingHeatmap({ days }: SpendingHeatmapProps) {
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [stats, setStats] = useState<HeatmapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmap = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/costs/heatmap?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch heatmap data');
      const data = await response.json();
      if (data.success) {
        setHeatmap(data.heatmap);
        setStats(data.stats);
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (err) {
      setError(getUserFriendlyMessage(err, "We couldn't load the spending heatmap."));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (intensity < 0.25) return 'bg-accent/20';
    if (intensity < 0.5) return 'bg-accent/40';
    if (intensity < 0.75) return 'bg-accent/60';
    return 'bg-accent/90';
  };

  const getDayLabel = (dayOfWeek: number) =>
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-red-500" aria-hidden="true" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-green-500" aria-hidden="true" />;
    return <Minus className="w-4 h-4 text-muted-foreground" aria-hidden="true" />;
  };

  const getTrendText = (trend: string) => {
    if (trend === 'up') return 'Trending up';
    if (trend === 'down') return 'Trending down';
    return 'Stable';
  };

  if (loading) return <CostSkeleton variant="chart" />;

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6" role="alert">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>Error loading heatmap: {error}</span>
        </div>
      </div>
    );
  }

  if (heatmap.length === 0 || !stats) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Daily Spending Heatmap</h3>
        <p className="text-muted-foreground">No spend recorded in the selected window.</p>
      </div>
    );
  }

  const weeks: HeatmapCell[][] = [];
  let currentWeek: HeatmapCell[] = [];
  const firstDayOfWeek = heatmap[0]?.dayOfWeek || 0;
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: '', dayOfWeek: i, cost: 0, intensity: 0 });
  }
  heatmap.forEach((cell, idx) => {
    currentWeek.push(cell);
    if (cell.dayOfWeek === 6 || idx === heatmap.length - 1) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', dayOfWeek: currentWeek.length, cost: 0, intensity: 0 });
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Daily Spending Heatmap</h3>

      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Min Daily" value={formatCost(stats.minCost)} />
          <Stat label="Avg Daily" value={formatCost(stats.avgCost)} />
          <Stat label="Max Daily" value={formatCost(stats.maxCost)} />
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Trend</p>
            <div className="flex items-center space-x-1">
              {getTrendIcon(stats.trendIndicator)}
              <span className="text-xs text-foreground">{getTrendText(stats.trendIndicator)}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex mb-2">
              <div className="w-12"></div>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div key={day} className="w-10 text-center text-xs text-muted-foreground">
                  {getDayLabel(day)}
                </div>
              ))}
            </div>

            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex mb-1 items-center">
                <div className="w-12 text-xs text-muted-foreground pr-2 text-right">
                  {weekIdx === 0 ? 'Wk 1' : weekIdx === weeks.length - 1 ? 'Latest' : ''}
                </div>
                {week.map((cell, cellIdx) => (
                  <div
                    key={cellIdx}
                    className="group relative"
                    style={{ width: '40px', height: '40px', padding: '2px' }}
                  >
                    {cell.date ? (
                      <>
                        <div
                          role="img"
                          aria-label={`${new Date(cell.date).toLocaleDateString()}: ${formatCost(cell.cost)}`}
                          tabIndex={0}
                          className={`w-full h-full rounded ${getIntensityColor(cell.intensity)} transition-all duration-200 hover:ring-2 hover:ring-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer`}
                        />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                          <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                            <p className="font-medium">{new Date(cell.date).toLocaleDateString()}</p>
                            <p>{formatCost(cell.cost)}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-transparent"></div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div className="flex items-center justify-end space-x-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex space-x-1">
                {[0, 0.25, 0.5, 0.75, 1].map((intensity, idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded ${getIntensityColor(intensity)}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/50 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
