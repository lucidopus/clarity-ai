'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import RankedChipSelector from '../ui/RankedChipSelector';
import TimeBlockCard from '../ui/TimeBlockCard';
import { IUserPreferences } from '@/lib/models/User';

interface Step5PreferencesProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
  isEditMode?: boolean;
}

/**
 * Step 5: Learning Preferences
 *
 * Collects:
 * - preferredMaterialsRanked: Max 3 learning materials, ordered by preference
 * - dailyTimeMinutes: Daily time commitment
 */
export default function Step5Preferences({
  preferences,
  onNext,
  onBack,
  isLast,
  loading,
  isEditMode = false,
}: Step5PreferencesProps) {
  const [preferredMaterials, setPreferredMaterials] = useState<string[]>(
    preferences.preferredMaterialsRanked || []
  );
  const [dailyTime, setDailyTime] = useState<number | null>(
    preferences.dailyTimeMinutes || null
  );

  const materialOptions = [
    'Flashcards',
    'Quizzes',
    'Video Timestamps',
    'Interactive Transcripts',
    'Study Guides',
    'Mind Maps',
  ];

  const timeOptions = [
    { id: 'time-15', minutes: 15, label: 'Quick Sessions' },
    { id: 'time-30', minutes: 30, label: 'Focused Study' },
    { id: 'time-60', minutes: 60, label: 'Deep Learning' },
    { id: 'time-90', minutes: 90, label: 'Extended Study' },
    { id: 'time-120', minutes: 120, label: 'Intensive Sessions' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (preferredMaterials.length > 0 && dailyTime !== null) {
      onNext({
        preferredMaterialsRanked: preferredMaterials,
        dailyTimeMinutes: dailyTime,
      });
    }
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
          Your Learning Preferences
        </h2>
        <p className="text-lg text-muted-foreground">
          Tell us what works best for you so we can prioritize the right materials.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Preferred Materials Ranking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <RankedChipSelector
            label="What learning materials do you prefer?"
            options={materialOptions}
            selectedOptions={preferredMaterials}
            onChange={setPreferredMaterials}
            maxSelections={3}
            description="Select up to 3 in order of preference (1st = most preferred)"
          />
        </motion.div>

        {/* Daily Time Commitment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              How much time can you dedicate daily?
            </label>
            <p className="text-xs text-muted-foreground">
              Choose a realistic commitment that you can sustain
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {timeOptions.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.2,
                  delay: 0.25 + index * 0.05,
                  ease: 'easeOut',
                }}
              >
                <TimeBlockCard
                  id={option.id}
                  label={option.label}
                  minutes={option.minutes}
                  isSelected={dailyTime === option.minutes}
                  onSelect={() => setDailyTime(option.minutes)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Encouraging Message */}
        {preferredMaterials.length > 0 && dailyTime !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-accent/5 border border-accent/20 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0">✨</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">
                  Great choices!
                </p>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll prioritize{' '}
                  <strong className="text-accent">
                    {preferredMaterials.join(', ')}
                  </strong>{' '}
                  and design learning sessions that fit your{' '}
                  <strong className="text-accent">{dailyTime}-minute</strong> daily commitment.
                </p>
              </div>
            </div>
          </motion.div>
        )}

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
          <Button
            type="submit"
            variant="primary"
            disabled={preferredMaterials.length === 0 || dailyTime === null || loading}
          >
            {loading ? 'Saving...' : isLast ? (isEditMode ? 'Update Information' : 'Complete Setup') : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
