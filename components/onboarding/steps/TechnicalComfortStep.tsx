import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import { IUserPreferences } from '@/lib/models/User';

interface TechnicalComfortStepProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

export default function TechnicalComfortStep({ preferences, onNext, onBack, loading }: TechnicalComfortStepProps) {
  const [technicalComfort, setTechnicalComfort] = useState<IUserPreferences['technicalComfort']>(
    preferences.technicalComfort || 'Beginner'
  );
  const [accessibility, setAccessibility] = useState<IUserPreferences['accessibility']>(
    preferences.accessibility || {
      largerText: false,
      voiceNarration: false,
      simplifiedInterface: false,
    }
  );

  const comfortLevels = [
    {
      value: 'Beginner' as const,
      title: 'Beginner',
      description: 'New to online learning tools and need guidance',
    },
    {
      value: 'Intermediate' as const,
      title: 'Intermediate',
      description: 'Comfortable with basic tools but need some help',
    },
    {
      value: 'Advanced' as const,
      title: 'Advanced',
      description: 'Experienced with various learning platforms and tools',
    },
  ];

  const accessibilityOptions = [
    {
      key: 'largerText' as const,
      label: 'Larger text for better readability',
    },
    {
      key: 'voiceNarration' as const,
      label: 'Voice narration for content',
    },
    {
      key: 'simplifiedInterface' as const,
      label: 'Simplified interface with fewer options',
    },
  ];

  const handleAccessibilityChange = (key: keyof NonNullable<IUserPreferences['accessibility']>, value: boolean) => {
    setAccessibility(prev => {
      if (!prev) {
        return { largerText: false, voiceNarration: false, simplifiedInterface: false, [key]: value };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ technicalComfort, accessibility });
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
          Technical Comfort & Accessibility ⚙️
        </h2>
        <p className="text-lg text-muted-foreground">
          Help us understand your comfort level with technology and any accessibility needs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Your technical comfort level:</h3>
          <div className="space-y-3">
            {comfortLevels.map((level) => (
              <motion.label
                key={level.value}
                whileHover={{ scale: 1.01 }}
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  technicalComfort === level.value
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/50'
                }`}
                onClick={() => setTechnicalComfort(level.value)}
              >
                <input
                  type="radio"
                  name="technicalComfort"
                  value={level.value}
                  checked={technicalComfort === level.value}
                  onChange={(e) => setTechnicalComfort(e.target.value as IUserPreferences['technicalComfort'])}
                  className="mt-1 text-accent focus:ring-accent"
                />
                <div>
                  <div className="font-medium text-foreground">{level.title}</div>
                  <div className="text-sm text-muted-foreground">{level.description}</div>
                </div>
              </motion.label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Accessibility preferences (optional):</h3>
          <div className="space-y-3">
            {accessibilityOptions.map((option) => (
              <label key={option.key} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={accessibility?.[option.key] || false}
                  onChange={(e) => handleAccessibilityChange(option.key, e.target.checked)}
                  className="text-accent focus:ring-accent"
                />
                <span className="text-foreground">{option.label}</span>
              </label>
            ))}
          </div>
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