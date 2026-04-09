'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { computeBrierScore, getCalibrationLabel } from '@/lib/services/calibration';
import { Quiz } from './QuizInterface';

interface ConfidenceMapProps {
  quizzes: Quiz[];
  answers: (number | string | null | undefined)[];
  confidenceRatings: (1 | 2 | 3 | null)[];
}

interface QuadrantItem {
  quiz: Quiz;
  index: number;
  answer: number | string | null | undefined;
  isCorrect: boolean;
  confidence: 1 | 2 | 3;
}

type Quadrant = 'mastered' | 'misinformed' | 'lucky' | 'gap';

const QUADRANT_CONFIG: Record<Quadrant, {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  borderClass: string;
  bgClass: string;
  badgeClass: string;
  textClass: string;
}> = {
  mastered: {
    label: 'Mastered',
    sublabel: 'Correct + Confident',
    icon: <CheckCircle2 className="w-4 h-4" />,
    borderClass: 'border-green-500 dark:border-green-600',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
    textClass: 'text-green-700 dark:text-green-400',
  },
  misinformed: {
    label: 'Misinformed',
    sublabel: 'Wrong + Confident',
    icon: <AlertTriangle className="w-4 h-4" />,
    borderClass: 'border-red-500 dark:border-red-600',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    textClass: 'text-red-700 dark:text-red-400',
  },
  lucky: {
    label: 'Lucky Guess',
    sublabel: 'Correct + Uncertain',
    icon: <HelpCircle className="w-4 h-4" />,
    borderClass: 'border-cyan-500 dark:border-cyan-600',
    bgClass: 'bg-cyan-50 dark:bg-cyan-950/30',
    badgeClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400',
    textClass: 'text-cyan-700 dark:text-cyan-400',
  },
  gap: {
    label: 'Known Gap',
    sublabel: 'Wrong + Uncertain',
    icon: <XCircle className="w-4 h-4" />,
    borderClass: 'border-amber-500 dark:border-amber-600',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
};

function getQuadrant(isCorrect: boolean, confidence: 1 | 2 | 3): Quadrant {
  if (isCorrect && confidence === 3) return 'mastered';
  if (isCorrect && confidence < 3) return 'lucky';
  if (!isCorrect && confidence === 3) return 'misinformed';
  return 'gap';
}

function isAnswerCorrect(quiz: Quiz, answer: number | string | null | undefined): boolean {
  if (answer === null || answer === undefined) return false;
  if (quiz.type === 'fill-in-blank') return answer === quiz.correctAnswer;
  return answer === quiz.correctAnswerIndex;
}

function getAnswerText(quiz: Quiz, answer: number | string | null | undefined): string {
  if (answer === null || answer === undefined) return 'No answer';
  if (quiz.type === 'fill-in-blank') return answer as string;
  return quiz.options?.[answer as number] || 'Unknown';
}

export default function ConfidenceMap({ quizzes, answers, confidenceRatings }: ConfidenceMapProps) {
  const [expandedItem, setExpandedItem] = useState<{ quadrant: Quadrant; index: number } | null>(null);

  // Only include questions where confidence was rated
  const ratedItems: QuadrantItem[] = quizzes
    .map((quiz, i) => ({
      quiz,
      index: i,
      answer: answers[i],
      isCorrect: isAnswerCorrect(quiz, answers[i]),
      confidence: confidenceRatings[i],
    }))
    .filter((item): item is QuadrantItem => item.confidence !== null);

  if (ratedItems.length === 0) return null;

  const buckets: Record<Quadrant, QuadrantItem[]> = {
    mastered: [],
    misinformed: [],
    lucky: [],
    gap: [],
  };

  for (const item of ratedItems) {
    buckets[getQuadrant(item.isCorrect, item.confidence)].push(item);
  }

  const brierScore = computeBrierScore(
    ratedItems.map(({ isCorrect, confidence }) => ({ isCorrect, confidenceRating: confidence }))
  );
  const calibrationLabel = getCalibrationLabel(brierScore);
  const misinformedCount = buckets.misinformed.length;

  const toggleItem = (quadrant: Quadrant, index: number) => {
    setExpandedItem(prev =>
      prev?.quadrant === quadrant && prev?.index === index ? null : { quadrant, index }
    );
  };

  const renderQuadrant = (quadrant: Quadrant) => {
    const config = QUADRANT_CONFIG[quadrant];
    const items = buckets[quadrant];

    return (
      <div className={`rounded-xl border-2 p-4 ${config.borderClass} ${config.bgClass}`}>
        <div className={`flex items-center gap-2 mb-3 ${config.textClass}`}>
          {config.icon}
          <div>
            <div className="font-semibold text-sm">{config.label}</div>
            <div className="text-xs opacity-75">{config.sublabel}</div>
          </div>
          <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${config.badgeClass}`}>
            {items.length}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">None</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => {
              const isExpanded = expandedItem?.quadrant === quadrant && expandedItem?.index === item.index;
              return (
                <div key={item.index} className="w-full">
                  <button
                    onClick={() => toggleItem(quadrant, item.index)}
                    className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${config.badgeClass} hover:opacity-80`}
                    aria-expanded={isExpanded}
                  >
                    <span>Q{item.index + 1}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 space-y-2 overflow-hidden"
                      >
                        <p className="text-xs text-foreground font-medium leading-snug">
                          {item.quiz.questionText}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>
                            <span className="font-medium">Your answer:</span>{' '}
                            <span className={item.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {getAnswerText(item.quiz, item.answer)}
                            </span>
                          </div>
                          {!item.isCorrect && (
                            <div>
                              <span className="font-medium">Correct answer:</span>{' '}
                              <span className="text-green-600 dark:text-green-400">
                                {item.quiz.type === 'fill-in-blank'
                                  ? item.quiz.correctAnswer
                                  : item.quiz.options?.[item.quiz.correctAnswerIndex ?? 0] ?? 'Unknown'}
                              </span>
                            </div>
                          )}
                          <div className="pt-1 border-t border-border/50 text-foreground/70 leading-snug">
                            {item.quiz.explanation}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
      className="mb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold text-foreground">Confidence Map</h2>
        </div>

        <div className="flex items-center gap-3">
          {misinformedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {misinformedCount} blind spot{misinformedCount !== 1 ? 's' : ''}
            </div>
          )}
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Calibration</div>
            <div className="text-sm font-bold text-foreground">
              {brierScore.toFixed(2)}{' '}
              <span className="text-xs font-normal text-muted-foreground">({calibrationLabel})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {renderQuadrant('mastered')}
        {renderQuadrant('misinformed')}
        {renderQuadrant('lucky')}
        {renderQuadrant('gap')}
      </div>

      <p className="mt-3 text-xs text-muted-foreground text-center">
        Calibration score: 0 = perfect, 1 = worst. Lower means your confidence matches your knowledge.
      </p>
    </motion.div>
  );
}
