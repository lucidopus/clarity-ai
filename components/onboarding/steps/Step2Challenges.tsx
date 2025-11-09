'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import CheckboxCard from '../ui/CheckboxCard';
import { IUserPreferences } from '@/lib/models/User';

interface Step2ChallengesProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

/**
 * Step 2: Learning Challenges
 *
 * Collects:
 * - learningChallenges: Multi-select checkbox cards
 * - learningChallengesText: Optional text elaboration
 */
export default function Step2Challenges({
  preferences,
  onNext,
  onBack,
  loading,
}: Step2ChallengesProps) {
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>(
    preferences.learningChallenges || []
  );
  const [challengesText, setChallengesText] = useState<string>(
    preferences.learningChallengesText || ''
  );

  const challengeOptions = [
    {
      id: 'staying-motivated',
      label: 'Staying Motivated',
      icon: '💪',
      description: 'Hard to maintain consistent study habits',
    },
    {
      id: 'time-management',
      label: 'Time Management',
      icon: '⏰',
      description: 'Balancing learning with other responsibilities',
    },
    {
      id: 'information-overload',
      label: 'Information Overload',
      icon: '🌊',
      description: 'Too much content, unsure where to focus',
    },
    {
      id: 'lack-of-structure',
      label: 'Lack of Structure',
      icon: '🗺️',
      description: 'Need clearer learning paths and organization',
    },
    {
      id: 'retention',
      label: 'Retention Issues',
      icon: '🧠',
      description: 'Difficulty remembering what I learn',
    },
    {
      id: 'procrastination',
      label: 'Procrastination',
      icon: '⏳',
      description: 'Tend to delay study sessions',
    },
  ];

  const handleChallengeToggle = (challengeId: string) => {
    setSelectedChallenges((prev) =>
      prev.includes(challengeId)
        ? prev.filter((c) => c !== challengeId)
        : [...prev, challengeId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow empty selection - challenges are optional
    onNext({
      learningChallenges: selectedChallenges.length > 0 ? selectedChallenges : undefined,
      learningChallengesText: challengesText.trim() || undefined,
    });
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
          What learning challenges do you face?
        </h2>
        <p className="text-lg text-muted-foreground">
          Select any obstacles you encounter. We'll tailor support to help you overcome them.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Challenge Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {challengeOptions.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.05,
                ease: 'easeOut',
              }}
            >
              <CheckboxCard
                id={challenge.id}
                label={challenge.label}
                icon={challenge.icon}
                isSelected={selectedChallenges.includes(challenge.id)}
                onToggle={() => handleChallengeToggle(challenge.id)}
                description={challenge.description}
              />
            </motion.div>
          ))}
        </div>

        {/* Optional Text Elaboration */}
        <div className="space-y-3">
          <label
            htmlFor="challenges-text"
            className="block text-sm font-medium text-foreground"
          >
            Any other challenges? (optional)
          </label>
          <textarea
            id="challenges-text"
            value={challengesText}
            onChange={(e) => setChallengesText(e.target.value)}
            placeholder="e.g., I struggle with staying focused during long videos, or I find it hard to apply concepts to real-world problems..."
            rows={4}
            maxLength={500}
            className="
              w-full px-4 py-3 border border-border rounded-lg
              bg-background text-foreground
              placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
              resize-none
              transition-all duration-200
            "
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Help us understand your unique learning needs</span>
            <span className="tabular-nums">{challengesText.length}/500</span>
          </div>
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
