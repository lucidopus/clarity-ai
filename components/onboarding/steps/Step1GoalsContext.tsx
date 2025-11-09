'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import { IUserPreferences } from '@/lib/models/User';

interface Step1GoalsContextProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

/**
 * Step 1: Learning Goals & Context
 *
 * Collects:
 * - role: Single-select (Student, Teacher, Working Professional, Content Creator)
 * - learningGoals: Multi-select cards (pre-defined options)
 * - learningGoalText: Optional text elaboration
 */
export default function Step1GoalsContext({
  preferences,
  onNext,
  onBack,
  isFirst,
  loading,
}: Step1GoalsContextProps) {
  const [selectedRole, setSelectedRole] = useState<string>(
    preferences.role || ''
  );
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    preferences.learningGoals || []
  );
  const [goalText, setGoalText] = useState<string>(
    preferences.learningGoalText || ''
  );

  const roleOptions = [
    { id: 'Student', label: 'Student', icon: '🎓', description: 'Currently enrolled in formal education' },
    { id: 'Teacher', label: 'Teacher', icon: '👨‍🏫', description: 'Educator or instructor' },
    { id: 'Working Professional', label: 'Working Professional', icon: '💼', description: 'Learning for career development' },
    { id: 'Content Creator', label: 'Content Creator', icon: '🎬', description: 'Creating educational content' },
  ];

  const goalOptions = [
    { id: 'exam-prep', label: 'Exam Preparation', icon: '📝' },
    { id: 'career-change', label: 'Career Change', icon: '🚀' },
    { id: 'skill-building', label: 'Skill Building', icon: '🛠️' },
    { id: 'academic-success', label: 'Academic Success', icon: '🎓' },
    { id: 'personal-interest', label: 'Personal Interest', icon: '💡' },
    { id: 'professional-dev', label: 'Professional Development', icon: '📈' },
  ];

  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole && selectedGoals.length > 0) {
      onNext({
        role: selectedRole as 'Student' | 'Teacher' | 'Working Professional' | 'Content Creator',
        learningGoals: selectedGoals,
        learningGoalText: goalText.trim() || undefined,
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
          Tell us about yourself (skip the AI)
        </h2>
        <p className="text-lg text-muted-foreground">
          We&apos;ll use this to personalize your materials. The more real you are, the better they&apos;ll be.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Role Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              I am a...
            </label>
            <p className="text-xs text-muted-foreground">
              This helps us understand your learning context
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roleOptions.map((role, index) => {
              const isSelected = selectedRole === role.id;

              return (
                <motion.button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.05,
                    ease: 'easeOut',
                  }}
                  className={`
                    relative p-4 rounded-lg border-2 text-left
                    transition-all duration-200 ease-out
                    cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
                    dark:focus:ring-offset-background
                    ${
                      isSelected
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50 bg-card'
                    }
                  `}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0" aria-hidden="true">
                      {role.icon}
                    </div>
                    <div className="flex-1 pr-6">
                      <div className={`font-medium ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                        {role.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {role.description}
                      </div>
                    </div>
                  </div>

                  {/* Radio indicator */}
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isSelected ? 1 : 0,
                      scale: isSelected ? 1 : 0.5,
                    }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute top-3 right-3"
                    aria-hidden="true"
                  >
                    <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  </motion.div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Goal Selection Cards */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              What are your learning goals?
            </label>
            <p className="text-xs text-muted-foreground">
              Select all that apply
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goalOptions.map((goal, index) => {
            const isSelected = selectedGoals.includes(goal.id);

            return (
              <motion.button
                key={goal.id}
                type="button"
                onClick={() => handleGoalToggle(goal.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.05,
                  ease: 'easeOut',
                }}
                className={`
                  relative p-5 rounded-lg border-2 text-left
                  transition-all duration-200 ease-out
                  min-h-[88px] cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
                  dark:focus:ring-offset-background
                  ${
                    isSelected
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-border hover:border-accent/50 text-foreground bg-card'
                  }
                `}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl shrink-0" aria-hidden="true">
                    {goal.icon}
                  </div>
                  <div className="flex-1 font-medium pr-6">{goal.label}</div>
                </div>

                {/* Checkmark */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: isSelected ? 1 : 0,
                    scale: isSelected ? 1 : 0.5,
                  }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute top-3 right-3"
                  aria-hidden="true"
                >
                  <svg
                    className="w-5 h-5 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
              </motion.button>
            );
          })}
          </div>
        </div>

        {/* Optional Text Elaboration */}
        <div className="space-y-3">
          <label
            htmlFor="goal-text"
            className="block text-sm font-medium text-foreground"
          >
            Tell us more about your goals (optional)
          </label>
          <textarea
            id="goal-text"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="e.g., I want to transition into data science and need to build foundational skills in statistics and Python..."
            rows={4}
            maxLength={800}
            className="
              w-full px-4 py-3 border border-border rounded-lg
              bg-background text-foreground
              placeholder:text-foreground/40
              dark:placeholder:text-foreground/50
              focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
              resize-none
              transition-all duration-200
            "
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span className="italic">Authentic answers get you materials that actually work for you</span>
            <span className="tabular-nums">{goalText.length}/800</span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isFirst || loading}
            className={isFirst ? 'invisible' : ''}
          >
            Back
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!selectedRole || selectedGoals.length === 0 || loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
