'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Brain, CheckCircle2, Video, LogOut, Plus, Network, Briefcase, Lightbulb, Target, ArrowLeft } from 'lucide-react';
import FlashcardViewer from '@/components/FlashcardViewer';
import FlashcardCreator from '@/components/FlashcardCreator';
import FlashcardEditor from '@/components/FlashcardEditor';
import QuizInterface from '@/components/QuizInterface';
import VideoAndTranscriptViewer from '@/components/VideoAndTranscriptViewer';
import PrerequisitesView from '@/components/PrerequisitesView';
import MindMapViewer from '@/components/MindMapViewer';
import ThemeToggle from '@/components/ThemeToggle';
import Button from '@/components/Button';
import { ToastContainer, type ToastType } from '@/components/Toast';
import { useAuth } from '@/lib/auth-context';
import { ChatBot } from '@/components/ChatBot';

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
  mindMap: {
    nodes: Array<{
      id: string;
      label: string;
      type: 'root' | 'concept' | 'subconcept' | 'detail';
      description?: string;
      level: number;
      position?: { x: number; y: number };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
      type: 'hierarchy' | 'relation' | 'dependency';
    }>;
  };
  realWorldProblems: Array<{
    id: string;
    title: string;
    scenario: string;
    hints: string[];
  }>;
  notes: {
    generalNote: string;
    segmentNotes: Array<{
      segmentId: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
}

type TabType = 'flashcards' | 'quizzes' | 'transcript' | 'prerequisites' | 'mindmap' | 'casestudies';

const tabs = [
  { id: 'transcript' as TabType, label: 'Learn', icon: Video },
  { id: 'prerequisites' as TabType, label: 'Prerequisites', icon: CheckCircle2 },
  { id: 'flashcards' as TabType, label: 'Flashcards', icon: BookOpen },
  { id: 'quizzes' as TabType, label: 'Quizzes', icon: Brain },
  { id: 'casestudies' as TabType, label: 'Challenges', icon: Target },
  { id: 'mindmap' as TabType, label: 'Mind Map', icon: Network },
];

export default function VideoMaterialsPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;
  const { logout } = useAuth();

  const [materials, setMaterials] = useState<VideoMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [notes, setNotes] = useState<{ generalNote: string; segmentNotes: Array<{ segmentId: string; content: string; createdAt: Date; updatedAt: Date }> }>({ generalNote: '', segmentNotes: [] });

  // Flashcard creator/editor state
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<{ id: string; question: string; answer: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Toast notification state
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: ToastType }>>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const refreshMaterials = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/materials`);
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
      }
    } catch (err) {
      console.error('Error refreshing materials:', err);
    }
  };

  const handleCreateFlashcard = async (question: string, answer: string) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/learning/userFlashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoId,
          question: question,
          answer: answer
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create flashcard');
      }

      // Refresh materials to show new flashcard
      await refreshMaterials();
      setIsCreatorOpen(false);
      showToast('Flashcard created successfully!', 'success');
    } catch (error) {
      console.error('Error creating flashcard:', error);
      showToast('Failed to create flashcard. Please try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditFlashcard = async (flashcardId: string, question: string, answer: string) => {
    setIsEditing(true);
    try {
      const response = await fetch('/api/learning/userFlashcards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: flashcardId,
          question: question,
          answer: answer
        })
      });

      if (!response.ok) {
        throw new Error('Failed to edit flashcard');
      }

      // Refresh materials to show updated flashcard
      await refreshMaterials();
      setIsEditorOpen(false);
      setEditingFlashcard(null);
      showToast('Flashcard updated successfully!', 'success');
    } catch (error) {
      console.error('Error editing flashcard:', error);
      showToast('Failed to edit flashcard. Please try again.', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteFlashcard = async (flashcardId: string) => {
    try {
      const response = await fetch(`/api/learning/userFlashcards?id=${flashcardId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete flashcard');
      }

      // Refresh materials to remove deleted flashcard
      await refreshMaterials();
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      throw error; // Re-throw so FlashcardViewer can handle it
    }
  };

  const openEditor = (flashcard: { id: string; question: string; answer: string }) => {
    setEditingFlashcard(flashcard);
    setIsEditorOpen(true);
  };

  const saveNotes = async (updatedNotes: { generalNote: string; segmentNotes: Array<{ segmentId: string; content: string; createdAt: Date; updatedAt: Date }> }) => {
    try {
      const response = await fetch(`/api/notes/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedNotes)
      });

      if (response.ok) {
        setNotes(updatedNotes);
      } else {
        throw new Error('Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      throw error; // Re-throw so NotesEditor can handle it
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch materials and notes in parallel
        const [materialsResponse, notesResponse] = await Promise.all([
          fetch(`/api/videos/${videoId}/materials`),
          fetch(`/api/notes/${videoId}`)
        ]);

        if (!materialsResponse.ok) {
          throw new Error('Failed to fetch materials');
        }

        const materialsData = await materialsResponse.json();
        setMaterials(materialsData);

        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          setNotes(notesData);
        } else {
          setNotes({ generalNote: '', segmentNotes: [] });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      fetchData();
    }
  }, [videoId]);

  // Open chatbot when Challenges tab is selected
  useEffect(() => {
    if (activeTab === 'casestudies') {
      window.dispatchEvent(new CustomEvent('chatbot:open', { detail: { question: '' } }));
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <div className="border-b border-border bg-card-bg/50 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-5 bg-secondary/20 rounded mb-1 animate-pulse w-64"></div>
                  <div className="h-4 bg-secondary/20 rounded animate-pulse w-32"></div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-secondary/20 rounded animate-pulse"></div>
                <div className="w-24 h-8 bg-accent/20 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Materials Tabs Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-card-bg rounded-xl border border-border p-4">
                <div className="space-y-2">
                  {[
                    'Flashcards',
                    'Quizzes',
                    'Video & Transcript',
                    'Mind Map',
                    'AI Tutor',
                  ].map((label, i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                      <div className="w-5 h-5 bg-accent/20 rounded animate-pulse"></div>
                      <div className="h-4 bg-secondary/20 rounded animate-pulse flex-1"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area Skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-card-bg rounded-xl border border-border p-6">
                {/* Tab Header Skeleton */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-accent/20 rounded animate-pulse"></div>
                    <div className="h-6 bg-secondary/20 rounded animate-pulse w-24"></div>
                  </div>
                  <div className="h-8 bg-accent/20 rounded animate-pulse w-20"></div>
                </div>

                {/* Content Skeleton based on tab - simulating flashcards */}
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-background rounded-lg border border-border p-4">
                      <div className="h-5 bg-secondary/20 rounded mb-2 animate-pulse"></div>
                      <div className="h-4 bg-secondary/20 rounded animate-pulse w-3/4"></div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex space-x-2">
                          <div className="w-16 h-6 bg-accent/20 rounded animate-pulse"></div>
                          <div className="w-16 h-6 bg-secondary/20 rounded animate-pulse"></div>
                        </div>
                        <div className="w-8 h-8 bg-secondary/20 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
              <Button
                onClick={() => router.push('/dashboard/gallery')}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Materials</span>
              </Button>
              <ThemeToggle />
              <button
                onClick={logout}
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
              <div className="space-y-6">
                {/* Add New Flashcard Button */}
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => setIsCreatorOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Flashcard
                  </Button>
                </div>

                {/* Flashcard Viewer */}
                <FlashcardViewer
                  flashcards={materials.flashcards}
                  videoId={videoId}
                  onEdit={openEditor}
                  onDelete={handleDeleteFlashcard}
                  onShowToast={showToast}
                />
              </div>
            )}
            {activeTab === 'quizzes' && (
              <QuizInterface quizzes={materials.quizzes} videoId={videoId} />
            )}
            {activeTab === 'transcript' && (
              <VideoAndTranscriptViewer
                transcript={materials.transcript}
                videoId={materials.video.videoId}
                youtubeUrl={materials.video.youtubeUrl}
                notes={notes}
                onSaveNotes={saveNotes}
              />
            )}
            {activeTab === 'prerequisites' && (
              <PrerequisitesView prerequisites={materials.prerequisites} />
            )}
            {activeTab === 'casestudies' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Real-World Challenges</h2>
                  <p className="text-muted-foreground">
                    Apply concepts from this video to solve complex, realistic problems.
                  </p>
                </div>

                {materials.realWorldProblems && materials.realWorldProblems.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                    {materials.realWorldProblems.map((problem) => (
                      <motion.div
                        key={problem.id}
                        // whileHover={{ y: -4 }}
                        className="bg-card-bg border border-border rounded-xl p-6 cursor-pointer transition-shadow hover:shadow-lg"
                        onClick={() => router.push(`/generations/${videoId}/casestudy/${problem.id}`)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                            <Briefcase className="w-6 h-6 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              {problem.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                              {problem.scenario}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Lightbulb className="w-3.5 h-3.5" />
                                <span>{problem.hints.length} hints available</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-accent font-medium">Start solving →</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-card-bg border border-border rounded-xl">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No challenges available
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Challenges will be generated when processing new videos.
                    </p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'mindmap' && (
              <MindMapViewer
                videoId={videoId}
                nodes={materials.mindMap.nodes}
                edges={materials.mindMap.edges}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Flashcard Creator Modal */}
      <FlashcardCreator
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        onCreate={handleCreateFlashcard}
        isLoading={isCreating}
      />

      {/* Flashcard Editor Modal */}
      <FlashcardEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingFlashcard(null);
        }}
        onEdit={handleEditFlashcard}
        initialData={editingFlashcard}
        isLoading={isEditing}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* ChatBot */}
      <ChatBot videoId={videoId} />
    </div>
  );
}
