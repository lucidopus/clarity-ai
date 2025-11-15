'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GenerationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <div className="border-b border-border bg-card-bg/50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-5 bg-secondary/20 rounded mb-1 animate-pulse w-64"></div>
                  <div className="h-4 bg-secondary/20 rounded animate-pulse w-32"></div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-secondary/20 rounded animate-pulse"></div>
                <div className="w-24 h-8 bg-accent/20 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Materials Tabs Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-card-bg rounded-xl border border-border p-4">
                <div className="space-y-2">
                  {[
                    'Flashcards',
                    'Quizzes',
                    'Video & Transcript',
                    'Mind Map',
                    'AI Tutor',
                  ].map((label, i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                      <div className="w-5 h-5 bg-accent/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-secondary/20 rounded animate-pulse flex-1"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area Skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-card-bg rounded-xl border border-border p-6">
                {/* Tab Header Skeleton */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-accent/20 rounded animate-pulse"></div>
                    <div className="h-6 bg-secondary/20 rounded animate-pulse w-24"></div>
                  </div>
                  <div className="h-8 bg-accent/20 rounded animate-pulse w-20"></div>
                </div>

                {/* Content Skeleton */}
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-background rounded-lg border border-border p-4">
                      <div className="h-5 bg-secondary/20 rounded mb-2 animate-pulse"></div>
                      <div className="h-4 bg-secondary/20 rounded animate-pulse w-3/4"></div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex space-x-2">
                          <div className="w-16 h-6 bg-accent/20 rounded animate-pulse"></div>
                          <div className="w-16 h-6 bg-secondary/20 rounded animate-pulse"></div>
                        </div>
                        <div className="w-8 h-8 bg-secondary/20 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content - Navbar is integrated into the page itself */}
      {children}
    </div>
  );
}
