import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import { IUserPreferences } from '@/lib/models/User';

interface LearningStyleStepProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

export default function LearningStyleStep({ preferences, onNext, onBack, loading }: LearningStyleStepProps) {
  const [selectedStyles, setSelectedStyles] = useState<IUserPreferences['learningStyle']>(
    preferences.learningStyle || []
  );

  const styles = [
    {
      value: 'Visual' as const,
      title: 'Visual',
      description: 'Videos, diagrams, charts, and images',
      icon: '👁️',
    },
    {
      value: 'Auditory' as const,
      title: 'Auditory',
      description: 'Transcripts, audio explanations, and lectures',
      icon: '👂',
    },
    {
      value: 'Reading/Writing' as const,
      title: 'Reading/Writing',
      description: 'Text-based content, notes, and written explanations',
      icon: '📖',
    },
    {
      value: 'Kinesthetic' as const,
      title: 'Kinesthetic',
      description: 'Interactive quizzes, hands-on activities, and practice',
      icon: '✋',
    },
  ];

  const handleStyleToggle = (style: NonNullable<IUserPreferences['learningStyle']>[0]) => {
    setSelectedStyles(prev => {
      if (!prev) return [style];
      return prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStyles && selectedStyles.length > 0) {
      onNext({ learningStyle: selectedStyles });
    }
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
          How do you learn best? 🧠
        </h2>
        <p className="text-lg text-muted-foreground">
          Select your preferred learning styles. You can choose multiple.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {styles.map((style) => (
            <motion.div
              key={style.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedStyles?.includes(style.value)
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/50'
              }`}
              onClick={() => handleStyleToggle(style.value)}
            >
              <div className="text-center">
                <div className="text-4xl mb-3">{style.icon}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {style.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {style.description}
                </p>
              </div>
            </motion.div>
          ))}
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
            disabled={!selectedStyles || selectedStyles.length === 0 || loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}