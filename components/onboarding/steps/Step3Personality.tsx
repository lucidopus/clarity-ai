'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import EmojiSlider from '../ui/EmojiSlider';
import { IUserPreferences } from '@/lib/models/User';
import { scoreConscientiousness, scoreEmotionalStability } from '@/lib/utils/scoring';

interface Step3PersonalityProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
  isEditMode?: boolean;
}

/**
 * Step 3: Learning Personality (Conscientiousness & Emotional Stability)
 *
 * Collects 7 items each for:
 * - Conscientiousness: Organization, planning, persistence
 * - Emotional Stability: Stress management, composure
 *
 * Client-side scoring computes trait averages (1-7 scale)
 */
export default function Step3Personality({
  preferences,
  onNext,
  onBack,
  loading,
}: Step3PersonalityProps) {
  // Initialize from preferences if available, otherwise default to 4 (middle)
  const [conscientiousnessResponses, setConscientiousnessResponses] = useState<number[]>(
    Array(7).fill(4)
  );
  const [emotionalStabilityResponses, setEmotionalStabilityResponses] = useState<number[]>(
    Array(7).fill(4)
  );

  // Note: Step 3 collects raw responses, not final scores
  // The personalityProfile in preferences contains computed scores, not raw responses
  // So we cannot pre-fill the individual slider values from the computed profile
  // The sliders stay at default values in edit mode for this step

  const conscientiousnessItems = [
    { label: 'I make plans and stick to them', low: 'Rarely', high: 'Always' },
    { label: 'I get distracted easily', low: 'Never', high: 'Often' },
    { label: 'I finish what I start', low: 'Rarely', high: 'Always' },
    { label: 'I am organized and methodical', low: 'Not at all', high: 'Very much' },
    { label: 'I procrastinate frequently', low: 'Never', high: 'Often' },
    { label: 'I follow through on commitments', low: 'Rarely', high: 'Always' },
    { label: 'I lose track of time when studying', low: 'Never', high: 'Often' },
  ];

  const emotionalStabilityItems = [
    { label: 'I stay calm under pressure', low: 'Rarely', high: 'Always' },
    { label: 'I get stressed easily', low: 'Never', high: 'Often' },
    { label: 'I handle setbacks well', low: 'Poorly', high: 'Very well' },
    { label: 'I worry about making mistakes', low: 'Never', high: 'Often' },
    { label: 'I remain composed during challenges', low: 'Rarely', high: 'Always' },
    { label: 'I feel overwhelmed by difficult tasks', low: 'Never', high: 'Often' },
    { label: 'I bounce back quickly from failures', low: 'Slowly', high: 'Quickly' },
  ];

  const handleConscientiousnessChange = (index: number, value: number) => {
    const newResponses = [...conscientiousnessResponses];
    newResponses[index] = value;
    setConscientiousnessResponses(newResponses);
  };

  const handleEmotionalStabilityChange = (index: number, value: number) => {
    const newResponses = [...emotionalStabilityResponses];
    newResponses[index] = value;
    setEmotionalStabilityResponses(newResponses);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Compute trait scores on client side
    const conscientiousness = scoreConscientiousness(conscientiousnessResponses);
    const emotionalStability = scoreEmotionalStability(emotionalStabilityResponses);

    // Merge with existing personality profile or create new one
    const personalityProfile = {
      conscientiousness,
      emotionalStability,
      selfEfficacy: preferences.personalityProfile?.selfEfficacy || 4,
      masteryOrientation: preferences.personalityProfile?.masteryOrientation || 4,
      performanceOrientation: preferences.personalityProfile?.performanceOrientation || 4,
    };

    onNext({ personalityProfile });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-3">
          Your Learning Personality
        </h2>
        <p className="text-lg text-muted-foreground">
          Rate each statement honestly. There are no right or wrong answers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Conscientiousness Section */}
        <div className="space-y-6">
          <div className="pb-3 border-b border-border">
            <h3 className="text-xl font-semibold text-foreground">
              Organization & Planning
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              How you approach tasks and manage your time
            </p>
          </div>

          {conscientiousnessItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.05,
                ease: 'easeOut',
              }}
            >
              <EmojiSlider
                label={item.label}
                value={conscientiousnessResponses[index]}
                onChange={(value) => handleConscientiousnessChange(index, value)}
                lowLabel={item.low}
                highLabel={item.high}
              />
            </motion.div>
          ))}
        </div>

        {/* Emotional Stability Section */}
        <div className="space-y-6">
          <div className="pb-3 border-b border-border">
            <h3 className="text-xl font-semibold text-foreground">
              Stress Management & Composure
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              How you handle pressure and setbacks
            </p>
          </div>

          {emotionalStabilityItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.2,
                delay: (index + 7) * 0.05, // Continue stagger from previous section
                ease: 'easeOut',
              }}
            >
              <EmojiSlider
                label={item.label}
                value={emotionalStabilityResponses[index]}
                onChange={(value) => handleEmotionalStabilityChange(index, value)}
                lowLabel={item.low}
                highLabel={item.high}
              />
            </motion.div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={loading}
          >
            Back
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
