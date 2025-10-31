'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import Button from './Button';

interface Prerequisite {
  id: string;
  title: string;
  description: string;
  required: boolean;
}

interface PrerequisitesViewProps {
  prerequisites: Prerequisite[];
}

export default function PrerequisitesView({ prerequisites }: PrerequisitesViewProps) {
  const [completedPrerequisites, setCompletedPrerequisites] = useState<Set<string>>(new Set());

  if (!prerequisites || prerequisites.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No prerequisites</h3>
          <p className="text-muted-foreground">
            This video doesn't have any prerequisites.
          </p>
        </div>
      </div>
    );
  }

  const requiredPrerequisites = prerequisites.filter(p => p.required);
  const optionalPrerequisites = prerequisites.filter(p => !p.required);

  const completedCount = completedPrerequisites.size;
  const totalCount = prerequisites.length;
  const progress = (completedCount / totalCount) * 100;

  const togglePrerequisite = (id: string) => {
    const newCompleted = new Set(completedPrerequisites);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompletedPrerequisites(newCompleted);
    // TODO: API call to save progress
  };

  const PrerequisiteCard = ({ prerequisite, index }: { prerequisite: Prerequisite; index: number }) => {
    const isCompleted = completedPrerequisites.has(prerequisite.id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`p-6 rounded-xl border-2 transition-all duration-200 ${
          isCompleted
            ? 'border-green-500 bg-green-500/5'
            : 'border-border bg-card-bg hover:border-accent/50'
        }`}
      >
        <div className="flex items-start gap-4">
          <button
            onClick={() => togglePrerequisite(prerequisite.id)}
            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              isCompleted
                ? 'border-green-500 bg-green-500'
                : 'border-muted-foreground hover:border-accent'
            }`}
          >
            {isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`font-semibold ${
                isCompleted ? 'text-green-700 dark:text-green-400' : 'text-foreground'
              }`}>
                {prerequisite.title}
              </h3>
              {prerequisite.required && (
                <div className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Required</span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {prerequisite.description}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-foreground">
            Prerequisites Progress
          </div>
          <div className="text-sm text-muted-foreground">
            {completedCount} of {totalCount} completed
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Required Prerequisites */}
      {requiredPrerequisites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Required Prerequisites
          </h2>
          <div className="space-y-4">
            {requiredPrerequisites.map((prerequisite, index) => (
              <PrerequisiteCard
                key={prerequisite.id}
                prerequisite={prerequisite}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* Optional Prerequisites */}
      {optionalPrerequisites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            Optional Prerequisites
          </h2>
          <div className="space-y-4">
            {optionalPrerequisites.map((prerequisite, index) => (
              <PrerequisiteCard
                key={prerequisite.id}
                prerequisite={prerequisite}
                index={index + requiredPrerequisites.length}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completion Message */}
      {completedCount === totalCount && totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            All Prerequisites Completed!
          </h3>
          <p className="text-muted-foreground">
            You're ready to dive into this video content.
          </p>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-8">
        <Button
          variant="secondary"
          onClick={() => setCompletedPrerequisites(new Set())}
        >
          Reset Progress
        </Button>
        {completedCount === totalCount && (
          <Button variant="primary">
            Start Learning
          </Button>
        )}
      </div>
    </div>
  );
}