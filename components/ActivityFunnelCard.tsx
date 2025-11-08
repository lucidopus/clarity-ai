"use client";

import { useDashboardInsights } from '@/hooks/useDashboardInsights';
import { TrendingDown } from 'lucide-react';

export default function ActivityFunnelCard() {
  const { insights, loading, error } = useDashboardInsights();

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6 h-full">
        <div className="h-6 bg-secondary/20 rounded mb-4 animate-pulse w-32"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-secondary/10 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6 h-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">Activity Funnel</h3>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (!insights || insights.activityFunnel.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6 h-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">Activity Funnel</h3>
        <div className="text-sm text-muted-foreground text-center py-12">
          No recent activity. Start learning to see your engagement funnel!
        </div>
      </div>
    );
  }

  const funnel = insights.activityFunnel;
  const maxCount = Math.max(...funnel.map((f) => f.count), 1);

  // Calculate drop-off percentages
  const funnelWithDropoff = funnel.map((item, index) => {
    if (index === 0 || funnel[index - 1].count === 0) {
      return { ...item, dropoffPercentage: null };
    }
    const prevCount = funnel[index - 1].count;
    const dropoff = ((prevCount - item.count) / prevCount) * 100;
    return { ...item, dropoffPercentage: dropoff > 0 ? dropoff : null };
  });

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-foreground mb-2">Activity Funnel</h3>
      <p className="text-sm text-muted-foreground mb-4">
        How you move through the learning loop (last 7 days)
      </p>
      <div className="space-y-3">
        {funnelWithDropoff.map((item) => {
          const widthPercentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          const hasActivity = item.count > 0;

          return (
            <div key={item.activityType}>
              {/* Show drop-off indicator if applicable */}
              {item.dropoffPercentage !== null && item.dropoffPercentage > 20 && (
                <div className="flex items-center gap-1.5 mb-1 ml-2 text-xs text-orange-500">
                  <TrendingDown className="w-3 h-3" />
                  <span>{Math.round(item.dropoffPercentage)}% drop-off</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* Label */}
                <div className="w-36 flex-shrink-0 text-sm text-foreground">
                  {item.label}
                </div>

                {/* Progress bar */}
                <div className="flex-1 relative h-8 bg-secondary/20 rounded-lg overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-300 ${
                      hasActivity
                        ? 'bg-gradient-to-r from-cyan-400 to-cyan-500'
                        : 'bg-secondary/30'
                    }`}
                    style={{ width: `${widthPercentage}%` }}
                  ></div>

                  {/* Count label */}
                  <div className="absolute inset-0 flex items-center justify-end px-3">
                    <span
                      className={`text-sm font-semibold ${
                        hasActivity && widthPercentage > 30
                          ? 'text-white'
                          : 'text-foreground'
                      }`}
                    >
                      {item.count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
        <p>
          💡 <strong>Tip:</strong> Balanced practice across all activities leads to better retention
        </p>
      </div>
    </div>
  );
}
