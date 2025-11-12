'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/Card';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type TimeRange = 'week' | 'month' | 'year';

interface RegistrationData {
  date: string;
  count: number;
}

interface ActivityData {
  date: string;
  total: number;
  byType: Record<string, number>;
}

export default function AnalyticsSection() {
  const [registrationRange, setRegistrationRange] = useState<TimeRange>('month');
  const [activityRange, setActivityRange] = useState<TimeRange>('month');
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [isLoadingReg, setIsLoadingReg] = useState(true);
  const [isLoadingAct, setIsLoadingAct] = useState(true);

  useEffect(() => {
    fetchRegistrations();
  }, [registrationRange]);

  useEffect(() => {
    fetchActivities();
  }, [activityRange]);

  const fetchRegistrations = async () => {
    setIsLoadingReg(true);
    try {
      const response = await fetch(`/api/admin/analytics/registrations?range=${registrationRange}`);
      const data = await response.json();
      if (data.success) {
        setRegistrations(data.data.registrations);
      }
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    } finally {
      setIsLoadingReg(false);
    }
  };

  const fetchActivities = async () => {
    setIsLoadingAct(true);
    try {
      const response = await fetch(`/api/admin/analytics/activity?range=${activityRange}`);
      const data = await response.json();
      if (data.success) {
        setActivities(data.data.heatmap);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoadingAct(false);
    }
  };

  const gridColor = 'rgba(148,163,184,0.15)';
  const tickColor = 'rgba(148,163,184,0.8)';

  const registrationChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.y} ${ctx.parsed.y === 1 ? 'user' : 'users'}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: tickColor,
        },
        grid: { color: gridColor },
        border: { display: false },
      },
      x: {
        ticks: {
          color: tickColor,
          maxRotation: 45,
          minRotation: 45,
        },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  const activityChartOptions: ChartOptions<'bar'> = {
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
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: tickColor,
        },
        grid: { color: gridColor },
        border: { display: false },
      },
      x: {
        ticks: {
          color: tickColor,
          maxRotation: 45,
          minRotation: 45,
        },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Registrations Chart */}
      <Card className="!cursor-default">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground">User Registrations</h3>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setRegistrationRange(range)}
                className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                  registrationRange === range
                    ? 'bg-accent text-white'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoadingReg ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No data available</div>
        ) : (
          <div className="h-64">
            <Bar
              data={{
                labels: registrations.map((item) => item.date),
                datasets: [
                  {
                    label: 'Users',
                    data: registrations.map((item) => item.count),
                    backgroundColor: 'rgba(28, 195, 223, 0.8)',
                    borderRadius: 4,
                  },
                ],
              }}
              options={registrationChartOptions}
            />
          </div>
        )}
      </Card>

      {/* Activity Heatmap */}
      <Card className="!cursor-default">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground">Activity Heatmap</h3>
          <div className="flex gap-2">
            {(['month', 'year'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setActivityRange(range)}
                className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                  activityRange === range
                    ? 'bg-accent text-white'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoadingAct ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No data available</div>
        ) : (
          <div className="h-64">
            <Bar
              data={{
                labels: activities.map((item) => item.date),
                datasets: [
                  {
                    label: 'Activities',
                    data: activities.map((item) => item.total),
                    backgroundColor: 'rgba(28, 195, 223, 0.7)',
                    borderRadius: 4,
                  },
                ],
              }}
              options={activityChartOptions}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
