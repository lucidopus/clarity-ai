'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

export default function SpendingHeatmap() {
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [stats, setStats] = useState<HeatmapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchHeatmap();
  }, [days]);

  const fetchHeatmap = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/costs/heatmap?days=${days}`);

      if (!response.ok) {
        throw new Error('Failed to fetch heatmap data');
      }

      const data = await response.json();
      if (data.success) {
        setHeatmap(data.heatmap);
        setStats(data.stats);
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

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (intensity < 0.25) return 'bg-accent/20';
    if (intensity < 0.5) return 'bg-accent/40';
    if (intensity < 0.75) return 'bg-accent/60';
    return 'bg-accent/90';
  };

  const getDayLabel = (dayOfWeek: number) => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return labels[dayOfWeek];
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendText = (trend: string) => {
    if (trend === 'up') return 'Spending trending up';
    if (trend === 'down') return 'Spending trending down';
    return 'Spending stable';
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
          <span>Error loading heatmap: {error}</span>
        </div>
      </div>
    );
  }

  if (heatmap.length === 0 || !stats) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Daily Spending Heatmap</h3>
        <p className="text-muted-foreground">No heatmap data available</p>
      </div>
    );
  }

  // Group by week
  const weeks: HeatmapCell[][] = [];
  let currentWeek: HeatmapCell[] = [];

  // Fill first week with empty cells if it doesn't start on Sunday
  const firstDayOfWeek = heatmap[0]?.dayOfWeek || 0;
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({
      date: '',
      dayOfWeek: i,
      cost: 0,
      intensity: 0,
    });
  }

  heatmap.forEach((cell, idx) => {
    currentWeek.push(cell);
    if (cell.dayOfWeek === 6 || idx === heatmap.length - 1) {
      // Fill remaining days if last week is incomplete
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: '',
          dayOfWeek: currentWeek.length,
          cost: 0,
          intensity: 0,
        });
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Daily Spending Heatmap</h3>
        <div className="flex items-center space-x-2">
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
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Min Daily</p>
            <p className="text-lg font-bold text-foreground">{formatCost(stats.minCost)}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Avg Daily</p>
            <p className="text-lg font-bold text-foreground">{formatCost(stats.avgCost)}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Max Daily</p>
            <p className="text-lg font-bold text-foreground">{formatCost(stats.maxCost)}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Trend</p>
            <div className="flex items-center space-x-1">
              {getTrendIcon(stats.trendIndicator)}
              <span className="text-xs text-muted-foreground">{getTrendText(stats.trendIndicator)}</span>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Day labels */}
            <div className="flex mb-2">
              <div className="w-12"></div>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div key={day} className="w-10 text-center text-xs text-muted-foreground">
                  {getDayLabel(day)}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex mb-1 items-center">
                <div className="w-12 text-xs text-muted-foreground pr-2 text-right">
                  {weekIdx === 0 ? 'Week 1' : weekIdx === weeks.length - 1 ? 'Latest' : ''}
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
                          className={`w-full h-full rounded ${getIntensityColor(
                            cell.intensity
                          )} transition-all duration-200 hover:ring-2 hover:ring-accent cursor-pointer`}
                        ></div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap">
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

            {/* Legend */}
            <div className="flex items-center justify-end space-x-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex space-x-1">
                {[0, 0.25, 0.5, 0.75, 1].map((intensity, idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded ${getIntensityColor(intensity)}`}
                  ></div>
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
