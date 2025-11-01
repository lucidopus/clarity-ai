import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import { IUserPreferences } from '@/lib/models/User';

interface WelcomeStepProps {
  preferences: Partial<IUserPreferences>;
  onNext: (data: Partial<IUserPreferences>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
}

export default function WelcomeStep({ preferences, onNext, isFirst, loading }: WelcomeStepProps) {
  const [selectedRole, setSelectedRole] = useState<IUserPreferences['role']>(preferences.role || 'Student');

  const roles = [
    {
      value: 'Student' as const,
      title: 'Student',
      description: 'Learning for academic purposes, exams, or coursework',
      icon: '🎓',
    },
    {
      value: 'Teacher' as const,
      title: 'Teacher',
      description: 'Creating content or enhancing teaching materials',
      icon: '👨‍🏫',
    },
    {
      value: 'Professional Learner' as const,
      title: 'Professional Learner',
      description: 'Developing skills for career advancement',
      icon: '💼',
    },
    {
      value: 'Content Creator' as const,
      title: 'Content Creator',
      description: 'Generating educational content and materials',
      icon: '🎬',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ role: selectedRole });
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
          Welcome to Clarity AI! 🎉
        </h2>
        <p className="text-lg text-muted-foreground">
          Let&apos;s personalize your learning experience. First, tell us about your role.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <motion.div
              key={role.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedRole === role.value
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/50'
              }`}
              onClick={() => setSelectedRole(role.value)}
            >
              <div className="text-center">
                <div className="text-4xl mb-3">{role.icon}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {role.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {role.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-end pt-6">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}