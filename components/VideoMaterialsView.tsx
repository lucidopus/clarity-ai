'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import MaterialsTabs from './MaterialsTabs';
import FlashcardViewer from './FlashcardViewer';
import FlashcardCreator from './FlashcardCreator';
import QuizInterface, { Question } from './QuizInterface';
import QuizReview from './QuizReview';
import TranscriptViewer from './TranscriptViewer';
import PrerequisiteChecker from './PrerequisiteChecker';

interface VideoMaterials {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl?: string;
  duration?: string;
  createdAt: Date | string;
  flashcards: Array<{
    id: string;
    question: string;
    answer: string;
    isMastered: boolean;
    isUserCreated: boolean;
  }>;
  quizzes: Question[];
  transcript: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  prerequisites: Array<{
    id: string;
    title: string;
    description: string;
    required: boolean;
  }>;
  prerequisiteQuiz: Question[];
}

interface VideoMaterialsViewProps {
  video: VideoMaterials;
  onBack?: () => void;
  onMarkFlashcardMastered?: (flashcardId: string) => void;
  onCreateUserFlashcard?: (question: string, answer: string) => void;
  onQuizSubmit?: (answers: (number | string | null)[]) => void;
  onPrerequisiteQuizComplete?: (score: number, total: number) => void;
  onLearnWithAI?: () => void;
}

type TabType = 'materials' | 'chatbot';

export default function VideoMaterialsView({
  video,
  onBack,
  onMarkFlashcardMastered,
  onCreateUserFlashcard,
  onQuizSubmit,
  onPrerequisiteQuizComplete,
  onLearnWithAI
}: VideoMaterialsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('materials');
  const [showFlashcardCreator, setShowFlashcardCreator] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<(number | string | null)[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const tabs = [
    { id: 'materials', label: 'Materials', count: video.flashcards.length + video.quizzes.length },
    { id: 'chatbot', label: 'Q&A Chatbot', disabled: true }
  ];

  const handleCreateFlashcard = (question: string, answer: string) => {
    if (onCreateUserFlashcard) {
      onCreateUserFlashcard(question, answer);
    }
    setShowFlashcardCreator(false);
  };

  const handleQuizSubmit = (answers: (number | string | null)[]) => {
    setQuizAnswers(answers);
    if (onQuizSubmit) {
      onQuizSubmit(answers);
    }
  };

  const handleQuizComplete = (score: number, total: number) => {
    setQuizScore(score);
    setQuizCompleted(true);
  };

  const handlePrerequisiteQuizComplete = (score: number, total: number) => {
    if (onPrerequisiteQuizComplete) {
      onPrerequisiteQuizComplete(score, total);
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        {onBack && (
          <Button onClick={onBack} variant="ghost" className="mb-4">
            ← Back to Gallery
          </Button>
        )}

        <div className="bg-card-bg border border-border rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Thumbnail */}
            {video.thumbnailUrl && (
              <div className="flex-shrink-0">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-48 h-28 object-cover rounded-xl"
                />
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {video.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <span>{video.channelName}</span>
                {video.duration && <span>• {video.duration}</span>}
                <span>• Generated {formatDate(video.createdAt)}</span>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 text-accent"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                  <span>{video.flashcards.length} Flashcards</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 text-accent"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                    />
                  </svg>
                  <span>{video.quizzes.length} Quizzes</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 text-accent"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{Math.round(video.transcript.reduce((total, seg) => total + seg.duration, 0) / 60)} min transcript</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <MaterialsTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabType)}
      />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'materials' && (
          <motion.div
            key="materials"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Prerequisites */}
            {video.prerequisites.length > 0 && (
              <PrerequisiteChecker
                prerequisites={video.prerequisites}
                quizQuestions={video.prerequisiteQuiz}
                onQuizComplete={handlePrerequisiteQuizComplete}
                onLearnWithAI={onLearnWithAI}
                onContinue={() => {}} // Continue to materials
              />
            )}

            {/* Flashcards */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Flashcards</h2>
                <Button
                  onClick={() => setShowFlashcardCreator(true)}
                  variant="outline"
                >
                  + Add Card
                </Button>
              </div>
              <FlashcardViewer
                flashcards={video.flashcards}
                onMarkMastered={onMarkFlashcardMastered}
                onCreateNew={() => setShowFlashcardCreator(true)}
              />
            </div>

            {/* Quizzes */}
            {video.quizzes.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-6">Quiz</h2>
                {quizCompleted ? (
                  <QuizReview
                    questions={video.quizzes}
                    answers={quizAnswers}
                    score={quizScore}
                    total={video.quizzes.length}
                    onRetry={() => {
                      setQuizCompleted(false);
                      setQuizAnswers([]);
                      setQuizScore(0);
                    }}
                  />
                ) : (
                  <QuizInterface
                    questions={video.quizzes}
                    onSubmit={handleQuizSubmit}
                    onComplete={handleQuizComplete}
                  />
                )}
              </div>
            )}

            {/* Transcript */}
            {video.transcript.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-6">Transcript</h2>
                <TranscriptViewer segments={video.transcript} />
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'chatbot' && (
          <motion.div
            key="chatbot"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8 text-accent"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Q&A Chatbot Coming Soon
            </h3>
            <p className="text-muted-foreground">
              Interactive AI tutor will be available in Phase 6
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flashcard Creator Modal */}
      <FlashcardCreator
        isOpen={showFlashcardCreator}
        onClose={() => setShowFlashcardCreator(false)}
        onCreate={handleCreateFlashcard}
      />
    </div>
  );
}