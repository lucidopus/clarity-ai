'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import QuizInterface from './QuizInterface';
import QuizReview from './QuizReview';

interface Prerequisite {
  id: string;
  title: string;
  description: string;
  required: boolean;
}

interface Question {
  id: string;
  questionText: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank';
  options?: string[];
  correctAnswerIndex?: number;
  correctAnswer?: string;
  explanation: string;
}

interface PrerequisiteCheckerProps {
  prerequisites: Prerequisite[];
  quizQuestions: Question[];
  onQuizComplete?: (score: number, total: number) => void;
  onLearnWithAI?: () => void;
  onContinue?: () => void;
}

type ViewState = 'overview' | 'quiz' | 'results';

export default function PrerequisiteChecker({
  prerequisites,
  quizQuestions,
  onLearnWithAI,
  onContinue
}: PrerequisiteCheckerProps) {
  const [viewState, setViewState] = useState<ViewState>('overview');
  const [quizAnswers, setQuizAnswers] = useState<(number | string | null)[]>([]);
  const [quizScore, setQuizScore] = useState(0);

  const handleStartQuiz = () => {
    setViewState('quiz');
  };

  const handleRetryQuiz = () => {
    setViewState('quiz');
    setQuizAnswers([]);
    setQuizScore(0);
  };

  const handleBackToOverview = () => {
    setViewState('overview');
  };

  const getScoreMessage = () => {
    const percentage = Math.round((quizScore / quizQuestions.length) * 100);
    if (percentage >= 80) return 'Great! You seem ready to continue.';
    if (percentage >= 60) return 'You have a good foundation. Consider reviewing the gaps.';
    return 'You might benefit from learning the prerequisites first.';
  };

  const getKnowledgeGaps = () => {
    return quizQuestions
      .map((question, index) => ({
        question: question.questionText,
        isCorrect: question.type === 'fill-in-blank'
          ? quizAnswers[index] === question.correctAnswer
          : quizAnswers[index] === question.correctAnswerIndex
      }))
      .filter(item => !item.isCorrect)
      .map(item => item.question);
  };

  if (viewState === 'quiz') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={handleBackToOverview} variant="ghost">
            ← Back to Prerequisites
          </Button>
        </div>
        <QuizInterface
          quizzes={quizQuestions}
          videoId=""
        />
      </div>
    );
  }

  if (viewState === 'results') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={handleBackToOverview} variant="ghost">
           ← Back to Prerequisites
          </Button>
        </div>
        <QuizReview
          questions={quizQuestions}
          answers={quizAnswers}
          score={quizScore}
          total={quizQuestions.length}
          onRetry={handleRetryQuiz}
          onBack={handleBackToOverview}
        />

        {/* Knowledge Assessment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-card-bg border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Knowledge Assessment
          </h3>
          <p className="text-muted-foreground mb-4">
            {getScoreMessage()}
          </p>

          {getKnowledgeGaps().length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-foreground mb-2">
                Areas to review:
              </h4>
              <ul className="space-y-1">
                {getKnowledgeGaps().map((gap, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {onLearnWithAI && (
              <Button onClick={onLearnWithAI} variant="primary">
                Learn with AI Tutor
              </Button>
            )}
            {onContinue && (
              <Button onClick={onContinue} variant="outline">
                Continue Anyway
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Overview view
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-bg border border-border rounded-2xl p-6 mb-6"
      >
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Prerequisites for this Video
        </h2>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-foreground mb-3">
            Required Background Knowledge
          </h3>
          <div className="grid gap-3">
            {prerequisites.map((prereq) => (
              <motion.div
                key={prereq.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: prerequisites.indexOf(prereq) * 0.1 }}
                className={`p-4 rounded-xl border ${
                  prereq.required
                    ? 'border-accent/20 bg-accent/5'
                    : 'border-border bg-background'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                    prereq.required
                      ? 'bg-accent text-white'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                  }`}>
                    {prereq.required ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">
                      {prereq.title}
                      {prereq.required && (
                        <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                          Required
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {prereq.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {quizQuestions.length > 0 && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
            <h3 className="font-medium text-foreground mb-2">
              Take a Quick Readiness Quiz
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {quizQuestions.length} questions • 2-3 minutes
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              This will help assess if you have the background knowledge needed for this video.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleStartQuiz} variant="primary">
                Take Quiz
              </Button>
              {onContinue && (
                <Button onClick={onContinue} variant="ghost">
                  Skip for Now
                </Button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
