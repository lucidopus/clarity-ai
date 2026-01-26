'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';
import GlobalSearch from '@/components/GlobalSearch';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleCustomEvent = () => setIsSearchOpen(true);

    window.addEventListener('open-global-search', handleCustomEvent);
    
    return () => {
        window.removeEventListener('open-global-search', handleCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/signin');
      } else {
        // Check if user has completed onboarding
        const hasLearningPreferences = !!(
          user.preferences?.learning &&
          (
            // Check if any of these fields have actual data
            (user.preferences.learning.role) ||
            (user.preferences.learning.learningGoals && user.preferences.learning.learningGoals.length > 0) ||
            (user.preferences.learning.preferredMaterialsRanked && user.preferences.learning.preferredMaterialsRanked.length > 0) ||
            (user.preferences.learning.dailyTimeMinutes && user.preferences.learning.dailyTimeMinutes > 0) ||
            (user.preferences.learning.personalityProfile &&
             Object.keys(user.preferences.learning.personalityProfile).length > 0 &&
             Object.values(user.preferences.learning.personalityProfile).some(v => v !== undefined))
          )
        );

        if (!hasLearningPreferences) {
          router.push('/onboarding');
        }
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar Skeleton */}
        <div className="w-64 bg-card-bg border-r border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <div className="h-8 bg-accent/20 rounded animate-pulse w-32"></div>
          </div>
          <div className="flex-1 p-4">
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                  <div className="w-5 h-5 bg-secondary/20 rounded animate-pulse"></div>
                  <div className="h-4 bg-secondary/20 rounded animate-pulse flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area Skeleton */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="h-8 bg-secondary/20 rounded mb-2 animate-pulse w-48"></div>
                <div className="h-4 bg-secondary/20 rounded animate-pulse w-64"></div>
              </div>
              <div className="h-10 bg-accent/20 rounded-lg animate-pulse w-32"></div>
            </div>

            {/* Content Skeleton */}
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

              {/* Charts Skeleton */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                  <div className="bg-card-bg rounded-xl border border-border p-6">
                    <div className="h-6 bg-secondary/20 rounded mb-4 animate-pulse w-48"></div>
                    <div className="grid grid-cols-7 gap-1 mb-4">
                      {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="aspect-square bg-secondary/10 rounded animate-pulse"></div>
                      ))}
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
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="p-4 rounded-full bg-red-100 text-red-600 inline-block">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Service Unavailable</h2>
          <p className="text-muted-foreground">
            We&apos;re having trouble verifying your session. This might be due to a temporary connection issue.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {children}
        </div>
      </main>
      
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
