'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lightbulb, FileText, MessageSquare, Save, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Maximize2, Minimize2 } from 'lucide-react';
import Button from '@/components/Button';
import { useChatBot } from '@/hooks/useChatBot';
import { ToastContainer, type ToastType } from '@/components/Toast';
import { useAuth } from '@/lib/auth-context';
import dynamic from 'next/dynamic';
import { ChatMessage } from '@/components/ChatMessage';
import ThemeToggle from '@/components/ThemeToggle';

// Dynamically import rich text editor to avoid SSR issues
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="h-64 bg-background border border-border rounded-lg animate-pulse" />
});

interface CaseStudyData {
  problem: {
    id: string;
    title: string;
    scenario: string;
    hints: string[];
  };
  video: {
    id: string;
    videoId: string;
    title: string;
    channelName?: string;
  };
  notes: {
    generalNote: string;
    segmentNotes: Array<{
      segmentId: string;
      content: string;
    }>;
  };
  existingSolution?: string;
}

export default function CaseStudyWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const videoId = params.videoId as string;
  const caseStudyId = params.caseStudyId as string;

  const [data, setData] = useState<CaseStudyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solution, setSolution] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [expandedHints, setExpandedHints] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const guideMessagesRef = useRef<HTMLDivElement | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedSolutionRef = useRef('');
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [isMacUser, setIsMacUser] = useState(true);

  // Panel visibility state (with localStorage persistence)
  const [showLeftPanel, setShowLeftPanel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('caseStudy_leftPanel');
      return saved !== null ? saved === 'true' : true; // Default: open
    }
    return true;
  });

  const [showRightPanel, setShowRightPanel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('caseStudy_rightPanel');
      return saved !== null ? saved === 'true' : true; // Default: open
    }
    return true;
  });

  const [aiGuideWidth, setAiGuideWidth] = useState<'normal' | 'wide'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('caseStudy_aiGuideWidth') as 'normal' | 'wide';
      return saved || 'normal';
    }
    return 'normal';
  });

  // Persist panel visibility to localStorage
  useEffect(() => {
    localStorage.setItem('caseStudy_leftPanel', String(showLeftPanel));
  }, [showLeftPanel]);

  useEffect(() => {
    localStorage.setItem('caseStudy_rightPanel', String(showRightPanel));
  }, [showRightPanel]);

  useEffect(() => {
    localStorage.setItem('caseStudy_aiGuideWidth', aiGuideWidth);
  }, [aiGuideWidth]);

  // Toggle functions
  const toggleLeftPanel = () => setShowLeftPanel(prev => !prev);
  const toggleRightPanel = () => setShowRightPanel(prev => !prev);
  const toggleAiGuideWidth = () => setAiGuideWidth(prev => prev === 'normal' ? 'wide' : 'normal');

  // Initialize chat with AI Guide endpoint
  const {
    messages,
    isLoading: isChatLoading,
    isStreaming,
    error: chatError,
    sendMessage,
    clearError: clearChatError,
  } = useChatBot(videoId, {
    endpoint: '/api/chatbot/guide',
    enableHistory: false, // Don't persist guide chat history
    transformRequestBody: (payload) => ({
      ...payload,
      problemId: caseStudyId,
      solutionDraft: solution,
    }),
  });

  // Auto-scroll AI Guide conversation when new content arrives
  useEffect(() => {
    const container = guideMessagesRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isStreaming]);

  const saveSolution = useCallback(async (content: string, options: { showSuccessToast?: boolean; showErrorToast?: boolean } = {}) => {
    const { showSuccessToast = false, showErrorToast = false } = options;
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    setAutoSaveState('saving');
    try {
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          problemId: caseStudyId,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save solution');
      }

      lastSavedSolutionRef.current = content;
      setAutoSaveState('saved');
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }

      if (showSuccessToast) {
        setToast({ message: 'Solution saved successfully!', type: 'success' });
      }
    } catch (err) {
      console.error('Error saving solution:', err);
      setAutoSaveState('error');

      if (showErrorToast) {
        setToast({ message: 'Failed to save solution', type: 'error' });
      }

      throw err;
    }
  }, [caseStudyId, videoId]);

  // Fetch case study data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/casestudy/${videoId}/${caseStudyId}`);

        if (!response.ok) {
          throw new Error('Failed to load case study data');
        }

        const result = await response.json();
        setData(result);

        // Load existing solution if available
        if (result.existingSolution) {
          setSolution(result.existingSolution);
          lastSavedSolutionRef.current = result.existingSolution;
          setAutoSaveState('saved');
        } else {
          setSolution('');
          lastSavedSolutionRef.current = '';
          setAutoSaveState('idle');
        }

        // Check if user has seen onboarding
        const hasSeenOnboarding = localStorage.getItem('caseStudyOnboardingShown');
        if (!hasSeenOnboarding) {
          setShowOnboarding(true);
          localStorage.setItem('caseStudyOnboardingShown', 'true');
        }
      } catch (err) {
        console.error('Error fetching case study:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (videoId && caseStudyId) {
      fetchData();
    }
  }, [videoId, caseStudyId]);

  // Manual save action (optional)
  const handleSaveSolution = useCallback(async () => {
    try {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      setIsSaving(true);
      await saveSolution(solution, { showSuccessToast: true, showErrorToast: true });
    } catch (err) {
      // Error already handled in saveSolution
    } finally {
      setIsSaving(false);
    }
  }, [saveSolution, solution]);

  // Toggle hint visibility
  const toggleHint = (index: number) => {
    setExpandedHints(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Send message to AI Guide
  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  // Auto-save solution (debounced)
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (solution === lastSavedSolutionRef.current) {
      return;
    }

    setAutoSaveState('pending');

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveSolution(solution).catch(() => {
        // Errors handled inside saveSolution
      });
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [solution, saveSolution]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Detect platform for shortcut indicator
  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    setIsMacUser(isMac);
  }, []);

  // Ensure previously selected theme is respected in this workspace
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToApply = savedTheme || (prefersDark ? 'dark' : 'light');

    root.classList.remove('light', 'dark');
    root.classList.add(themeToApply);
  }, []);

  // Global Cmd/Ctrl+S shortcut for manual save
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (!isSaveCombo) return;

      event.preventDefault();
      handleSaveSolution();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveSolution]);

  const renderAutoSaveText = () => {
    switch (autoSaveState) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'All changes saved';
      case 'pending':
        return 'Unsaved changes';
      case 'error':
        return 'Auto-save failed';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-6">{error || 'Failed to load case study'}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card-bg border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push(`/generations/${videoId}`)}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Materials
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {data.problem.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.video.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {renderAutoSaveText() && (
                <span className="text-xs text-muted-foreground">{renderAutoSaveText()}</span>
              )}
              <Button
                onClick={handleSaveSolution}
                disabled={isSaving}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Now'}
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  {isMacUser ? '⌘S' : 'Ctrl+S'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace - Three Column Layout */}
      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Panel Toggle Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLeftPanel}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-card-bg border border-border rounded-lg hover:border-accent transition-all duration-200"
              title={showLeftPanel ? "Hide research desk" : "Show research desk"}
            >
              {showLeftPanel ? (
                <>
                  <PanelLeftClose className="w-4 h-4" />
                  <span className="hidden sm:inline">Hide Research</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Toggle Sidebar</span>
                </>
              )}
            </button>

            <button
              onClick={toggleRightPanel}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-card-bg border border-border rounded-lg hover:border-accent transition-all duration-200"
              title={showRightPanel ? "Hide AI guide" : "Show AI guide"}
            >
              {showRightPanel ? (
                <>
                  <PanelRightClose className="w-4 h-4" />
                  <span className="hidden sm:inline">Hide Guide</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Show Guide</span>
                </>
              )}
            </button>
          </div>

          {showRightPanel && (
            <button
              onClick={toggleAiGuideWidth}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-card-bg border border-border rounded-lg hover:border-accent transition-all duration-200"
              title={aiGuideWidth === 'normal' ? "Expand AI guide" : "Shrink AI guide"}
            >
              {aiGuideWidth === 'normal' ? (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Expand Guide</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Shrink Guide</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${
          showLeftPanel && showRightPanel
            ? aiGuideWidth === 'wide'
              ? 'lg:grid-cols-12'
              : 'lg:grid-cols-12'
            : showLeftPanel && !showRightPanel
            ? 'lg:grid-cols-12'
            : !showLeftPanel && showRightPanel
            ? aiGuideWidth === 'wide'
              ? 'lg:grid-cols-12'
              : 'lg:grid-cols-12'
            : 'lg:grid-cols-1'
        }`}>
          {/* Left Panel: Research Desk */}
          <AnimatePresence>
            {showLeftPanel && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className={`space-y-6 ${
                  !showRightPanel
                    ? 'lg:col-span-3'
                    : aiGuideWidth === 'wide'
                      ? 'lg:col-span-2'
                      : 'lg:col-span-3'
                }`}
              >
            {/* Notes */}
            <div className="bg-card-bg border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold text-foreground">Your Notes</h2>
              </div>
              <div className="space-y-4">
                {data.notes.generalNote && (
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {data.notes.generalNote}
                    </p>
                  </div>
                )}
                {data.notes.segmentNotes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      Segment Notes ({data.notes.segmentNotes.length})
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {data.notes.segmentNotes.map((note, idx) => (
                        <div
                          key={note.segmentId}
                          className="p-3 bg-background rounded-lg border border-border"
                        >
                          <p className="text-xs text-foreground">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!data.notes.generalNote && data.notes.segmentNotes.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No notes available for this video.
                  </p>
                )}
              </div>
            </div>

            {/* Hints */}
            <div className="bg-card-bg border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold text-foreground">Hints</h2>
              </div>
              <div className="space-y-2">
                {data.problem.hints.map((hint, index) => (
                  <div key={index} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleHint(index)}
                      className="w-full cursor-pointer px-4 py-3 flex items-center justify-between bg-background hover:bg-muted transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">
                        Hint {index + 1}
                      </span>
                      {expandedHints[index] ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedHints[index] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 py-3 bg-card-bg border-t border-border">
                            <p className="text-sm text-foreground">{hint}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center Panel: Workbench */}
          <div className={`space-y-6 ${
            showLeftPanel && showRightPanel
              ? aiGuideWidth === 'wide'
                ? 'lg:col-span-6'
                : 'lg:col-span-6'
              : showLeftPanel && !showRightPanel
              ? 'lg:col-span-9'
              : !showLeftPanel && showRightPanel
              ? aiGuideWidth === 'wide'
                ? 'lg:col-span-7'
                : 'lg:col-span-9'
              : 'lg:col-span-12'
          }`}>
            {/* Problem Scenario */}
            <div className="bg-card-bg border border-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">The Challenge</h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {data.problem.scenario}
                </p>
              </div>
            </div>

            {/* Solution Pad */}
            <div className="bg-card-bg border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Your Solution
              </h2>
              <RichTextEditor
                value={solution}
                onChange={setSolution}
                placeholder="Start writing your solution here..."
              />
            </div>
          </div>

          {/* Right Panel: AI Guide */}
          <AnimatePresence>
            {showRightPanel && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className={`${
                  !showLeftPanel
                    ? aiGuideWidth === 'wide'
                      ? 'lg:col-span-5'
                      : 'lg:col-span-3'
                    : aiGuideWidth === 'wide'
                      ? 'lg:col-span-4'
                      : 'lg:col-span-3'
                }`}
              >
            <div className="sticky top-24 bg-card-bg border border-border rounded-xl p-6 max-h-[calc(100vh-8rem)] flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold text-foreground">Clara</h2>
              </div>
              <div
                className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1"
                ref={guideMessagesRef}
              >
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-2">
                      Need help? Ask Clara!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      I'm here to guide your thinking, not give you the answer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, index) => (
                      <ChatMessage
                        key={msg.id}
                        message={msg}
                        isStreaming={isStreaming && index === messages.length - 1}
                      />
                    ))}
                  </div>
                )}
                {isStreaming && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    Clara is thinking...
                  </div>
                )}
              </div>
              <div className="border-t border-border pt-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
                    if (input.value.trim()) {
                      handleSendMessage(input.value.trim());
                      input.value = '';
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    name="message"
                    type="text"
                    placeholder="Ask for guidance..."
                    disabled={isChatLoading || isStreaming}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isChatLoading || isStreaming}
                  >
                    Send
                  </Button>
                </form>
              </div>
            </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowOnboarding(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card-bg border border-border rounded-2xl p-8 max-w-md w-full"
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Welcome to the Problem-Solving Workspace
              </h2>
              <div className="space-y-3 text-sm text-foreground mb-6">
                <p>
                  This is your space to tackle real-world problems using concepts from the video.
                </p>
                <p>
                  The <strong className="text-accent">Clara</strong> is here to help you think through the problem.
                </p>
                <p>
                  Use your notes, explore hints, and work through the challenge at your own pace.
                </p>
              </div>
              <Button onClick={() => setShowOnboarding(false)} className="w-full">
                Let's Start!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      {toast && (
        <ToastContainer
          toasts={[
            {
              id: 'case-study-toast',
              message: toast.message,
              type: toast.type,
            },
          ]}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
