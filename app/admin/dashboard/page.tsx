'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
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

type TabType = 'analytics' | 'users';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('analytics');

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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-card-bg border-r border-border flex flex-col shrink-0">
        {/* Logo/Header */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Clarity AI</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200 ${
              activeTab === 'analytics'
                ? 'bg-accent text-white'
                : 'text-foreground hover:bg-background'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium">Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeTab === 'users'
                ? 'bg-accent text-white'
                : 'text-foreground hover:bg-background'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium">Users</span>
          </button>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh} className="w-full">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-card-bg border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <h2 className="text-3xl font-bold text-foreground">
              {activeTab === 'analytics' ? 'Analytics Dashboard' : 'User Management'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {activeTab === 'analytics'
                ? 'Monitor user growth, activity, and engagement metrics'
                : 'Manage users, view details, and perform administrative actions'}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          {activeTab === 'analytics' ? (
            <>
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

              {/* Analytics Charts */}
              <AnalyticsSection />
            </>
          ) : (
            <UserTable onUserClick={setSelectedUserId} refreshTrigger={refreshTrigger} />
          )}
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
