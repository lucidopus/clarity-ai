'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';
import Button from './Button';
import MaterialsTabs from './MaterialsTabs';
import FlashcardViewer from './FlashcardViewer';
import FlashcardCreator from './FlashcardCreator';
import QuizInterface from './QuizInterface';
import QuizReview from './QuizReview';
import TranscriptViewer from './TranscriptViewer';
import PrerequisiteChecker from './PrerequisiteChecker';
import { logActivity } from '@/lib/activityLogger';
import { CHATBOT_NAME } from '@/lib/config';

interface Question {
  id: string;
  questionText: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank';
  options?: string[];
  correctAnswerIndex?: number;
  correctAnswer?: string;
  explanation: string;
}

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
  onCreateUserFlashcard?: (question: string, answer: string) => void;
  onQuizSubmit?: (answers: (number | string | null)[]) => void;
  onPrerequisiteQuizComplete?: (score: number, total: number) => void;
  onLearnWithAI?: () => void;
}

type TabType = 'materials' | 'chatbot';

export default function VideoMaterialsView({
  video,
  onBack,
  onCreateUserFlashcard,
  onPrerequisiteQuizComplete,
  onLearnWithAI
}: VideoMaterialsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('materials');
  const [showFlashcardCreator, setShowFlashcardCreator] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<(number | string | null)[]>([]);
  const [quizSummary, setQuizSummary] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    // Log page/materials view
    logActivity('materials_viewed', video.id).catch(() => {});
  }, [video.id]);

  const tabs = [
    { id: 'materials', label: 'Materials', count: video.flashcards.length + video.quizzes.length },
    { id: 'chatbot', label: 'Ask ' + CHATBOT_NAME, disabled: true }
  ];

  const handleCreateFlashcard = (question: string, answer: string) => {
    if (onCreateUserFlashcard) {
      onCreateUserFlashcard(question, answer);
    }

    // Log activity when user creates a custom flashcard
    logActivity('flashcard_created', video.id, {
      generationType: 'human',
    });

    setShowFlashcardCreator(false);
  };

  // Quiz handlers are handled within QuizInterface/QuizReview flows.

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

  const quizCompleted = Boolean(quizSummary);

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
              <div className="relative shrink-0 w-48 h-28">
                <Image
                  src={video.thumbnailUrl}
                  alt={video.title}
                  fill
                  className="rounded-xl object-cover"
                  sizes="192px"
                  priority
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
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 006 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
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
                videoId={video.id}
              />
            </div>

            {/* Quizzes */}
            {video.quizzes.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-6">Quiz</h2>
                {quizCompleted && quizSummary ? (
                  <QuizReview
                    questions={video.quizzes}
                    answers={quizAnswers}
                    score={quizSummary.score}
                    total={quizSummary.total}
                    onRetry={() => {
                      setQuizSummary(null);
                      setQuizAnswers([]);
                    }}
                  />
                ) : (
                   <QuizInterface
                    quizzes={video.quizzes}
                    videoId={video.id}
                  />
                )}
              </div>
            )}

            {/* Transcript */}
            {video.transcript.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-6">Transcript</h2>
                <TranscriptViewer transcript={video.transcript} videoId={video.id} />
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
            className="text-center py-16"
          >
            <div className="relative mx-auto mb-6 w-fit">
              <div className="relative">
                {/* Main bot icon with gradient background */}
                <div className="w-20 h-20 bg-linear-to-br from-accent/20 to-accent/10 rounded-2xl flex items-center justify-center shadow-lg border border-accent/20">
                  <Bot className="w-10 h-10 text-accent" />
                </div>

                {/* Sparkle decoration */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent/15 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-accent" />
                </div>
              </div>

              {/* Animated pulse ring */}
              <div className="absolute inset-0 rounded-2xl bg-accent/10 animate-pulse"></div>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-foreground">
                Meet {CHATBOT_NAME}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                Your AI learning companion is coming soon! {CHATBOT_NAME} will help you understand complex topics,
                answer questions about your videos, and guide you through challenging concepts.
              </p>

              <div className="flex items-center justify-center gap-2 mt-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-accent/5 rounded-full border border-accent/20">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-accent">Coming in Phase 6</span>
                </div>
              </div>
            </div>
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
