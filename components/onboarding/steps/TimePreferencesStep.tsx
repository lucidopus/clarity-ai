import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import { IUserPreferences } from '@/lib/models/User';

interface TimePreferencesStepProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

export default function TimePreferencesStep({ preferences, onNext, onBack, loading }: TimePreferencesStepProps) {
  const [timePreferences, setTimePreferences] = useState<IUserPreferences['timePreferences']>(
    preferences.timePreferences || {
      availableTimePerDay: 1,
      availableTimePerWeek: 7,
      preferredSessionLength: 30,
      notificationsEnabled: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ timePreferences });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Time & Schedule Preferences ⏰
        </h2>
        <p className="text-lg text-muted-foreground">
          Help us understand your availability and preferred learning schedule.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Available time per day (hours)
            </label>
            <input
              type="range"
              min="0.5"
              max="8"
              step="0.5"
              value={timePreferences?.availableTimePerDay || 1}
              onChange={(e) => setTimePreferences(prev => ({
                ...prev,
                availableTimePerDay: parseFloat(e.target.value),
                availableTimePerWeek: prev?.availableTimePerWeek || 7,
                preferredSessionLength: prev?.preferredSessionLength || 30,
                notificationsEnabled: prev?.notificationsEnabled ?? true
              }))}
              className="w-full"
            />
            <div className="text-center text-sm text-muted-foreground">
              {timePreferences?.availableTimePerDay || 1} hours
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Available time per week (hours)
            </label>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={timePreferences?.availableTimePerWeek || 7}
              onChange={(e) => setTimePreferences(prev => ({
                ...prev,
                availableTimePerDay: prev?.availableTimePerDay || 1,
                availableTimePerWeek: parseInt(e.target.value),
                preferredSessionLength: prev?.preferredSessionLength || 30,
                notificationsEnabled: prev?.notificationsEnabled ?? true
              }))}
              className="w-full"
            />
            <div className="text-center text-sm text-muted-foreground">
              {timePreferences?.availableTimePerWeek || 7} hours
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Preferred session length (minutes)
          </label>
          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={timePreferences?.preferredSessionLength || 30}
            onChange={(e) => setTimePreferences(prev => ({
              ...prev,
              availableTimePerDay: prev?.availableTimePerDay || 1,
              availableTimePerWeek: prev?.availableTimePerWeek || 7,
              preferredSessionLength: parseInt(e.target.value),
              notificationsEnabled: prev?.notificationsEnabled ?? true
            }))}
            className="w-full"
          />
          <div className="text-center text-sm text-muted-foreground">
            {timePreferences?.preferredSessionLength || 30} minutes
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={timePreferences?.notificationsEnabled ?? true}
              onChange={(e) => setTimePreferences(prev => ({
                ...prev,
                availableTimePerDay: prev?.availableTimePerDay || 1,
                availableTimePerWeek: prev?.availableTimePerWeek || 7,
                preferredSessionLength: prev?.preferredSessionLength || 30,
                notificationsEnabled: e.target.checked
              }))}
              className="text-accent focus:ring-accent"
            />
            <span className="text-foreground">Enable learning reminders and notifications</span>
          </label>
        </div>

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
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}