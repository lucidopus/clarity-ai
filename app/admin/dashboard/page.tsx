'use client';

import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Users, Video, CreditCard, Activity, TrendingUp, TrendingDown } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SummaryStats {
  users: {
    total: number;
    activeLastWeek: number;
    activeLastMonth: number;
    newLastWeek: number;
    newLastMonth: number;
  };
  content: {
    totalVideos: number;
    totalFlashcards: number;
    totalQuizzes: number;
    totalActivities: number;
    avgVideosPerUser: number;
    avgFlashcardsPerUser: number;
    avgQuizzesPerUser: number;
  };
  activityBreakdown: Record<string, number>;
}

interface RegistrationData {
  date: string;
  count: number;
}

interface ActivityData {
  date: string;
  count: number;
  uniqueUsers: number;
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [registrationView, setRegistrationView] = useState<'week' | 'month' | 'year'>('month');
  const [activityView, setActivityView] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, regRes, actRes] = await Promise.all([
          fetch('/api/admin/analytics/summary'),
          fetch(`/api/admin/analytics/registrations?view=${registrationView}`),
          fetch(`/api/admin/analytics/activity-heatmap?view=${activityView}`),
        ]);

        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setSummary(data.summary);
        }

        if (regRes.ok) {
          const data = await regRes.json();
          setRegistrations(data.data);
        }

        if (actRes.ok) {
          const data = await actRes.json();
          setActivities(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [registrationView, activityView]);

  const registrationChartData = {
    labels: registrations.map((r) => r.date),
    datasets: [
      {
        label: 'New Registrations',
        data: registrations.map((r) => r.count),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const activityChartData = {
    labels: activities.map((a) => a.date),
    datasets: [
      {
        label: 'Total Activities',
        data: activities.map((a) => a.count),
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
      },
      {
        label: 'Active Users',
        data: activities.map((a) => a.uniqueUsers),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgb(156, 163, 175)',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      x: {
        ticks: {
          color: 'rgb(156, 163, 175)',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
    },
  };

  const barChartOptions: ChartOptions<'bar'> = {
    ...chartOptions,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
        },
      },
    },
  };

  if (loading || !summary) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card-bg rounded-xl border border-border p-6">
              <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse w-20"></div>
              <div className="h-8 bg-secondary/20 rounded animate-pulse w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const StatCard = ({
    icon,
    label,
    value,
    trend,
    trendLabel,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    trend?: 'up' | 'down';
    trendLabel?: string;
  }) => (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
          {trendLabel && (
            <div className="flex items-center mt-2 text-sm">
              {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 mr-1" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
              <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>{trendLabel}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-accent/10 rounded-lg">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of platform metrics and user activity</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-accent" />}
          label="Total Users"
          value={summary.users.total}
          trend="up"
          trendLabel={`+${summary.users.newLastWeek} this week`}
        />
        <StatCard
          icon={<Activity className="w-6 h-6 text-accent" />}
          label="Active Users (30d)"
          value={summary.users.activeLastMonth}
          trendLabel={`${summary.users.activeLastWeek} last week`}
        />
        <StatCard
          icon={<Video className="w-6 h-6 text-accent" />}
          label="Total Videos"
          value={summary.content.totalVideos}
          trendLabel={`${summary.content.avgVideosPerUser.toFixed(1)} per user`}
        />
        <StatCard
          icon={<CreditCard className="w-6 h-6 text-accent" />}
          label="Total Flashcards"
          value={summary.content.totalFlashcards}
          trendLabel={`${summary.content.avgFlashcardsPerUser.toFixed(1)} per user`}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card-bg rounded-xl border border-border p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Content Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-foreground">Quizzes</span>
              <span className="font-semibold text-foreground">{summary.content.totalQuizzes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">Activities</span>
              <span className="font-semibold text-foreground">{summary.content.totalActivities.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-card-bg rounded-xl border border-border p-6 md:col-span-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Activity Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(summary.activityBreakdown).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-foreground">{type.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-foreground">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Registration Timeline */}
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Registration Timeline</h2>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setRegistrationView(view)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  registrationView === view
                    ? 'bg-accent text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[300px]">
          <Line data={registrationChartData} options={chartOptions} />
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Activity Heatmap</h2>
          <div className="flex gap-2">
            {(['month', 'year'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActivityView(view)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  activityView === view
                    ? 'bg-accent text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[300px]">
          <Bar data={activityChartData} options={barChartOptions} />
        </div>
      </div>
    </div>
  );
}
