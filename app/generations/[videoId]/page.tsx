'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Brain, CheckCircle2, Video, LogOut, Plus, Network, Briefcase, 
  Lightbulb, Target, ArrowLeft, ChevronLeft, Menu 
} from 'lucide-react';
import FlashcardViewer from '@/components/FlashcardViewer';
import FlashcardCreator from '@/components/FlashcardCreator';
import FlashcardEditor from '@/components/FlashcardEditor';
import QuizInterface from '@/components/QuizInterface';
import VideoAndTranscriptViewer from '@/components/VideoAndTranscriptViewer';
import PrerequisitesView from '@/components/PrerequisitesView';
import MindMapViewer from '@/components/MindMapViewer';
import VideoSummaryButton from '@/components/VideoSummaryButton';
import MaterialsWarningBanner from '@/components/MaterialsWarningBanner';
import ThemeToggle from '@/components/ThemeToggle';
import Button from '@/components/Button';
import Dialog from '@/components/Dialog';
import { ToastContainer, type ToastType } from '@/components/Toast';
import { useAuth } from '@/lib/auth-context';
import { ChatBot } from '@/components/ChatBot';
import { getErrorConfig } from '@/lib/errorMessages';

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
    isMastered?: boolean;
  }>;
  transcript: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  chapters: Array<{
    id: string;
    timeSeconds: number;
    topic: string;
    description: string;
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
  videoSummary?: string;
  notes: {
    generalNote: string;
    segmentNotes: Array<{
      segmentId: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
  processingStatus?: 'pending' | 'processing' | 'completed' | 'completed_with_warning' | 'failed';
  materialsStatus?: 'complete' | 'incomplete' | 'generating';
  incompleteMaterials?: ('flashcards' | 'quizzes' | 'prerequisites' | 'mindmap' | 'casestudies')[];
  hasAllMaterials?: boolean;
  availableMaterials?: {
    flashcards: boolean;
    quizzes: boolean;
    prerequisites: boolean;
    mindmap: boolean;
    casestudies: boolean;
  };
  error?: {
    type?: string;
    message?: string;
  } | null;
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
  const searchParams = useSearchParams();
  const videoId = params.videoId as string;
  const { user, logout } = useAuth();
  const warningType = searchParams.get('warning');

  const [materials, setMaterials] = useState<VideoMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [notes, setNotes] = useState<{ generalNote: string; segmentNotes: Array<{ segmentId: string; content: string; createdAt: Date; updatedAt: Date }> }>({ generalNote: '', segmentNotes: [] });
  const [showWarning, setShowWarning] = useState(!!warningType);
  const [incompleteMaterials, setIncompleteMaterials] = useState<string[]>([]);
  const [bannedDismissed, setBannerDismissed] = useState(false);
  const [autoplayVideos, setAutoplayVideos] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading specific materials...');

  // Layout UI State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const messages = [
      "Distilling key insights from the video...",
      "Synthesizing complex concepts into study materials...",
      "Analyzing transcript for core learning objectives...",
      "Mapping out the knowledge structure...",
      "Preparing your personalized learning path..."
    ];
    setLoadingMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, []);

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

  useEffect(() => {
    const dismissedBannersKey = 'dismissedMaterialsBanners';
    const dismissedBanners = JSON.parse(localStorage.getItem(dismissedBannersKey) || '{}');
    if (dismissedBanners[videoId]) {
      setBannerDismissed(true);
    }
  }, [videoId]);

  const handleBannerDismiss = () => {
    setBannerDismissed(true);
    const dismissedBannersKey = 'dismissedMaterialsBanners';
    const dismissedBanners = JSON.parse(localStorage.getItem(dismissedBannersKey) || '{}');
    dismissedBanners[videoId] = true;
    localStorage.setItem(dismissedBannersKey, JSON.stringify(dismissedBanners));
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
        body: JSON.stringify({ videoId, question, answer })
      });

      if (!response.ok) throw new Error('Failed to create flashcard');

      await refreshMaterials();
      setIsCreatorOpen(false);
      showToast('Flashcard created successfully!', 'success');
    } catch (error) {
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
        body: JSON.stringify({ flashcardId, question, answer })
      });

      if (!response.ok) throw new Error('Failed to edit flashcard');

      await refreshMaterials();
      setIsEditorOpen(false);
      setEditingFlashcard(null);
      showToast('Flashcard updated successfully!', 'success');
    } catch (error) {
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
      if (!response.ok) throw new Error('Failed to delete flashcard');
      await refreshMaterials();
    } catch (error) {
      throw error;
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
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [materialsResponse, notesResponse, preferencesResponse] = await Promise.all([
          fetch(`/api/videos/${videoId}/materials`),
          fetch(`/api/notes/${videoId}`),
          fetch(`/api/preferences/general`)
        ]);

        if (!materialsResponse.ok) throw new Error('Failed to fetch materials');

        const materialsData = await materialsResponse.json();
        setMaterials(materialsData);

        if (materialsData.materialsStatus === 'incomplete') {
          const missing: string[] = [];
          if (materialsData.availableMaterials) {
            if (!materialsData.availableMaterials.flashcards) missing.push('Flashcards');
            if (!materialsData.availableMaterials.quizzes) missing.push('Quizzes');
            if (!materialsData.availableMaterials.prerequisites) missing.push('Prerequisites');
            if (!materialsData.availableMaterials.mindmap) missing.push('Mind Map');
            if (!materialsData.availableMaterials.casestudies) missing.push('Challenges');
          }
          if (missing.length > 0) setIncompleteMaterials(missing);
        }

        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          setNotes(notesData);
        } else {
          setNotes({ generalNote: '', segmentNotes: [] });
        }

        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json();
          setAutoplayVideos(preferencesData.preferences?.autoplayVideos ?? false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (videoId) fetchData();
  }, [videoId]);

  if (loading) {
     return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
         <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
         <p className="mt-4 text-muted-foreground">{loadingMessage}</p>
       </div>
     );
  }

  if (error || !materials) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Oops! Something went wrong</h2>
          <p className="text-muted-foreground mb-6">{error || 'Materials not found'}</p>
          <Button variant="primary" onClick={() => router.push('/dashboard/gallery')}>Back to Gallery</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      
      {/* Sidebar Navigation */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-card-bg border-r border-border shrink-0 z-40 flex flex-col h-full relative"
      >
        {/* Sidebar Header: Logo & Toggle */}
        <div className="h-16 flex items-center px-4 border-b border-border shrink-0 justify-between">
           <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <span className="text-white font-bold text-lg">C</span>
              </button>
              {!isSidebarCollapsed && (
                 <span className="font-bold text-lg text-foreground truncate">Clarity</span>
              )}
           </div>
           
           {!isSidebarCollapsed && (
             <button 
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-background transition-colors cursor-pointer"
                title="Collapse Sidebar"
             >
                <ChevronLeft className="w-4 h-4" />
             </button>
           )}
        </div>

        {/* Navigation Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 gap-2 flex flex-col">
            {/* If collapsed, show centered expand button at top of list as alternative interaction */}
            {isSidebarCollapsed && (
               <button 
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-full flex items-center justify-center py-2 text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-lg mb-2 cursor-pointer"
                title="Expand Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={isSidebarCollapsed ? tab.label : ''}
                  className={`
                    relative group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? 'bg-accent/10 text-accent font-medium' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
                    }
                    ${isSidebarCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <Icon className={`shrin-0 ${isActive ? 'w-5 h-5' : 'w-5 h-5 opacity-70'}`} />
                  
                  {!isSidebarCollapsed && (
                     <span className="truncate text-sm">{tab.label}</span>
                  )}

                  {/* Active Indicator Line for Collapsed Mode (optional visual cue) */}
                  {isActive && isSidebarCollapsed && (
                    <motion.div 
                      layoutId="activeTabIndicator"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-l-full"
                    />
                  )}
                </button>
              );
            })}
        </div>
        
        {/* Sidebar Footer: User Controls */}
        <div className="p-3 border-t border-border shrink-0 space-y-2">
            {!isSidebarCollapsed && (
              <div className="mb-2 px-1">
                 <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</h3>
              </div>
            )}
            
            <div className={`flex flex-col gap-2 ${isSidebarCollapsed ? 'items-center' : ''}`}>
                 {!isSidebarCollapsed && user && (
                     <div className="px-1 py-2 text-xs text-muted-foreground truncate w-full bg-muted/30 rounded-lg mb-1">
                         {user.email}
                     </div>
                 )}

                 <button
                    onClick={logout}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors text-red-500/80 hover:text-red-500 hover:bg-red-500/10 cursor-pointer ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title="Logout"
                 >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>Logout</span>}
                 </button>
            </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full relative">
        {/* Minimal Header (Title) - Sticky */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-sm z-30 shrink-0 gap-4">
             <h1 className="text-lg font-semibold text-foreground truncate min-w-0">
                 {materials.video.title}
             </h1>

             <div className="flex items-center gap-3 shrink-0">
                <Button
                  onClick={() => router.push('/dashboard/gallery')}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Gallery</span>
                </Button>
                <div className="w-px h-6 bg-border mx-1"></div>
                <ThemeToggle />
             </div>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth will-change-transform">
           
           {/* Responsive Container - Using flex to allow child to expand */}
           <div className="w-full h-full flex flex-col">
              
              {/* Materials Warning Banner */}
              <MaterialsWarningBanner
                incompleteMaterials={incompleteMaterials}
                isVisible={!bannedDismissed && incompleteMaterials.length > 0}
                onDismiss={handleBannerDismiss}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col min-h-0" 
                >
                  {activeTab === 'transcript' && (
                    <div className="flex flex-col gap-6">
                       {materials.videoSummary && (
                          <div className="shrink-0">
                             <VideoSummaryButton
                              summary={materials.videoSummary}
                              videoTitle={materials.video.title}
                            />
                          </div>
                        )}
                        {/* Video Viewer now takes full remaining space if needed, or flows naturally */}
                        <div className="flex-1 min-h-0">
                           <VideoAndTranscriptViewer
                              transcript={materials.transcript}
                              videoId={materials.video.videoId}
                              youtubeUrl={materials.video.youtubeUrl}
                              chapters={materials.chapters}
                              videoTitle={materials.video.title}
                              notes={notes}
                              onSaveNotes={saveNotes}
                              autoplayVideos={autoplayVideos}
                            />
                        </div>
                    </div>
                  )}

                  {activeTab === 'flashcards' && (
                    <div className="space-y-6 max-w-7xl mx-auto w-full">
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
                     <div className="max-w-5xl mx-auto w-full">
                        <QuizInterface quizzes={materials.quizzes} videoId={videoId} />
                     </div>
                  )}

                  {activeTab === 'prerequisites' && (
                    <div className="max-w-7xl mx-auto w-full">
                        <PrerequisitesView prerequisites={materials.prerequisites} />
                    </div>
                  )}

                  {activeTab === 'casestudies' && (
                      <div className="space-y-6 max-w-7xl mx-auto w-full">
                        <div className="mb-6">
                          <h2 className="text-2xl font-bold text-foreground mb-2">Real-World Challenges</h2>
                          <p className="text-muted-foreground">
                            Apply concepts from this video to solve complex, realistic problems.
                          </p>
                        </div>
                        {materials.realWorldProblems && materials.realWorldProblems.length > 0 ? (
                          <div className="grid gap-6 md:grid-cols-1">
                             {materials.realWorldProblems.map((problem) => (
                               <motion.div
                                 key={problem.id}
                                 initial={{ y: -4 }}
                                 className="bg-card-bg border border-border rounded-xl p-6 cursor-pointer shadow-lg hover:border-accent/50 transition-colors"
                                 onClick={() => router.push(`/generations/${videoId}/casestudy/${problem.id}?openClara=true`)}
                               >
                                <div className="flex items-start gap-4">
                                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Briefcase className="w-6 h-6 text-accent" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-foreground mb-2">{problem.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{problem.scenario}</p>
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
                            <h3 className="text-lg font-semibold text-foreground mb-2">No challenges available</h3>
                            <p className="text-muted-foreground text-sm">Challenges will be generated when processing new videos.</p>
                          </div>
                        )}
                      </div>
                  )}

                  {activeTab === 'mindmap' && (
                     <div className="h-[calc(100vh-140px)] w-full -mt-4 border border-border rounded-xl overflow-hidden bg-card-bg">
                        <MindMapViewer
                          videoId={videoId}
                          nodes={materials.mindMap.nodes}
                          edges={materials.mindMap.edges}
                        />
                     </div>
                  )}
                </motion.div>
              </AnimatePresence>
           </div>
        </div>
      </main>

      {/* Modals */}
      <FlashcardCreator isOpen={isCreatorOpen} onClose={() => setIsCreatorOpen(false)} onCreate={handleCreateFlashcard} isLoading={isCreating} />
      <FlashcardEditor isOpen={isEditorOpen} onClose={() => { setIsEditorOpen(false); setEditingFlashcard(null); }} onEdit={handleEditFlashcard} initialData={editingFlashcard} isLoading={isEditing} />
      
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {showWarning && warningType && (
        <Dialog isOpen={showWarning} onClose={() => setShowWarning(false)} type="alert" variant={getErrorConfig(warningType).variant} title={getErrorConfig(warningType).title} message={getErrorConfig(warningType).message} confirmText="I Understand" />
      )}
      
      <ChatBot videoId={videoId} />
    </div>
  );
}
