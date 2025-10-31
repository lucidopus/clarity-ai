'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Brain, FileText, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
import FlashcardViewer from '@/components/FlashcardViewer';
import QuizInterface from '@/components/QuizInterface';
import TranscriptViewer from '@/components/TranscriptViewer';
import PrerequisitesView from '@/components/PrerequisitesView';
import Button from '@/components/Button';

interface VideoMaterials {
  video: {
    id: string;
    title: string;
    channelName?: string;
    thumbnailUrl?: string;
    duration?: string;
    createdAt: Date | string;
  };
  flashcards: Array<{
    id: string;
    question: string;
    answer: string;
    isMastered: boolean;
    isUserCreated: boolean;
  }>;
  quizzes: Array<{
    id: string;
    questionText: string;
    type: 'multiple-choice' | 'true-false' | 'fill-in-blank';
    options?: string[];
    correctAnswerIndex?: number;
    correctAnswer?: string;
    explanation: string;
  }>;
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
  prerequisiteQuiz: Array<{
    id: string;
    questionText: string;
    type: 'multiple-choice' | 'true-false' | 'fill-in-blank';
    options?: string[];
    correctAnswerIndex?: number;
    correctAnswer?: string;
    explanation: string;
  }>;
}

type TabType = 'flashcards' | 'quizzes' | 'transcript' | 'prerequisites';

const tabs = [
  { id: 'flashcards' as TabType, label: 'Flashcards', icon: BookOpen },
  { id: 'quizzes' as TabType, label: 'Quizzes', icon: Brain },
  { id: 'transcript' as TabType, label: 'Transcript', icon: FileText },
  { id: 'prerequisites' as TabType, label: 'Prerequisites', icon: CheckCircle2 },
];

export default function VideoMaterialsPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  const [materials, setMaterials] = useState<VideoMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('flashcards');

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}/materials`);
        if (!response.ok) {
          throw new Error('Failed to fetch materials');
        }
        const data = await response.json();
        setMaterials(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      fetchMaterials();
    }
  }, [videoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground">Loading your materials...</p>
          <p className="text-sm text-muted-foreground mt-2">Preparing flashcards, quizzes, and more</p>
        </motion.div>
      </div>
    );
  }

  if (error || !materials) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Oops! Something went wrong</h2>
          <p className="text-muted-foreground mb-6">{error || 'Materials not found'}</p>
          <Button variant="primary" onClick={() => router.push('/dashboard/gallery')}>
            Back to Gallery
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-bg border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/gallery')}
                className="mb-4 -ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Gallery
              </Button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {materials.video.title}
                </h1>
              </div>
              {materials.video.channelName && (
                <p className="text-muted-foreground">by {materials.video.channelName}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>{materials.flashcards.length} Flashcards</span>
                <span>•</span>
                <span>{materials.quizzes.length} Quizzes</span>
                <span>•</span>
                <span>{materials.transcript.length} Segments</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="bg-card-bg border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card-bg/95">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-accent'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'flashcards' && (
              <FlashcardViewer flashcards={materials.flashcards} videoId={videoId} />
            )}
            {activeTab === 'quizzes' && (
              <QuizInterface quizzes={materials.quizzes} videoId={videoId} />
            )}
            {activeTab === 'transcript' && (
              <TranscriptViewer
                transcript={materials.transcript}
                videoId={materials.video.id}
              />
            )}
            {activeTab === 'prerequisites' && (
              <PrerequisitesView prerequisites={materials.prerequisites} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
