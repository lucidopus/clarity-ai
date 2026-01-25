'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ProgressIndicator from './ProgressIndicator';
import Step1GoalsContext from './steps/Step1GoalsContext';
import Step2Challenges from './steps/Step2Challenges';
import Step3Personality from './steps/Step3Personality';
import Step4Motivation from './steps/Step4Motivation';
import Step5Preferences from './steps/Step5Preferences';
import { IUserPreferences } from '@/lib/models/User';

const steps = [
  { id: 'goals', component: Step1GoalsContext, title: 'Learning Goals & Context' },
  { id: 'challenges', component: Step2Challenges, title: 'Learning Challenges' },
  { id: 'personality', component: Step3Personality, title: 'Learning Personality' },
  { id: 'motivation', component: Step4Motivation, title: 'Confidence & Motivation' },
  { id: 'preferences', component: Step5Preferences, title: 'Learning Preferences' },
];

interface OnboardingFlowProps {
  isEditMode?: boolean;
}

export default function OnboardingFlow({ isEditMode = false }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<Partial<IUserPreferences>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track if preferences have been loaded in edit mode (used for key-based remounting)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  // Pre-fill from user's existing preferences in edit mode
  useEffect(() => {
    if (isEditMode && user?.preferences?.learning && !preferencesLoaded) {
      console.log('Edit mode: Pre-filling preferences from user data');
      setPreferences({
        role: user.preferences.learning.role,
        learningGoals: user.preferences.learning.learningGoals || [],
        learningGoalText: user.preferences.learning.learningGoalText,
        learningChallenges: user.preferences.learning.learningChallenges || [],
        learningChallengesText: user.preferences.learning.learningChallengesText,
        personalityProfile: user.preferences.learning.personalityProfile,
        preferredMaterialsRanked: user.preferences.learning.preferredMaterialsRanked || [],
        dailyTimeMinutes: user.preferences.learning.dailyTimeMinutes,
      });
      // Mark as loaded - this triggers remounting of step components via key
      setPreferencesLoaded(true);
      // Clear any localStorage progress for edit mode to start fresh
      localStorage.removeItem('onboarding-progress');
    }
  }, [isEditMode, user, preferencesLoaded]);

  // Load from localStorage on mount (only for new onboarding, not edit mode)
  useEffect(() => {
    if (isEditMode) return; // Skip localStorage for edit mode
    
    const saved = localStorage.getItem('onboarding-progress');
    if (saved) {
      try {
        const { step, data } = JSON.parse(saved);
        setCurrentStep(step);
        setPreferences(data);
      } catch (error) {
        console.error('Failed to load onboarding progress:', error);
      }
    }
  }, [isEditMode]);

  // Save to localStorage whenever step or preferences change (only for new onboarding)
  useEffect(() => {
    if (isEditMode) return; // Skip localStorage for edit mode
    
    localStorage.setItem('onboarding-progress', JSON.stringify({
      step: currentStep,
      data: preferences,
    }));
  }, [currentStep, preferences, isEditMode]);

  const handleNext = (stepData: Partial<IUserPreferences>) => {
    const updatedPreferences = { ...preferences, ...stepData };
    setPreferences(updatedPreferences);
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete(updatedPreferences);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async (finalPreferences: Partial<IUserPreferences>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use mode=edit query param for edit mode to trigger rate limiting
      const apiUrl = isEditMode ? '/api/preferences?mode=edit' : '/api/preferences';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPreferences),
      });

      const data = await response.json();

      // Handle rate limit error
      if (response.status === 429) {
        setError(data.message || 'You have reached your monthly limit of profile updates.');
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save preferences');
      }

      // Clear localStorage
      localStorage.removeItem('onboarding-progress');

      // Refresh user data in auth context to get updated preferences
      await refreshUser();

      // Redirect to dashboard (or settings if in edit mode)
      router.push(isEditMode ? '/dashboard/settings' : '/dashboard');
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  // Generate a stable key for step components
  // In edit mode, key changes when preferences are loaded to force remount with new initial values
  const stepKey = isEditMode 
    ? `${currentStep}-edit-${preferencesLoaded ? 'loaded' : 'loading'}`
    : `${currentStep}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Edit mode header */}
        {isEditMode && (
          <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-xl">
            <p className="text-sm text-accent font-medium">
              ✏️ You are updating your learning profile
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        )}

        <ProgressIndicator currentStep={currentStep} totalSteps={steps.length} />

        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepKey}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-card rounded-lg shadow-lg p-8"
            >
              <CurrentStepComponent
                key={stepKey}
                preferences={preferences}
                onNext={handleNext}
                onBack={handleBack}
                isFirst={currentStep === 0}
                isLast={currentStep === steps.length - 1}
                loading={loading}
                isEditMode={isEditMode}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}