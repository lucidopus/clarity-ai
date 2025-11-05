'use client';

import { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, BookOpen, MessageCircle, Sparkles, RotateCcw } from 'lucide-react';
import { CHATBOT_NAME } from '@/lib/config';

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

  const togglePrerequisite = useCallback((id: string) => {
    setCompletedPrerequisites(prev => {
      const newCompleted = new Set(prev);
      if (newCompleted.has(id)) {
        newCompleted.delete(id);
      } else {
        newCompleted.add(id);
      }
      return newCompleted;
    });
    // TODO: API call to save progress
  }, []);

  if (!prerequisites || prerequisites.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No prerequisites</h3>
          <p className="text-muted-foreground">
            This video doesn&#39;t have any prerequisites.
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

  const PrerequisiteCard = memo(({ prerequisite, index }: { prerequisite: Prerequisite; index: number }) => {
    const isCompleted = completedPrerequisites.has(prerequisite.id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        onClick={() => togglePrerequisite(prerequisite.id)}
        className={`p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
          isCompleted
            ? 'border-green-500 bg-green-500/5'
            : 'border-border bg-card-bg hover:border-accent/50'
        }`}
      >
        <div className="flex items-start gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePrerequisite(prerequisite.id);
            }}
            className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
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
                <div className={`flex items-center gap-1 ${
                  isCompleted ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                }`}>
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Completed</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Required</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-3">
              {prerequisite.description}
            </p>
            <motion.button
              onClick={() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).dispatchEvent(new CustomEvent('chatbot:open', {
                  detail: { question: `Explain the prerequisite: ${prerequisite.title}` }
                }));
              }}
              className="group relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-lg transition-all duration-300 hover:from-accent/20 hover:to-accent/10 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 cursor-pointer overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Sparkle effect on hover */}
              <motion.div
                className="absolute right-2 top-1 opacity-0 group-hover:opacity-100"
                initial={{ scale: 0, rotate: -180 }}
                whileHover={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Sparkles className="w-3 h-3 text-accent" />
              </motion.div>

              {/* Icon with animation */}
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <MessageCircle className="w-4 h-4 relative z-10" />
              </motion.div>

              {/* Text with subtle animation */}
              <span className="relative z-10 group-hover:text-accent transition-colors duration-200">
                Ask {CHATBOT_NAME}
              </span>

              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-lg bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  });
  PrerequisiteCard.displayName = 'PrerequisiteCard';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-foreground">
            Prerequisites Progress
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} completed
            </div>
            <motion.button
              onClick={() => setCompletedPrerequisites(new Set())}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors duration-200 p-1.5 rounded-md hover:bg-accent/5 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Reset progress"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </motion.button>
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
            <CheckCircle2 className="w-5 h-5 text-accent" />
            Key Prerequisites
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
            You&#39;re ready to dive into this video content.
          </p>
        </motion.div>
      )}


    </div>
  );
}
