'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/signin');
      } else if (user.preferences) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <div className="border-b border-border bg-card-bg/50">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="h-6 bg-secondary/20 rounded animate-pulse w-32"></div>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="w-8 h-2 bg-secondary/20 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Step Title Skeleton */}
            <div className="text-center mb-8">
              <div className="h-8 bg-secondary/20 rounded mb-2 animate-pulse w-48 mx-auto"></div>
              <div className="h-4 bg-secondary/20 rounded animate-pulse w-64 mx-auto"></div>
            </div>

            {/* Step Content Skeleton */}
            <div className="bg-card-bg rounded-xl border border-border p-8">
              <div className="space-y-6">
                {/* Form fields simulation */}
                <div>
                  <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse w-24"></div>
                  <div className="h-10 bg-background border border-border rounded-lg animate-pulse"></div>
                </div>

                <div>
                  <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse w-32"></div>
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-10 bg-background border border-border rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="h-4 bg-secondary/20 rounded mb-3 animate-pulse w-28"></div>
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-5 h-5 bg-accent/20 rounded animate-pulse"></div>
                        <div className="h-4 bg-secondary/20 rounded animate-pulse flex-1"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Navigation Skeleton */}
              <div className="flex justify-between mt-8">
                <div className="h-10 bg-secondary/20 rounded-lg animate-pulse w-20"></div>
                <div className="h-10 bg-accent/20 rounded-lg animate-pulse w-24"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.preferences) {
    return null; // Will redirect
  }

  return <OnboardingFlow />;
}