'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/Card';

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

  const getMaxValue = (data: { count?: number; total?: number }[]) => {
    return Math.max(...data.map((d) => d.count || d.total || 0), 1);
  };

  const getBarHeight = (value: number, maxValue: number) => {
    return `${(value / maxValue) * 100}%`;
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
          <div className="h-64 flex items-end justify-between gap-1">
            {registrations.map((item) => {
              const maxValue = getMaxValue(registrations);
              const height = getBarHeight(item.count, maxValue);
              return (
                <div key={item.date} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-accent rounded-t-lg transition-all duration-300 hover:bg-accent-hover"
                    style={{ height }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-card-bg border border-border rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">{item.count} users</div>
                      <div className="text-xs text-muted-foreground">{item.date}</div>
                    </div>
                  </div>
                </div>
              );
            })}
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
          <div className="h-64 flex items-end justify-between gap-1">
            {activities.map((item) => {
              const maxValue = getMaxValue(activities);
              const height = getBarHeight(item.total, maxValue);
              return (
                <div key={item.date} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-accent/70 rounded-t-lg transition-all duration-300 hover:bg-accent"
                    style={{ height }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-card-bg border border-border rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">{item.total} activities</div>
                      <div className="text-xs text-muted-foreground">{item.date}</div>
                      <div className="text-xs text-muted-foreground mt-1 border-t border-border pt-1">
                        {Object.entries(item.byType).map(([type, count]) => (
                          <div key={type}>
                            {type}: {count}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
