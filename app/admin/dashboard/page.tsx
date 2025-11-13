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
  Filler,
} from 'chart.js';
import { Users, Video, CreditCard, Activity, TrendingUp } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
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

interface ChartDataPoint {
  label: string;
  count: number;
  uniqueUsers?: number;
}

type ViewMode = 'week' | 'month';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [registrations, setRegistrations] = useState<ChartDataPoint[]>([]);
  const [activities, setActivities] = useState<ChartDataPoint[]>([]);
  const [registrationView, setRegistrationView] = useState<ViewMode>('month');
  const [activityView, setActivityView] = useState<ViewMode>('month');
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

  // Define chart colors matching app theme (cyan/teal accent)
  const accentColor = '#06B6D4';           // Cyan accent
  const accentLight = 'rgba(6, 182, 212, 0.1)';

  const registrationChartData = {
    labels: registrations.map((r) => r.label),
    datasets: [
      {
        label: 'New Registrations',
        data: registrations.map((r) => r.count),
        borderColor: accentColor,
        backgroundColor: accentLight,
        tension: 0.4,
        fill: true,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: accentColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const activityChartData = {
    labels: activities.map((a) => a.label),
    datasets: [
      {
        label: 'Total Activities',
        data: activities.map((a) => a.count),
        backgroundColor: accentColor,
        borderRadius: 6,
        barThickness: activityView === 'month' ? undefined : 50,
        maxBarThickness: 50,
      },
    ],
  };

  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          title: (items) => {
            const item = items[0];
            return registrationView === 'week'
              ? `${item.label}`
              : `Day ${item.label}`;
          },
          label: (item) => `${item.formattedValue} registrations`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        border: {
          display: false,
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          drawTicks: false,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          padding: 8,
          font: {
            size: 12,
          },
        },
      },
      x: {
        border: {
          display: false,
        },
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          padding: 8,
          font: {
            size: 12,
          },
          maxRotation: 0,
        },
      },
    },
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          title: (items) => {
            const item = items[0];
            return activityView === 'week'
              ? `${item.label}`
              : `Day ${item.label}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        border: {
          display: false,
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          drawTicks: false,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          padding: 8,
          font: {
            size: 12,
          },
        },
      },
      x: {
        border: {
          display: false,
        },
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          padding: 8,
          font: {
            size: 12,
          },
          maxRotation: 0,
        },
      },
    },
  };

  const StatCard = ({
    icon,
    label,
    value,
    trendLabel,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    trendLabel?: string;
  }) => (
    <div className="bg-card-bg rounded-xl border border-border p-6 hover:border-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
          <p className="text-3xl font-bold text-foreground mb-1">{value.toLocaleString()}</p>
          {trendLabel && (
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-500 font-medium">{trendLabel}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-accent/10 rounded-lg shrink-0">{icon}</div>
      </div>
    </div>
  );

  const ViewToggle = ({
    view,
    setView,
  }: {
    view: ViewMode;
    setView: (view: ViewMode) => void;
  }) => (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-border">
      <button
        onClick={() => setView('week')}
        className={`px-3 py-1 cursor-pointer text-sm ${
          view === 'week'
            ? 'bg-accent text-white'
            : 'bg-transparent text-foreground hover:bg-accent/10'
        }`}
      >
        Week
      </button>
      <button
        onClick={() => setView('month')}
        className={`px-3 py-1 cursor-pointer text-sm ${
          view === 'month'
            ? 'bg-accent text-white'
            : 'bg-transparent text-foreground hover:bg-accent/10'
        }`}
      >
        Month
      </button>
    </div>
  );

  if (loading || !summary) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-8 bg-secondary/20 rounded w-48 mb-2"></div>
          <div className="h-4 bg-secondary/20 rounded w-96"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card-bg rounded-xl border border-border p-6">
              <div className="h-4 bg-secondary/20 rounded mb-2 w-20"></div>
              <div className="h-8 bg-secondary/20 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-accent" />}
          label="Total Users"
          value={summary.users.total}
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
          trendLabel={`${summary.content.avgVideosPerUser} per user`}
        />
        <StatCard
          icon={<CreditCard className="w-6 h-6 text-accent" />}
          label="Total Flashcards"
          value={summary.content.totalFlashcards}
          trendLabel={`${summary.content.avgFlashcardsPerUser} per user`}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card-bg rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Content Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-foreground">Quizzes</span>
              <span className="font-semibold text-foreground">{summary.content.totalQuizzes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">Activities</span>
              <span className="font-semibold text-foreground">{summary.content.totalActivities.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-card-bg rounded-xl border border-border p-6 md:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Activity Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(summary.activityBreakdown).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-foreground capitalize">{type.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-foreground">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Timeline */}
        <div className="bg-card-bg rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Registrations</h2>
            <ViewToggle view={registrationView} setView={setRegistrationView} />
          </div>
          <div className="h-[300px]">
            <Line data={registrationChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-card-bg rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Interactions</h2>
            <ViewToggle view={activityView} setView={setActivityView} />
          </div>
          <div className="h-[300px]">
            <Bar data={activityChartData} options={barChartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
