'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Brain, Trophy } from 'lucide-react';
import Button from './Button';

export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-in-blank';

export interface Quiz {
  id: string;
  questionText: string;
  type: QuestionType;
  options?: string[];
  correctAnswerIndex?: number;
  correctAnswer?: string;
  explanation: string;
}

interface QuizInterfaceProps {
  quizzes: Quiz[];
  videoId: string;
}

export default function QuizInterface({ quizzes, videoId }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | string | null)[]>(
    new Array(quizzes.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fillInAnswer, setFillInAnswer] = useState('');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set());

  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No quizzes yet</h3>
          <p className="text-muted-foreground">
            Quizzes will appear here once generated.
          </p>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = Math.round((finalScore / quizzes.length) * 100);
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Quiz Complete!</h2>
          <p className="text-lg text-muted-foreground mb-6">
            You scored {finalScore} out of {quizzes.length} ({percentage}%)
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              variant="primary"
              onClick={() => {
                setCurrentQuestionIndex(0);
                setSelectedAnswers(new Array(quizzes.length).fill(null));
                setSubmitted(false);
                setShowFeedback(false);
                setQuizCompleted(false);
                setFinalScore(0);
                setSubmittedQuestions(new Set());
              }}
            >
              Retake Quiz
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

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
    setSubmittedQuestions(prev => new Set([...prev, currentQuestionIndex]));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizzes.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const nextIndex = currentQuestionIndex + 1;
      setSubmitted(submittedQuestions.has(nextIndex));
      setShowFeedback(submittedQuestions.has(nextIndex));
      setFillInAnswer('');
    } else {
      // Quiz complete
      const score = calculateScore();
      setFinalScore(score);
      setQuizCompleted(true);
      // TODO: API call to save quiz results
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevIndex = currentQuestionIndex - 1;
      setSubmitted(submittedQuestions.has(prevIndex));
      setShowFeedback(submittedQuestions.has(prevIndex));
      setFillInAnswer('');
    }
  };

  const calculateScore = () => {
    return quizzes.reduce((score, quiz, index) => {
      // Only count submitted questions
      if (!submittedQuestions.has(index)) return score;

      const answer = selectedAnswers[index];
      if (quiz.type === 'fill-in-blank') {
        return answer === quiz.correctAnswer ? score + 1 : score;
      } else {
        return answer === quiz.correctAnswerIndex ? score + 1 : score;
      }
    }, 0);
  };

  // Get current question and answer
  const currentQuestion = quizzes[currentQuestionIndex];
  const currentAnswer = selectedAnswers[currentQuestionIndex];

  const isCorrect = () => {
    if (currentQuestion.type === 'fill-in-blank') {
      return currentAnswer === currentQuestion.correctAnswer;
    }
    return currentAnswer === currentQuestion.correctAnswerIndex;
  };

  // Calculate progress percentage
  const progress = ((currentQuestionIndex + 1) / quizzes.length) * 100;

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleOptionSelect(index)}
                className={`w-full p-4 text-left border-2 rounded-xl transition-all duration-200 ${
                  currentAnswer === index
                    ? submitted
                      ? isCorrect()
                        ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                      : 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:border-accent/50 bg-card-bg hover:bg-accent/5'
                }`}
                disabled={submitted}
                whileHover={!submitted ? { scale: 1.01 } : {}}
                whileTap={!submitted ? { scale: 0.99 } : {}}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
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
          <div className="grid grid-cols-2 gap-4">
            {['True', 'False'].map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleOptionSelect(index)}
                className={`p-6 text-center border-2 rounded-xl transition-all duration-200 ${
                  currentAnswer === index
                    ? submitted
                      ? isCorrect()
                        ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                      : 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:border-accent/50 bg-card-bg hover:bg-accent/5'
                }`}
                disabled={submitted}
                whileHover={!submitted ? { scale: 1.02 } : {}}
                whileTap={!submitted ? { scale: 0.98 } : {}}
              >
                <div className="text-2xl font-semibold text-foreground">{option}</div>
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
                className="flex-1 px-4 py-3 bg-card-bg border-2 border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
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
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border-2 ${
                  isCorrect()
                    ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect() ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Correct!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
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
              </motion.div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-foreground">
            Question {currentQuestionIndex + 1} of {quizzes.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {calculateScore()} correct so far
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={currentQuestionIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-card-bg border-2 border-border rounded-2xl p-8 mb-8"
      >
        <h3 className="text-2xl font-semibold text-foreground mb-6">
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
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <div className="flex gap-4">
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
              {currentQuestionIndex === quizzes.length - 1 ? 'Finish Quiz' : 'Next Question'}
            </Button>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Use <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd> to navigate options
      </div>
    </div>
  );
}