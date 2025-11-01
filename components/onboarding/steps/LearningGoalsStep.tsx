import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import { IUserPreferences } from '@/lib/models/User';

interface LearningGoalsStepProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

export default function LearningGoalsStep({ preferences, onNext, onBack, loading }: LearningGoalsStepProps) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>(preferences.learningGoals || []);
  const [customGoal, setCustomGoal] = useState('');

  const goals = [
    'Exam preparation',
    'Skill acquisition',
    'Knowledge retention',
    'Professional development',
    'Personal interest',
    'Career advancement',
  ];

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleAddCustomGoal = () => {
    if (customGoal.trim() && !selectedGoals.includes(customGoal.trim())) {
      setSelectedGoals(prev => [...prev, customGoal.trim()]);
      setCustomGoal('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoals.length > 0) {
      onNext({ learningGoals: selectedGoals });
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
          What are your learning goals? 🎯
        </h2>
        <p className="text-lg text-muted-foreground">
          Select all that apply to help us tailor your experience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goals.map((goal) => (
            <motion.button
              key={goal}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedGoals.includes(goal)
                  ? 'border-accent bg-accent/5 text-accent'
                  : 'border-border hover:border-accent/50 text-foreground'
              }`}
              onClick={() => handleGoalToggle(goal)}
            >
              {goal}
            </motion.button>
          ))}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Add a custom goal (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder="e.g., Learn data science fundamentals"
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomGoal())}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddCustomGoal}
              disabled={!customGoal.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        {selectedGoals.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Selected goals:</p>
            <div className="flex flex-wrap gap-2">
              {selectedGoals.map((goal) => (
                <span
                  key={goal}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent/10 text-accent"
                >
                  {goal}
                  <button
                    type="button"
                    onClick={() => handleGoalToggle(goal)}
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
            disabled={selectedGoals.length === 0 || loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}