import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import { IUserPreferences } from '@/lib/models/User';

interface ContentTypesStepProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

type ContentType = {
  type: NonNullable<IUserPreferences['preferredContentTypes']>[0]['type'];
  frequency: NonNullable<IUserPreferences['preferredContentTypes']>[0]['frequency'];
};

export default function ContentTypesStep({ preferences, onNext, onBack, loading }: ContentTypesStepProps) {
  const [contentTypes, setContentTypes] = useState<ContentType[]>(
    preferences.preferredContentTypes || []
  );

  const availableTypes: NonNullable<IUserPreferences['preferredContentTypes']>[0]['type'][] = [
    'Videos', 'Flashcards', 'Quizzes', 'Transcripts', 'Interactive Summaries'
  ];

  const frequencies: NonNullable<IUserPreferences['preferredContentTypes']>[0]['frequency'][] = [
    'Daily', 'Weekly', 'Monthly', 'As needed'
  ];

  const handleAddContentType = (type: NonNullable<IUserPreferences['preferredContentTypes']>[0]['type']) => {
    if (!contentTypes.find(ct => ct.type === type)) {
      setContentTypes(prev => [...prev, { type, frequency: 'Weekly' }]);
    }
  };

  const handleUpdateFrequency = (type: NonNullable<IUserPreferences['preferredContentTypes']>[0]['type'], frequency: NonNullable<IUserPreferences['preferredContentTypes']>[0]['frequency']) => {
    setContentTypes(prev =>
      prev.map(ct => ct.type === type ? { ...ct, frequency } : ct)
    );
  };

  const handleRemoveContentType = (type: NonNullable<IUserPreferences['preferredContentTypes']>[0]['type']) => {
    setContentTypes(prev => prev.filter(ct => ct.type !== type));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contentTypes.length > 0) {
      onNext({ preferredContentTypes: contentTypes });
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
          Preferred Content Types 📚
        </h2>
        <p className="text-lg text-muted-foreground">
          Choose the types of learning materials you prefer and how often you&apos;d like to see them.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Available content types:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableTypes.map((type) => {
              const isSelected = contentTypes.some(ct => ct.type === type);
              return (
                <motion.button
                  key={type}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-border hover:border-accent/50 text-foreground'
                  }`}
                  onClick={() => handleAddContentType(type)}
                >
                  {type}
                </motion.button>
              );
            })}
          </div>
        </div>

        {contentTypes.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Selected content types:</h3>
            {contentTypes.map((contentType) => (
              <motion.div
                key={contentType.type}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
              >
                <span className="font-medium text-foreground">{contentType.type}</span>
                <div className="flex items-center gap-3">
                  <select
                    value={contentType.frequency}
                    onChange={(e) => handleUpdateFrequency(
                      contentType.type,
                      e.target.value as NonNullable<IUserPreferences['preferredContentTypes']>[0]['frequency']
                    )}
                    className="px-3 py-1 border border-border rounded bg-background text-foreground text-sm"
                  >
                    {frequencies.map((freq) => (
                      <option key={freq} value={freq}>{freq}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveContentType(contentType.type)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

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
            disabled={contentTypes.length === 0 || loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}