'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Card from '@/components/Card';
import StatCard from '@/components/StatCard';
import UserTable from '@/components/admin/UserTable';
import UserDetailModal from '@/components/admin/UserDetailModal';
import AnalyticsSection from '@/components/admin/AnalyticsSection';

interface SummaryData {
  users: {
    total: number;
    newLast30Days: number;
    activeLast7Days: number;
  };
  videos: {
    total: number;
    processedLast30Days: number;
  };
  generations: {
    totalFlashcards: number;
    totalQuizzes: number;
    totalPrerequisites: number;
    totalTimestamps: number;
    grandTotal: number;
  };
  activity: {
    total: number;
    last30Days: number;
  };
  streaks: {
    average: number;
    longestAverage: number;
    maxStreak: number;
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchSummary();
  }, [refreshTrigger]);

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/admin/analytics/summary');
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'admin_jwt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/admin/login');
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card-bg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">Monitor user growth, activity, and analytics</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" onClick={handleRefresh}>
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={summary?.users.total || 0}
            subtitle={`+${summary?.users.newLast30Days || 0} last 30 days`}
          />
          <StatCard
            title="Active Users (7d)"
            value={summary?.users.activeLast7Days || 0}
            subtitle={`${Math.round(((summary?.users.activeLast7Days || 0) / (summary?.users.total || 1)) * 100)}% of total`}
          />
          <StatCard
            title="Videos Processed"
            value={summary?.videos.total || 0}
            subtitle={`+${summary?.videos.processedLast30Days || 0} last 30 days`}
          />
          <StatCard
            title="Total Generations"
            value={summary?.generations.grandTotal || 0}
            subtitle={`${summary?.generations.totalFlashcards || 0} flashcards • ${summary?.generations.totalQuizzes || 0} quizzes`}
          />
        </div>

        {/* Analytics Section */}
        <div className="mb-8">
          <AnalyticsSection />
        </div>

        {/* User Management */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">User Management</h2>
          <UserTable onUserClick={setSelectedUserId} refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserDeleted={handleRefresh}
        />
      )}
    </div>
  );
}
