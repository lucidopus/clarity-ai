'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

function OnboardingContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('mode') === 'edit';

  useEffect(() => {
    console.log('Onboarding useEffect - loading:', loading, 'user:', user ? 'exists' : 'null', 'isEditMode:', isEditMode);
    if (!loading) {
      if (!user) {
        console.log('Onboarding - No user, redirecting to signin');
        router.push('/auth/signin');
      } else {
        // Check if learning preferences exist AND have actual meaningful data
        console.log('Onboarding - user.preferences:', JSON.stringify(user.preferences, null, 2));

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

        console.log('Onboarding - hasLearningPreferences:', hasLearningPreferences);

        // Only redirect if NOT in edit mode
        if (hasLearningPreferences && !isEditMode) {
          // User has completed onboarding, redirect to dashboard
          console.log('Onboarding - Has learning preferences and not in edit mode, redirecting to dashboard');
          router.push('/dashboard');
        } else if (isEditMode) {
          console.log('Onboarding - In edit mode, staying on onboarding page');
        } else {
          console.log('Onboarding - No learning preferences, staying on onboarding page');
        }
      }
    }
  }, [user, loading, router, isEditMode]);

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

  // Don't render if user is not logged in or has already completed onboarding (unless in edit mode)
  const hasLearningPreferences = !!(
    user?.preferences?.learning &&
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

  console.log('Onboarding render - user:', user ? 'exists' : 'null', 'hasLearningPreferences:', hasLearningPreferences, 'isEditMode:', isEditMode);

  // Redirect if not logged in, or if has preferences and NOT in edit mode
  if (!user || (hasLearningPreferences && !isEditMode)) {
    console.log('Onboarding render - Returning null (will redirect)');
    return null; // Will redirect
  }

  console.log('Onboarding render - Rendering OnboardingFlow with isEditMode:', isEditMode);
  return <OnboardingFlow isEditMode={isEditMode} />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}