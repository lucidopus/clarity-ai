import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import { IUserPreferences } from '@/lib/models/User';

interface AdditionalPreferencesStepProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

export default function AdditionalPreferencesStep({ preferences, onNext, onBack, loading }: AdditionalPreferencesStepProps) {
  const [additionalPreferences, setAdditionalPreferences] = useState<NonNullable<IUserPreferences['additionalPreferences']>>(
    preferences.additionalPreferences || {
      collaborationEnabled: false,
      dataPrivacyLevel: 'Standard',
    }
  );

  const privacyLevels = [
    {
      value: 'Standard' as const,
      title: 'Standard Privacy',
      description: 'Basic privacy protections with personalized recommendations',
    },
    {
      value: 'Enhanced' as const,
      title: 'Enhanced Privacy',
      description: 'Maximum privacy with limited personalization',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ additionalPreferences });
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
          Additional Preferences 🎛️
        </h2>
        <p className="text-lg text-muted-foreground">
          Final preferences to complete your personalized experience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Collaboration & Sharing:</h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={additionalPreferences.collaborationEnabled}
                onChange={(e) => setAdditionalPreferences(prev => ({
                  ...prev,
                  collaborationEnabled: e.target.checked
                }))}
                className="text-accent focus:ring-accent"
              />
              <div>
                <div className="font-medium text-foreground">Enable collaboration features</div>
                <div className="text-sm text-muted-foreground">
                  Allow sharing materials and participating in group activities
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Data Privacy & Personalization:</h3>
          <div className="space-y-3">
            {privacyLevels.map((level) => (
              <motion.label
                key={level.value}
                whileHover={{ scale: 1.01 }}
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  additionalPreferences.dataPrivacyLevel === level.value
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/50'
                }`}
                onClick={() => setAdditionalPreferences(prev => ({
                  ...prev,
                  dataPrivacyLevel: level.value
                }))}
              >
                <input
                  type="radio"
                  name="dataPrivacyLevel"
                  value={level.value}
                  checked={additionalPreferences.dataPrivacyLevel === level.value}
                  onChange={(e) => setAdditionalPreferences(prev => ({
                    ...prev,
                    dataPrivacyLevel: e.target.value as NonNullable<IUserPreferences['additionalPreferences']>['dataPrivacyLevel']
                  }))}
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

        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h4 className="font-semibold text-foreground mb-2">🎉 You&apos;re almost done!</h4>
          <p className="text-sm text-muted-foreground">
            Based on your preferences, we&apos;ll create personalized learning materials,
            recommend content that matches your goals, and adapt our interface to your needs.
          </p>
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
            {loading ? 'Completing Setup...' : 'Complete Setup'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}