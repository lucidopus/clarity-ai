import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import { IUserPreferences } from '@/lib/models/User';

interface SubjectsStepProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

export default function SubjectsStep({ preferences, onNext, onBack, loading }: SubjectsStepProps) {
  const [subjects, setSubjects] = useState<string[]>(preferences.subjects || []);
  const [expertiseLevel, setExpertiseLevel] = useState<IUserPreferences['expertiseLevel']>(
    preferences.expertiseLevel || 'Beginner'
  );
  const [customSubject, setCustomSubject] = useState('');

  const commonSubjects = [
    'Mathematics', 'Science', 'History', 'Literature', 'Computer Science',
    'Business', 'Economics', 'Psychology', 'Art', 'Music', 'Languages',
    'Philosophy', 'Engineering', 'Medicine', 'Law'
  ];

  const levels = [
    { value: 'Beginner' as const, label: 'Beginner - New to the subject' },
    { value: 'Intermediate' as const, label: 'Intermediate - Some knowledge' },
    { value: 'Advanced' as const, label: 'Advanced - Deep expertise' },
  ];

  const handleSubjectToggle = (subject: string) => {
    setSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleAddCustomSubject = () => {
    if (customSubject.trim() && !subjects.includes(customSubject.trim())) {
      setSubjects(prev => [...prev, customSubject.trim()]);
      setCustomSubject('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subjects.length > 0) {
      onNext({ subjects, expertiseLevel });
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
          Subjects & Expertise Level 📖
        </h2>
        <p className="text-lg text-muted-foreground">
          Tell us about your areas of interest and your current knowledge level.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Select subjects:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {commonSubjects.map((subject) => (
              <motion.button
                key={subject}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-3 rounded-lg border-2 text-sm transition-all ${
                  subjects.includes(subject)
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-border hover:border-accent/50 text-foreground'
                }`}
                onClick={() => handleSubjectToggle(subject)}
              >
                {subject}
              </motion.button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Add a custom subject (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="e.g., Machine Learning"
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCustomSubject}
                disabled={!customSubject.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Your expertise level:</h3>
          <div className="space-y-3">
            {levels.map((level) => (
              <label key={level.value} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="expertiseLevel"
                  value={level.value}
                  checked={expertiseLevel === level.value}
                  onChange={(e) => setExpertiseLevel(e.target.value as IUserPreferences['expertiseLevel'])}
                  className="text-accent focus:ring-accent"
                />
                <span className="text-foreground">{level.label}</span>
              </label>
            ))}
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Selected subjects:</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent/10 text-accent"
                >
                  {subject}
                  <button
                    type="button"
                    onClick={() => handleSubjectToggle(subject)}
                    className="ml-2 text-accent hover:text-accent/80"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
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
            disabled={subjects.length === 0 || loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}