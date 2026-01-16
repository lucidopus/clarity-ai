'use client';

import { useRouter } from 'next/navigation';
import { BarChart3, Flame, Library, Layers, ListChecks } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/DashboardHeader';
import GenerateModal from '@/components/GenerateModal';
import Dialog from '@/components/Dialog';
import { useState, useEffect } from 'react';
import EmptyState from '@/components/EmptyState';
import StatCard from '@/components/StatCard';
import StudyActivityHeatmap from '@/components/StudyActivityHeatmap';
import RecentVideoCard from '@/components/RecentVideoCard';
import { DashboardInsightsProvider } from '@/hooks/useDashboardInsights';
import FocusHoursChart from '@/components/FocusHoursChart';
import ActivityFunnelCard from '@/components/ActivityFunnelCard';
import VideoEngagementList from '@/components/VideoEngagementList';
import FlashcardDifficultyDonut from '@/components/FlashcardDifficultyDonut';
import WeekdayConsistencyBars from '@/components/WeekdayConsistencyBars';
import { getErrorConfig } from '@/lib/errorMessages';

interface StatsResponse {
  totalVideos: number;
  totalFlashcards: number;
  flashcardsMastered: number;
  masteryPercentage: number;
  totalQuizzes: number;
  totalQuizAttempts: number;
  averageQuizScore: number;
  currentStreak: number;
  longestStreak: number;
  videosThisWeek: number;
  flashcardsStudiedThisWeek: number;
}

