'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Brain, Trophy, FileText, RotateCw, Trash2 } from 'lucide-react';
import Button from './Button';
import { logActivity } from '@/lib/activityLogger';

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
  const [isResetting, setIsResetting] = useState(false);

  const handleResetProgress = async () => {
    try {
      setIsResetting(true);

      const response = await fetch('/api/learning/quizzes/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId
        })
      });

      if (!response.ok) {
        console.error('Failed to reset quiz progress:', await response.text());
        return;
      }

      // Reset local state (same as retake)
      setCurrentQuestionIndex(0);
      setSelectedAnswers(new Array(quizzes.length).fill(null));
      setSubmitted(false);
      setShowFeedback(false);
      setQuizCompleted(false);
      setFinalScore(0);
      setSubmittedQuestions(new Set());
    } catch (error) {
      console.error('Error resetting quiz progress:', error);
    } finally {
      setIsResetting(false);
    }
  };

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
    const correctCount = finalScore;

    const getAnswerText = (quiz: Quiz, answer: number | string | null) => {
      if (answer === null) return 'No answer';
      if (quiz.type === 'fill-in-blank') return answer as string;
      return quiz.options?.[answer as number] || 'Unknown';
    };

    const isAnswerCorrect = (quiz: Quiz, answer: number | string | null) => {
      if (quiz.type === 'fill-in-blank') {
        return answer === quiz.correctAnswer;
      }
      return answer === quiz.correctAnswerIndex;
    };

    return (
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block mb-6">
            <div className="w-28 h-28 rounded-full bg-linear-to-br from-accent via-accent to-accent/70 flex items-center justify-center shadow-xl ring-4 ring-accent/20 dark:ring-accent/10">
              <Trophy className="w-14 h-14 text-white drop-shadow-sm" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Quiz Complete!</h1>
          <p className="text-xl text-muted-foreground">
            You got <span className="font-bold text-accent">{correctCount}</span> out of {quizzes.length} questions right
          </p>
        </motion.div>

        {/* Stats Overview
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-card-bg border-2 border-green-500 dark:border-green-800 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-700 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{correctCount}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </div>

          <div className="bg-card-bg border-2 border-red-500 dark:border-red-800 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6 text-red-700 dark:text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{incorrectCount}</div>
            <div className="text-sm text-muted-foreground">Incorrect</div>
          </div>

          <div className="bg-card-bg border-2 border-accent/30 dark:border-accent/50 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Brain className="w-6 h-6 text-accent" />
            </div>
            <div className="text-2xl font-bold text-accent">{percentage}%</div>
            <div className="text-sm text-muted-foreground">Score</div>
          </div>
        </motion.div> */}

        {/* Questions Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
          className="p-6"
        >
          <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Review Your Answers
          </h2>

          <div className="space-y-4">
            {quizzes.map((quiz, index) => {
              const userAnswer = selectedAnswers[index];
              const correct = isAnswerCorrect(quiz, userAnswer);

              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.08,
                    ease: "easeOut"
                  }}
                  className={`border-2 rounded-xl p-4 transition-colors bg-card-bg dark:bg-muted/20 text-foreground ${
                    correct
                      ? 'border-green-500 dark:border-green-500'
                      : 'border-red-500 dark:border-red-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-1 ${
                      correct
                        ? 'bg-card-bg border-2 border-green-500 text-green-700 dark:bg-muted/20 dark:text-green-400'
                        : 'bg-card-bg border-2 border-red-500 text-red-700 dark:bg-muted/20 dark:text-red-400'
                    }`}>
                      {correct ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-semibold text-foreground text-lg leading-tight">
                          {quiz.questionText}
                        </h3>
                        <span className="text-sm text-muted-foreground font-medium shrink-0">
                          Q{index + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Your answer:</span>
                            <div className={`mt-1 px-3 py-2 rounded-lg text-sm font-bold ${
                              correct
                                ? 'bg-card-bg text-green-700 border-2 border-green-500 dark:bg-muted/20 dark:text-green-400'
                                : 'bg-card-bg text-red-700 border-2 border-red-500 dark:bg-muted/20 dark:text-red-400'
                            }`}>
                              {getAnswerText(quiz, userAnswer)}
                            </div>
                          </div>

                          {!correct && (
                            <div className="text-sm">
                              <span className="font-medium text-muted-foreground">Correct answer:</span>
                              <div className="mt-1 px-3 py-2 rounded-lg text-sm font-medium bg-card-bg text-green-700 border-2 border-green-500 dark:bg-muted/20 dark:text-green-400">
                                {quiz.type === 'fill-in-blank'
                                  ? quiz.correctAnswer
                                  : quiz.options?.[quiz.correctAnswerIndex || 0] || 'Unknown'
                                }
                              </div>
                            </div>
                          )}
                        </div>

                        <div className={`rounded-xl p-4 border-2 ${
                          correct
                            ? 'bg-card-bg border-green-500 text-green-700 dark:bg-muted/20 dark:text-green-400'
                            : 'bg-card-bg border-red-500 text-red-700 dark:bg-muted/20 dark:text-red-400'
                        }`}>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Explanation
                          </h4>
                          <p className="text-sm leading-relaxed">
                            {quiz.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
        >
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
            className="px-8"
            disabled={isResetting}
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Retake Quiz
          </Button>
          <Button
            variant="secondary"
            onClick={handleResetProgress}
            className="px-8"
            disabled={isResetting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isResetting ? 'Resetting...' : 'Reset Progress'}
          </Button>
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

  const handleNext = async () => {
    if (currentQuestionIndex < quizzes.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const nextIndex = currentQuestionIndex + 1;
      setSubmitted(submittedQuestions.has(nextIndex));
      setShowFeedback(submittedQuestions.has(nextIndex));
      setFillInAnswer('');
    } else {
      // Quiz complete
      const score = calculateScore();
      const percentage = Math.round((score / quizzes.length) * 100);

      setFinalScore(score);
      setQuizCompleted(true);

      // Log quiz completion activity
      logActivity('quiz_completed', videoId, {
        score: percentage,
        totalQuestions: quizzes.length,
        correctAnswers: score,
      });

      // Save quiz results to database
      try {
        const results = quizzes.map((quiz, index) => {
          const answer = selectedAnswers[index];
          const isCorrect = quiz.type === 'fill-in-blank'
            ? answer === quiz.correctAnswer
            : answer === quiz.correctAnswerIndex;

          return {
            quizId: quiz.id,
            isCorrect: isCorrect
          };
        });

        const response = await fetch('/api/learning/quizzes/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId,
            results
          })
        });

        if (!response.ok) {
          console.error('Failed to save quiz results:', await response.text());
        }
      } catch (error) {
        console.error('Error saving quiz results:', error);
      }
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

  const answeredCorrectly = isCorrect();
  const explanationClasses = answeredCorrectly
    ? 'bg-card-bg border-green-500 text-green-700 dark:text-green-400'
    : 'bg-card-bg border-red-500 text-red-700 dark:text-red-400';

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleOptionSelect(index)}
                className={`w-full p-4 text-left border-2 rounded-xl transition-all duration-200 cursor-pointer ${
                  currentAnswer === index
                    ? submitted
                      ? isCorrect()
                        ? 'border-green-500 bg-card-bg text-green-700 dark:text-green-400'
                        : 'border-red-500 bg-card-bg text-red-700 dark:text-red-400'
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
                className={`p-6 text-center border-2 rounded-xl transition-all duration-200 cursor-pointer ${
                  currentAnswer === index
                    ? submitted
                      ? isCorrect()
                        ? 'border-green-500 bg-card-bg text-green-700 dark:text-green-400'
                        : 'border-red-500 bg-card-bg text-red-700 dark:text-red-400'
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
                    ? 'border-green-500 bg-card-bg text-green-700 dark:text-green-400'
                    : 'border-red-500 bg-card-bg text-red-700 dark:text-red-400'
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
              className={`mt-6 p-4 rounded-xl border-2 transition-colors ${explanationClasses}`}
            >
              <div className="flex items-center gap-2 mb-2 font-semibold">
                {answeredCorrectly ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <h4 className="text-base">Explanation</h4>
              </div>
              <p className="text-sm leading-relaxed">
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
    </div>
  );
}
