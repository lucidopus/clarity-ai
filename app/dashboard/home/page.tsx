'use client';

import { useRouter } from 'next/navigation';
import { BarChart3, Flame, Library, Layers, ListChecks } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/DashboardHeader';
import GenerateModal from '@/components/GenerateModal';
import Button from '@/components/Button';
import { useState, useEffect } from 'react';
import EmptyState from '@/components/EmptyState';
import StatCard from '@/components/StatCard';
import StudyActivityHeatmap from '@/components/StudyActivityHeatmap';
import WeeklyActivityChart from '@/components/WeeklyActivityChart';
import ProgressBarCard from '@/components/ProgressBarCard';
import MotivationBanner from '@/components/MotivationBanner';
import RecentVideoCard from '@/components/RecentVideoCard';

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
  }, [user]);

  const handleGenerate = async (youtubeUrl: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate materials');
      }

      const data = await response.json();
      setShowGenerateModal(false);
      router.push(`/dashboard/generations/${data.videoId}`);
    } catch (error: unknown) {
      console.error('Generation error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred'); // Simple alert for now
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      {/* Page Header */}
      <DashboardHeader
        title={`${greeting}, ${user.firstName}`}
        onGenerateClick={() => setShowGenerateModal(true)}
      />

      {/* Loading/Error */}
      {loading && (
        <div className="bg-card-bg rounded-2xl border border-border min-h-[300px] flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading your dashboard…</div>
        </div>
      )}
      {error && (
        <div className="bg-card-bg rounded-2xl border border-border min-h-[300px] flex items-center justify-center">
          <div className="text-sm text-red-500">{error}</div>
        </div>
      )}

      {!loading && !error && stats && (
        <div className="space-y-8">
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={<Library className="w-5 h-5" />} label="Videos" value={stats.totalVideos} trend={{ value: `+${stats.videosThisWeek} this week`, isPositive: true }} />
            <StatCard icon={<Layers className="w-5 h-5" />} label="Flashcards" value={stats.totalFlashcards} trend={{ value: `${stats.flashcardsMastered} mastered`, isPositive: true }} />
            <StatCard icon={<ListChecks className="w-5 h-5" />} label="Quizzes" value={stats.totalQuizzes} trend={{ value: `${stats.averageQuizScore}% avg`, isPositive: true }} />
            <StatCard icon={<Flame className="w-5 h-5" />} label="Streak" value={stats.currentStreak} trend={{ value: `${stats.longestStreak} longest`, isPositive: true }} />
          </div>

          {/* Heatmap + Weekly Chart */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <StudyActivityHeatmap />
            </div>
            <div className="h-full">
              <WeeklyActivityChart />
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
                 {recentVideos.map(v => (
                   <RecentVideoCard
                     key={v._id}
                     title={v.title}
                     createdAt={v.createdAt}
                     onClick={() => router.push(`/dashboard/generations/${v._id}`)}
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
    </div>
  );
}
