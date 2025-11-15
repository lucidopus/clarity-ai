"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface FocusHoursBucket {
  hour: number;
  count: number;
}

export interface ActivityFunnelItem {
  activityType: string;
  label: string;
  count: number;
}

export interface VideoEngagementItem {
  videoId: string;
  title: string;
  thumbnail: string | null;
  interactions: number;
  percentage: number;
}

export interface FlashcardDifficultyItem {
  difficulty: string;
  count: number;
  percentage: number;
}

export interface WeekdayConsistencyItem {
  dayOfWeek: number;
  label: string;
  count: number;
  activeDays: number;
}

export interface DashboardInsights {
  generatedAt: string;
  timezone: string;
  focusHours: FocusHoursBucket[];
  activityFunnel: ActivityFunnelItem[];
  videoEngagement: VideoEngagementItem[];
  flashcardDifficulty: FlashcardDifficultyItem[];
  weekdayConsistency: WeekdayConsistencyItem[];
}

interface DashboardInsightsContextValue {
  insights: DashboardInsights | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const DashboardInsightsContext = createContext<DashboardInsightsContextValue | undefined>(undefined);

export function DashboardInsightsProvider({ children }: { children: ReactNode }) {
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = () => setRefreshTick((t) => t + 1);

  // Listen for activity events to refresh immediately
  useEffect(() => {
    const handler = () => refresh();
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
        refresh();
      }
    };

    const handleFocus = () => {
      refresh();
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

  // Fetch insights data
  useEffect(() => {
    let mounted = true;

    async function loadInsights() {
      setLoading(true);
      setError(null);
      try {
        // Send client timezone to API
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch(`/api/dashboard/insights?timezone=${encodeURIComponent(timezone)}`);

        if (!res.ok) {
          throw new Error('Failed to load insights');
        }

        const data = await res.json();
        if (mounted) {
          setInsights(data);
        }
      } catch (e: unknown) {
        if (mounted) {
          const message = e instanceof Error ? e.message : 'Error loading insights';
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadInsights();
    return () => {
      mounted = false;
    };
  }, [refreshTick]);

  return (
    <DashboardInsightsContext.Provider value={{ insights, loading, error, refresh }}>
      {children}
    </DashboardInsightsContext.Provider>
  );
}

export function useDashboardInsights() {
  const context = useContext(DashboardInsightsContext);
  if (context === undefined) {
    throw new Error('useDashboardInsights must be used within a DashboardInsightsProvider');
  }
  return context;
}
