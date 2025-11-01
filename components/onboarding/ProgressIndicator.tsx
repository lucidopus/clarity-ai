import { motion } from 'framer-motion';
import { Check, User, Target, FileText, BookOpen, Brain, Settings, Clock, MoreHorizontal } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const stepIcons = [
  User, // Welcome and Role
  Target, // Learning Goals
  FileText, // Content Types
  BookOpen, // Subjects & Expertise
  Brain, // Learning Style
  Settings, // Technical Comfort
  Clock, // Time Preferences
  MoreHorizontal, // Additional Preferences
];

export default function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        {Array.from({ length: totalSteps }, (_, index) => {
          const Icon = stepIcons[index];
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={index} className="flex flex-col items-center">
              <motion.div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCompleted
                    ? 'bg-accent border-accent text-white'
                    : isCurrent
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border text-muted-foreground bg-background'
                }`}
                initial={{ scale: 0.8 }}
                animate={{ scale: isCurrent ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
              </motion.div>
              <span className={`text-xs mt-2 text-center ${
                isCurrent ? 'text-accent font-medium' : 'text-muted-foreground'
              }`}>
                Step {index + 1}
              </span>
            </div>
          );
        })}
      </div>

      <motion.div
        className="h-2 bg-border rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-full bg-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
}