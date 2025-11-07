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

export default function FocusHoursChart() {
  const { insights, loading, error } = useDashboardInsights();

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <div className="h-6 bg-secondary/20 rounded mb-4 animate-pulse w-32"></div>
        <div className="h-[300px] bg-secondary/10 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Focus Hours</h3>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (!insights || insights.focusHours.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Focus Hours</h3>
        <div className="text-sm text-muted-foreground text-center py-12">
          No activity data yet. Start learning to see your focus hours!
        </div>
      </div>
    );
  }

  const focusHours = insights.focusHours;
  const maxCount = Math.max(...focusHours.map((b) => b.count));

  // Find top 3 hours for highlighting
  const sortedBuckets = [...focusHours].sort((a, b) => b.count - a.count);
  const top3Hours = new Set(sortedBuckets.slice(0, 3).map((b) => b.hour));

  // Format hour labels (0 -> 12am, 13 -> 1pm, etc.)
  const labels = focusHours.map((b) => {
    const hour = b.hour;
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  });

  const data = focusHours.map((b) => b.count);

  // Color bars: top 3 in accent, others in muted
  const backgroundColors = focusHours.map((b) =>
    top3Hours.has(b.hour) ? 'rgba(28, 195, 223, 0.8)' : 'rgba(148, 163, 184, 0.4)'
  );

  const gridColor = 'rgba(148,163,184,0.15)';
  const tickColor = 'rgba(148,163,184,0.8)';

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-foreground mb-2">Focus Hours</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Your activity by hour of day (last 30 days) • Timezone: {insights.timezone}
      </p>
      <div className="h-[300px]">
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: 'Activities',
                data,
                backgroundColor: backgroundColors,
                borderRadius: 4,
                barThickness: 'flex',
                maxBarThickness: 20,
              },
            ],
          }}
          options={{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.parsed.x} ${ctx.parsed.x === 1 ? 'activity' : 'activities'}`,
                },
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: {
                  precision: 0,
                  color: tickColor,
                },
                grid: { color: gridColor },
                border: { display: false },
              },
              y: {
                ticks: {
                  color: tickColor,
                  font: { size: 11 },
                },
                grid: { display: false },
                border: { display: false },
              },
            },
          }}
        />
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[rgba(28,195,223,0.8)]"></div>
          <span>Top 3 hours</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[rgba(148,163,184,0.4)]"></div>
          <span>Other hours</span>
        </div>
      </div>
    </div>
  );
}
