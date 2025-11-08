"use client";

import { useDashboardInsights } from '@/hooks/useDashboardInsights';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function WeekdayConsistencyBars() {
  const { insights, loading, error } = useDashboardInsights();

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6 h-full">
        <div className="h-6 bg-secondary/20 rounded mb-4 animate-pulse w-32"></div>
        <div className="h-[140px] bg-secondary/10 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6 h-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Rhythm</h3>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (!insights || insights.weekdayConsistency.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6 h-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Rhythm</h3>
        <div className="text-sm text-muted-foreground text-center py-12">
          No activity data yet. Start learning to see your weekly patterns!
        </div>
      </div>
    );
  }

  const weekday = insights.weekdayConsistency;
  const labels = weekday.map((d) => d.label);
  const data = weekday.map((d) => d.count);

  const totalActivities = data.reduce((sum, count) => sum + count, 0);
  const averagePerDay = totalActivities / 7;



  // Color bars: above average in accent, below in muted
  const backgroundColors = data.map((count) =>
    count >= averagePerDay ? 'rgba(28, 195, 223, 0.8)' : 'rgba(148, 163, 184, 0.4)'
  );

  const gridColor = 'rgba(148,163,184,0.15)';
  const tickColor = 'rgba(148,163,184,0.8)';

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-foreground mb-2">Weekly Rhythm</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Activity by day of week (last 6 weeks)
      </p>

      <div className="h-[140px]">
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: 'Activities',
                data,
                backgroundColor: backgroundColors,
                borderRadius: 6,
                barThickness: 'flex',
                maxBarThickness: 60,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.parsed.y} ${ctx.parsed.y === 1 ? 'activity' : 'activities'}`,
                },
              },
            },
            scales: {
              x: {
                ticks: {
                  color: tickColor,
                  font: { size: 12 },
                },
                grid: { display: false },
                border: { display: false },
              },
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0,
                  color: tickColor,
                },
                grid: { color: gridColor },
                border: { display: false },
              },
            },
          }}
        />
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="w-3 h-3 rounded bg-[rgba(148,163,184,0.4)]"></div>
        <div className="w-3 h-3 rounded bg-[rgba(28,195,223,0.8)]"></div>
        <span>More</span>
      </div>
    </div>
  );
}
