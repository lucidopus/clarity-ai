'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Brain, CheckCircle2, Video, LogOut, ArrowLeft } from 'lucide-react';
import FlashcardViewer from '@/components/FlashcardViewer';
import QuizInterface from '@/components/QuizInterface';
import VideoAndTranscriptViewer from '@/components/VideoAndTranscriptViewer';
import PrerequisitesView from '@/components/PrerequisitesView';
import ThemeToggle from '@/components/ThemeToggle';
import Button from '@/components/Button';

interface VideoMaterials {
  video: {
    id: string;
    videoId: string;
    youtubeUrl: string;
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
  { id: 'transcript' as TabType, label: 'Learn', icon: Video },
  { id: 'prerequisites' as TabType, label: 'Prerequisites', icon: CheckCircle2 },
  { id: 'flashcards' as TabType, label: 'Flashcards', icon: BookOpen },
  { id: 'quizzes' as TabType, label: 'Quizzes', icon: Brain },
];

export default function VideoMaterialsPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  const [materials, setMaterials] = useState<VideoMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('transcript');

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
      {/* Unified Navigation Bar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-bg border-b border-border sticky top-0 z-50 backdrop-blur-sm"
      >
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Left Side: Logo + Video Title */}
            <div className="flex items-center gap-4 min-w-0 shrink">
                {/* Logo */}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">C</span>
                  </div>
                </button>

              {/* Divider */}
              <div className="w-px h-6 bg-border shrink-0" />

              {/* Video Title */}
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm md:text-base font-semibold text-foreground truncate">
                  {materials.video.title}
                </h1>
              </div>
            </div>

            {/* Center: Tab Navigation */}
            <div className="flex gap-1 overflow-x-auto shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative cursor-pointer px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors rounded-lg ${
                      isActive
                        ? 'text-accent bg-accent/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Side: Back + Theme Toggle + Logout */}
            <div className="flex items-center gap-3 shrink-0">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-background border border-border rounded-lg hover:border-accent transition-all duration-200 cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

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
              <VideoAndTranscriptViewer
                transcript={materials.transcript}
                videoId={materials.video.videoId}
                youtubeUrl={materials.video.youtubeUrl}
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
