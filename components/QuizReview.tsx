'use client';

import { motion } from 'framer-motion';
import Button from './Button';

interface Question {
  id: string;
  questionText: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank';
  options?: string[];
  correctAnswerIndex?: number;
  correctAnswer?: string;
  explanation: string;
}

interface QuizReviewProps {
  questions: Question[];
  answers: (number | string | null)[];
  score: number;
  total: number;
  onRetry?: () => void;
  onBack?: () => void;
}

export default function QuizReview({
  questions,
  answers,
  score,
  total,
  onRetry,
  onBack
}: QuizReviewProps) {
  const percentage = Math.round((score / total) * 100);

  const getScoreColor = () => {
    if (percentage >= 80) return 'text-green-900 dark:text-green-300';
    if (percentage >= 60) return 'text-yellow-700 dark:text-yellow-300';
    return 'text-red-900 dark:text-red-300';
  };

  const getScoreBg = () => {
    if (percentage >= 80) return 'border-green-600/60';
    if (percentage >= 60) return 'border-yellow-600/60';
    return 'border-red-600/60';
  };

  const getScoreIcon = () => {
    if (percentage >= 80) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (percentage >= 60) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  const getScoreMessage = () => {
    if (percentage >= 80) return 'Excellent work!';
    if (percentage >= 60) return 'Good job!';
    return 'Keep practicing!';
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Score Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-center p-8 rounded-2xl border-[3px] mb-8 ${getScoreBg()}`}
      >
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full bg-muted/20 ${getScoreColor()}`}>
            {getScoreIcon()}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Quiz Complete!
        </h2>
        <p className="text-lg text-muted-foreground mb-4">
          {getScoreMessage()}
        </p>
        <div className="text-4xl font-bold mb-2">
          <span className={getScoreColor()}>{score}</span>
          <span className="text-muted-foreground">/{total}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {percentage}% correct
        </p>
      </motion.div>

      {/* Question Review */}
      <div className="space-y-4 mb-8">
        <h3 className="text-lg font-semibold text-foreground">Review Answers</h3>
        {questions.map((question, index) => {
          const userAnswer = answers[index];
          const isCorrect = question.type === 'fill-in-blank'
            ? userAnswer === question.correctAnswer
            : userAnswer === question.correctAnswerIndex;

          return (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl border-[3px] bg-card-bg dark:bg-muted/20 text-foreground ${
                isCorrect
                  ? 'border-green-600 dark:border-green-500'
                  : 'border-red-600 dark:border-red-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                  isCorrect
                    ? 'bg-card-bg border-[3px] border-green-600 text-green-900 dark:bg-muted/20 dark:border-green-500 dark:text-green-200'
                    : 'bg-card-bg border-[3px] border-red-600 text-red-900 dark:bg-muted/20 dark:border-red-500 dark:text-red-200'
                }`}>
                  {isCorrect ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-2">
                    Question {index + 1}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {question.questionText}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-foreground">Your answer: </span>
                      <span className={isCorrect ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}>
                        {question.type === 'fill-in-blank'
                          ? (userAnswer || 'No answer')
                          : question.options?.[userAnswer as number] || 'No answer'
                        }
                      </span>
                    </div>

                    {!isCorrect && (
                      <div>
                        <span className="font-medium text-foreground">Correct answer: </span>
                        <span className="text-green-900 dark:text-green-200">
                          {question.type === 'fill-in-blank'
                            ? question.correctAnswer
                            : question.options?.[question.correctAnswerIndex || 0]
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-accent hover:text-accent/80">
                      Show explanation
                    </summary>
                    <p className="text-sm text-muted-foreground mt-2 pl-4 border-l-2 border-border">
                      {question.explanation}
                    </p>
                  </details>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        )}
        {onBack && (
          <Button onClick={onBack} variant="primary">
            Back to Materials
          </Button>
        )}
      </div>
    </div>
  );
}
