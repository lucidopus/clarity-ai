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

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<Partial<IUserPreferences>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshUser } = useAuth();

  // Load from localStorage on mount
  useEffect(() => {
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
  }, []);

  // Save to localStorage whenever step or preferences change
  useEffect(() => {
    localStorage.setItem('onboarding-progress', JSON.stringify({
      step: currentStep,
      data: preferences,
    }));
  }, [currentStep, preferences]);

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
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPreferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      // Clear localStorage
      localStorage.removeItem('onboarding-progress');

      // Refresh user data in auth context to get updated preferences
      await refreshUser();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Handle error - maybe show a message
    } finally {
      setLoading(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ProgressIndicator currentStep={currentStep} totalSteps={steps.length} />

        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-card rounded-lg shadow-lg p-8"
            >
              <CurrentStepComponent
                preferences={preferences}
                onNext={handleNext}
                onBack={handleBack}
                isFirst={currentStep === 0}
                isLast={currentStep === steps.length - 1}
                loading={loading}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}