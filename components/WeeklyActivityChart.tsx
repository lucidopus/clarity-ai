"use client";

import { useEffect, useState } from 'react';
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

type Weekly = { date: string; count: number };

export default function WeeklyActivityChart() {
  const [data, setData] = useState<Weekly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Listen for activity events to refresh immediately
  useEffect(() => {
    const handler = () => setRefreshTick((t) => t + 1);
    if (typeof window !== 'undefined') {
      window.addEventListener('activity:logged', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('activity:logged', handler);
      }
    };
  }, []);

  // Refresh when page becomes visible (tab switching, returning to browser)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setRefreshTick((t) => t + 1);
      }
    };

    const handleFocus = () => {
      setRefreshTick((t) => t + 1);
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/dashboard/activity');
        if (!res.ok) throw new Error('Failed to load weekly activity');
        const json = await res.json() as { weeklyActivity?: Weekly[] };
        if (mounted) setData(json.weeklyActivity || []);
      } catch (e: unknown) {
        if (mounted) {
          const message = e instanceof Error ? e.message : 'Error';
          setError(message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [refreshTick]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading chart…</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6); // Go back 6 days to include today, making it 7 days total

  const allDates = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + i);
    return date;
  });

  const labels = allDates.map(date =>
    new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
  );

  const countsMap = new Map(data.map(item => [item.date, item.count]));

  const counts = allDates.map(date => {
    const dateString = date.toISOString().slice(0, 10); // Format to 'YYYY-MM-DD' to match API
    return countsMap.get(dateString) || 0;
  });

  const gridColor = 'rgba(148,163,184,0.25)'; // slate-400/25
  const tickColor = 'rgba(148,163,184,0.8)';

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Activity</h3>
      <div className="flex-grow h-[180px]">
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: 'Activities',
                data: counts,
                backgroundColor: 'rgba(8, 145, 178, 0.7)',
                borderRadius: 6,
                borderSkipped: false,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { intersect: false, callbacks: { label: (ctx) => `${ctx.parsed.y} activities` } } },
            scales: {
              x: {
                grid: { color: gridColor },
                border: { display: false },
                ticks: { color: tickColor, maxRotation: 0, autoSkipPadding: 10 },
              },
              y: {
                beginAtZero: true,
                ticks: { precision: 0, color: tickColor },
                grid: { color: gridColor },
                border: { display: false },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
