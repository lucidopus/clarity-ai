'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-in-blank';

export interface Question {
  id: string;
  questionText: string;
  type: QuestionType;
  options?: string[]; // For MC and TF
  correctAnswerIndex?: number; // For MC and TF
  correctAnswer?: string; // For fill-in-blank
  explanation: string;
}

interface QuizInterfaceProps {
  questions: Question[];
  onSubmit: (answers: (number | string | null)[]) => void;
  onComplete?: (score: number, total: number) => void;
}

export default function QuizInterface({
  questions,
  onSubmit,
  onComplete
}: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | string | null)[]>(
    new Array(questions.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fillInAnswer, setFillInAnswer] = useState('');

  const handleOptionSelect = (optionIndex: number) => {
    if (submitted) return;

    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleFillInSubmit = () => {
    if (submitted || !fillInAnswer.trim()) return;

    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = fillInAnswer.trim();
    setSelectedAnswers(newAnswers);
  };

  const handleSubmitAnswer = () => {
    if (currentAnswer === null && currentQuestion.type !== 'fill-in-blank') return;
    if (currentQuestion.type === 'fill-in-blank' && !fillInAnswer.trim()) return;

    setSubmitted(true);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSubmitted(false);
      setShowFeedback(false);
    } else {
      // Quiz complete
      const score = calculateScore();
      onSubmit(selectedAnswers);
      if (onComplete) {
        onComplete(score, questions.length);
      }
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSubmitted(false);
      setShowFeedback(false);
    }
  };

  const calculateScore = () => {
    return questions.reduce((score, question, index) => {
      const answer = selectedAnswers[index];
      if (question.type === 'fill-in-blank') {
        return answer === question.correctAnswer ? score + 1 : score;
      } else {
        return answer === question.correctAnswerIndex ? score + 1 : score;
      }
    }, 0);
  };

  const isCorrect = () => {
    if (currentQuestion.type === 'fill-in-blank') {
      return currentAnswer === currentQuestion.correctAnswer;
    }
    return currentAnswer === currentQuestion.correctAnswerIndex;
  };

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleOptionSelect(index)}
                className={`w-full p-4 text-left border rounded-xl transition-all duration-200 ${
                  currentAnswer === index
                    ? submitted
                      ? isCorrect()
                        ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                      : 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:border-accent/50 bg-background'
                }`}
                disabled={submitted}
                whileHover={!submitted ? { scale: 1.01 } : {}}
                whileTap={!submitted ? { scale: 0.99 } : {}}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer === index
                      ? submitted
                        ? isCorrect()
                          ? 'border-green-500 bg-green-500'
                          : 'border-red-500 bg-red-500'
                        : 'border-accent bg-accent'
                      : 'border-muted-foreground'
                  }`}>
                    {currentAnswer === index && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-foreground">{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
        );

      case 'true-false':
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleOptionSelect(index)}
                className={`w-full p-4 text-left border rounded-xl transition-all duration-200 ${
                  currentAnswer === index
                    ? submitted
                      ? isCorrect()
                        ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                      : 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:border-accent/50 bg-background'
                }`}
                disabled={submitted}
                whileHover={!submitted ? { scale: 1.01 } : {}}
                whileTap={!submitted ? { scale: 0.99 } : {}}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer === index
                      ? submitted
                        ? isCorrect()
                          ? 'border-green-500 bg-green-500'
                          : 'border-red-500 bg-red-500'
                        : 'border-accent bg-accent'
                      : 'border-muted-foreground'
                  }`}>
                    {currentAnswer === index && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-foreground">{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
        );

      case 'fill-in-blank':
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={fillInAnswer}
                onChange={(e) => setFillInAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
                disabled={submitted}
                onKeyPress={(e) => e.key === 'Enter' && handleFillInSubmit()}
              />
              {!submitted && (
                <Button
                  onClick={handleFillInSubmit}
                  variant="outline"
                  disabled={!fillInAnswer.trim()}
                >
                  Submit
                </Button>
              )}
            </div>
            {submitted && (
              <div className={`p-4 rounded-xl border ${
                isCorrect()
                  ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect() ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Correct!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Incorrect</span>
                    </>
                  )}
                </div>
                <p className="text-sm">
                  <span className="font-medium">Your answer:</span> {currentAnswer || 'No answer'}
                </p>
                {currentQuestion.correctAnswer && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Correct answer:</span> {currentQuestion.correctAnswer}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-muted-foreground">
            Score: {calculateScore()}/{currentQuestionIndex + (submitted ? 1 : 0)}
          </span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <motion.div
        key={currentQuestionIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-card-bg border border-border rounded-2xl p-6 mb-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {currentQuestion.questionText}
        </h3>

        {renderQuestion()}

        {/* Explanation */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 p-4 bg-muted/50 rounded-xl border border-border"
            >
              <h4 className="font-medium text-foreground mb-2">Explanation</h4>
              <p className="text-sm text-muted-foreground">
                {currentQuestion.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          onClick={handlePrev}
          variant="ghost"
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {!submitted ? (
            <Button
              onClick={handleSubmitAnswer}
              variant="primary"
              disabled={
                currentAnswer === null &&
                currentQuestion.type !== 'fill-in-blank'
              }
            >
              Submit Answer
            </Button>
          ) : (
            <Button onClick={handleNext} variant="primary">
              {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}