interface RecentVideo {
  _id: string;
  title: string;
  videoId: string;
  thumbnail?: string;
  createdAt?: string;
  channelName?: string;
  duration?: number;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  flashcardCount?: number;
  quizCount?: number;
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [greeting, setGreeting] = useState('Welcome');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [errorState, setErrorState] = useState<{
    show: boolean;
    errorType: string;
    videoId?: string;
  } | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

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
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const [sRes, aRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/activity'),
        ]);
        if (!sRes.ok) throw new Error('Failed to load stats');
        if (!aRes.ok) throw new Error('Failed to load activity');
        const s = await sRes.json();
        const a = await aRes.json();
        if (mounted) {
          setStats(s);
          setRecentVideos(a.recentVideos || []);
        }
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : 'Error loading dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user, refreshTick]);

  const handleGenerate = async (youtubeUrl: string) => {
    console.log('🎬 [FRONTEND] Starting video generation from Home page...');
    console.log(`🎬 [FRONTEND] YouTube URL: ${youtubeUrl}`);

    setIsGenerating(true);
    setErrorState(null); // Clear any previous errors
    try {
      const clientNow = new Date();
      const timezoneOffsetMinutes = clientNow.getTimezoneOffset();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      console.log('🎬 [FRONTEND] Sending POST request to /api/videos/process...');
      const response = await fetch('/api/videos/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl,
          clientTimestamp: clientNow.toISOString(),
          timezoneOffsetMinutes,
          timeZone,
        }),
      });

      console.log(`🎬 [FRONTEND] Response status: ${response.status} ${response.statusText}`);

      const data = await response.json();

      // Case 1: Apify/validation failed → show error dialog, stay on home
      if (!response.ok) {
        console.error('❌ [FRONTEND] API error response:', data);
        setErrorState({
          show: true,
          errorType: data.errorType || 'UNKNOWN_ERROR',
          videoId: data.videoId, // For duplicate video errors
        });
        setShowGenerateModal(false);
        return;
      }

      // Case 2: Success (with or without warnings)
      console.log('✅ [FRONTEND] Generation successful:', data);
      setShowGenerateModal(false);

      // Case 2a: LLM failed (partial success) → redirect with warning
      if (data.warning) {
        console.log(`⚠️ [FRONTEND] Redirecting to /generations/${data.videoId}?warning=${data.warning.type}`);
        window.location.href = `/generations/${data.videoId}?warning=${data.warning.type}`;
        return;
      }

      // Case 2b: Full success → redirect normally
      if (data.videoId) {
        console.log(`🎬 [FRONTEND] Redirecting to /generations/${data.videoId}`);
        window.location.href = `/generations/${data.videoId}`;
      } else {
        console.error('❌ [FRONTEND] No videoId in response');
        setErrorState({
          show: true,
          errorType: 'UNKNOWN_ERROR',
        });
      }
    } catch (error: unknown) {
      console.error('❌ [FRONTEND] Generation error:', error);
      // Network error or other unexpected error
      setErrorState({
        show: true,
        errorType: 'NETWORK_ERROR',
      });
      setShowGenerateModal(false);
    } finally {
      setIsGenerating(false);
      console.log('🎬 [FRONTEND] Generation flow completed');
    }
  };

  if (!user) return null;

  return (
    <DashboardInsightsProvider>
    <div>
      {/* Page Header */}
      <DashboardHeader
        title={`${greeting}, ${user.firstName}`}
        onGenerateClick={() => setShowGenerateModal(!showGenerateModal)}
        isGenerateModalOpen={showGenerateModal}
      />

      {/* Loading/Error */}
      {loading && (
        <div className="space-y-8">
          {/* Stats Cards Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card-bg rounded-xl border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse w-16"></div>
                    <div className="h-8 bg-secondary/20 rounded mb-1 animate-pulse w-12"></div>
                    <div className="h-3 bg-accent/20 rounded animate-pulse w-20"></div>
                  </div>
                  <div className="w-10 h-10 bg-accent/20 rounded-lg animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Heatmap + Weekly Chart Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <div className="bg-card-bg rounded-xl border border-border p-6">
                <div className="h-6 bg-secondary/20 rounded mb-4 animate-pulse w-48"></div>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-secondary/10 rounded animate-pulse"></div>
                  ))}
                </div>
                <div className="flex justify-between text-xs">
                  <div className="h-3 bg-secondary/20 rounded animate-pulse w-8"></div>
                  <div className="h-3 bg-secondary/20 rounded animate-pulse w-12"></div>
                  <div className="h-3 bg-secondary/20 rounded animate-pulse w-8"></div>
                </div>
              </div>
            </div>
            <div className="h-full">
              <div className="bg-card-bg rounded-xl border border-border p-6 h-full">
                <div className="h-6 bg-secondary/20 rounded mb-4 animate-pulse w-40"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 bg-secondary/20 rounded animate-pulse w-20"></div>
                      <div className="h-4 bg-accent/20 rounded animate-pulse w-8"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Skeleton */}
          <div>
            <div className="h-6 bg-secondary/20 rounded mb-3 animate-pulse w-32"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-card-bg rounded-xl border border-border p-4">
                  <div className="aspect-video bg-secondary/20 rounded-lg mb-3 animate-pulse"></div>
                  <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse"></div>
                  <div className="h-3 bg-secondary/20 rounded animate-pulse w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="bg-card-bg rounded-2xl border border-border min-h-[300px] flex items-center justify-center">
          <div className="text-sm text-red-500">{error}</div>
        </div>
      )}

      {!loading && !error && stats && (
        <div className="space-y-8">
          {/* Heatmap + Weekly Rhythm */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <StudyActivityHeatmap currentStreak={stats.currentStreak} longestStreak={stats.longestStreak} />
            </div>
            <div className="h-full">
              <WeekdayConsistencyBars />
            </div>
          </div>

          {/* Insights Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Learning Insights</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Focus Hours - full width on mobile, half on lg+ */}
              <FocusHoursChart />

              {/* Activity Funnel */}
              <ActivityFunnelCard />

              {/* Video Engagement */}
              <VideoEngagementList />

              {/* Flashcard Difficulty */}
              <FlashcardDifficultyDonut />
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Recent Activity</h3>
            {recentVideos.length === 0 ? (
              <div className="bg-card-bg border border-border rounded-2xl p-10">
                <EmptyState
                  icon={<BarChart3 className="w-10 h-10" />}
                  title="No recent videos"
                  description="Your recent videos will appear here once you start generating materials."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {recentVideos.map((v) => (
                  <RecentVideoCard
                    key={v._id}
                    title={v.title}
                    createdAt={v.createdAt}
                    onClick={() => router.push(`/generations/${v.videoId ?? v._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State for brand new users */}
      {!loading && !error && !stats && (
        <div className="bg-card-bg rounded-2xl border border-border min-h-[400px] flex items-center justify-center">
          <EmptyState
            icon={<BarChart3 className="w-12 h-12" />}
            title="No learning materials yet"
            description="Your stats, progress, and recent activity will appear here once you start generating materials."
          />
        </div>
      )}

      {/* Generate Modal */}
      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        isLoading={isGenerating}
      />

      {/* Error Dialog */}
      {errorState && (
        <Dialog
          isOpen={errorState.show}
          onClose={() => setErrorState(null)}
          onConfirm={() => {
            // Handle special actions for specific error types
            if (errorState.errorType === 'DUPLICATE_VIDEO' && errorState.videoId) {
              // Redirect to existing video
              window.location.href = `/generations/${errorState.videoId}`;
            } else {
              setErrorState(null);
            }
          }}
          type="alert"
          variant={getErrorConfig(errorState.errorType).variant}
          title={getErrorConfig(errorState.errorType).title}
          message={getErrorConfig(errorState.errorType).message}
          confirmText={errorState.errorType === 'DUPLICATE_VIDEO' ? 'View Existing' : 'OK'}
        />
      )}
    </div>
    </DashboardInsightsProvider>
  );
}
