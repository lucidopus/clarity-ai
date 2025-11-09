'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import EmojiSlider from '../ui/EmojiSlider';
import { IUserPreferences } from '@/lib/models/User';
import { scoreSelfEfficacy } from '@/lib/utils/scoring';

interface Step4MotivationProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

/**
 * Step 4: Confidence & Motivation
 *
 * Part A: Self-Efficacy (3 items - compute average)
 * Part B: Goal Orientations (2 separate sliders - direct values)
 */
export default function Step4Motivation({
  preferences,
  onNext,
  onBack,
  loading,
}: Step4MotivationProps) {
  // Initialize from preferences if available, otherwise default to 4 (middle)
  const [selfEfficacyResponses, setSelfEfficacyResponses] = useState<number[]>(
    Array(3).fill(4)
  );
  const [masteryOrientation, setMasteryOrientation] = useState<number>(
    preferences.personalityProfile?.masteryOrientation || 4
  );
  const [performanceOrientation, setPerformanceOrientation] = useState<number>(
    preferences.personalityProfile?.performanceOrientation || 4
  );

  const selfEfficacyItems = [
    {
      label: 'I can figure out most things if I try hard enough',
      low: 'Disagree',
      high: 'Agree',
    },
    {
      label: 'Even challenging material is learnable for me',
      low: 'Disagree',
      high: 'Agree',
    },
    {
      label: 'I believe I can master difficult concepts with effort',
      low: 'Disagree',
      high: 'Agree',
    },
  ];

  const handleSelfEfficacyChange = (index: number, value: number) => {
    const newResponses = [...selfEfficacyResponses];
    newResponses[index] = value;
    setSelfEfficacyResponses(newResponses);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Compute self-efficacy score (average of 3 items)
    const selfEfficacy = scoreSelfEfficacy(selfEfficacyResponses);

    // Merge with existing personality profile
    const personalityProfile = {
      conscientiousness: preferences.personalityProfile?.conscientiousness || 4,
      emotionalStability: preferences.personalityProfile?.emotionalStability || 4,
      selfEfficacy,
      masteryOrientation,
      performanceOrientation,
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
          Confidence & Motivation
        </h2>
        <p className="text-lg text-muted-foreground">
          Help us understand your learning confidence and what drives you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Self-Efficacy */}
        <div className="space-y-6">
          <div className="pb-3 border-b border-border">
            <h3 className="text-xl font-semibold text-foreground">
              Your Confidence
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              How confident are you in your ability to learn new things?
            </p>
          </div>

          {selfEfficacyItems.map((item, index) => (
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
                value={selfEfficacyResponses[index]}
                onChange={(value) => handleSelfEfficacyChange(index, value)}
                lowLabel={item.low}
                highLabel={item.high}
              />
            </motion.div>
          ))}
        </div>

        {/* Goal Orientations */}
        <div className="space-y-6">
          <div className="pb-3 border-b border-border">
            <h3 className="text-xl font-semibold text-foreground">
              What Motivates You?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Different people learn for different reasons. Both are equally valid!
            </p>
          </div>

          {/* Mastery Orientation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.2,
              delay: 0.15,
              ease: 'easeOut',
            }}
          >
            <EmojiSlider
              label="I learn because I enjoy understanding new concepts"
              value={masteryOrientation}
              onChange={setMasteryOrientation}
              lowLabel="Not important"
              highLabel="Very important"
              description="Mastery orientation: Learning for the sake of growth and understanding"
            />
          </motion.div>

          {/* Performance Orientation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.2,
              delay: 0.2,
              ease: 'easeOut',
            }}
          >
            <EmojiSlider
              label="I learn to demonstrate competence and achieve goals"
              value={performanceOrientation}
              onChange={setPerformanceOrientation}
              lowLabel="Not important"
              highLabel="Very important"
              description="Performance orientation: Learning to achieve specific outcomes"
            />
          </motion.div>

          {/* Helpful Context Box */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-accent/5 border border-accent/20 rounded-lg"
          >
            <p className="text-sm text-foreground leading-relaxed">
              <strong className="text-accent">Note:</strong> Most successful learners have a mix of both orientations.
              Mastery helps you build deep understanding, while performance keeps you focused on concrete goals.
            </p>
          </motion.div>
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
