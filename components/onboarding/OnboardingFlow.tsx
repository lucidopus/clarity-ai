'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ProgressIndicator from './ProgressIndicator';
import WelcomeStep from './steps/WelcomeStep';
import LearningGoalsStep from './steps/LearningGoalsStep';
import ContentTypesStep from './steps/ContentTypesStep';
import SubjectsStep from './steps/SubjectsStep';
import LearningStyleStep from './steps/LearningStyleStep';
import TechnicalComfortStep from './steps/TechnicalComfortStep';
import TimePreferencesStep from './steps/TimePreferencesStep';
import AdditionalPreferencesStep from './steps/AdditionalPreferencesStep';
import { IUserPreferences } from '@/lib/models/User';

const steps = [
  { id: 'welcome', component: WelcomeStep, title: 'Welcome' },
  { id: 'goals', component: LearningGoalsStep, title: 'Learning Goals' },
  { id: 'content', component: ContentTypesStep, title: 'Content Types' },
  { id: 'subjects', component: SubjectsStep, title: 'Subjects & Expertise' },
  { id: 'style', component: LearningStyleStep, title: 'Learning Style' },
  { id: 'comfort', component: TechnicalComfortStep, title: 'Technical Comfort' },
  { id: 'time', component: TimePreferencesStep, title: 'Time Preferences' },
  { id: 'additional', component: AdditionalPreferencesStep, title: 'Additional Preferences' },
];

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<Partial<IUserPreferences>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    setPreferences(prev => ({ ...prev, ...stepData }));
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      // Clear localStorage
      localStorage.removeItem('onboarding-progress');

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