'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lightbulb, FileText, Save, ChevronDown, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import Button from '@/components/Button';
import { useChatBot } from '@/hooks/useChatBot';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { ToastContainer, type ToastType } from '@/components/Toast';
import ReactMarkdown from 'react-markdown';

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
  const videoId = params.videoId as string;
  const caseStudyId = params.caseStudyId as string;

  // Activity tracking for contextual tooltips
  const { isInactive, resetActivity } = useActivityTracker({ inactivityThreshold: 120000 });

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



  // AI Guide contextual tooltips
  const guideMessages = useMemo(() => [
    "Need help understanding this concept?",
    "Stuck on the solution? Ask me for guidance!",
    "Want to explore this topic deeper?",
    "I can help break down complex ideas",
    "Have questions about the problem? I'm here!",
    "Let me help you think through this step-by-step",
    "Curious about related concepts? Ask away!",
    "Need clarification on any part?",
    "I can provide examples and analogies",
    "Want to verify your understanding?",
    "Let's discuss the key principles together",
    "I can suggest different approaches",
    "Need help organizing your thoughts?",
    "Ask me about prerequisites or background",
    "Want to explore real-world applications?"
  ], []);

  const [showGuideTooltip, setShowGuideTooltip] = useState(false);
  const [currentGuideMessage, setCurrentGuideMessage] = useState('');
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Panel visibility state (with localStorage persistence)
  const [showLeftPanel, setShowLeftPanel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('caseStudy_leftPanel');
      return saved !== null ? saved === 'true' : false; // Default: closed
    }
    return false;
  });

  const [showRightPanel, setShowRightPanel] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('openClara') === 'true') {
        return true;
      }
      const saved = localStorage.getItem('caseStudy_rightPanel');
      return saved !== null ? saved === 'true' : true; // Default: open
    }
    return true;
  });



  // Persist panel visibility to localStorage
  useEffect(() => {
    localStorage.setItem('caseStudy_leftPanel', String(showLeftPanel));
  }, [showLeftPanel]);

  useEffect(() => {
    localStorage.setItem('caseStudy_rightPanel', String(showRightPanel));
  }, [showRightPanel]);

  // Toggle functions
  const toggleLeftPanel = useCallback(() => setShowLeftPanel(prev => !prev), []);
  const toggleRightPanel = useCallback(() => setShowRightPanel(prev => !prev), []);

  // Global hints toggle
  const expandAllHints = () => {
    if (!data?.problem.hints) return;
    const allIndices = data.problem.hints.map((_, index) => index);
    setExpandedHints(prev => {
      const newState = { ...prev };
      allIndices.forEach(index => newState[index] = true);
      return newState;
    });
  };

  const collapseAllHints = () => {
    setExpandedHints({});
  };

  // Check if all hints are expanded
  const allHintsExpanded = data?.problem.hints ? data.problem.hints.every((_, index) => expandedHints[index]) : false;
  const anyHintsExpanded = Object.values(expandedHints).some(Boolean);



  // Initialize chat with AI Guide endpoint
  const {
    messages,
    isLoading: isChatLoading,
    isStreaming,
    sendMessage,
  } = useChatBot(videoId, {
    endpoint: '/api/chatbot/guide',
    enableHistory: true, // Enable conversation persistence (Issue #39)
    channel: 'guide',    // Use guide channel to avoid collision with chatbot
    problemId: caseStudyId, // Context identifier for guide conversations
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
      } catch {
        setAutoSaveState('error');

      if (showErrorToast) {
        setToast({ message: 'Failed to save solution', type: 'error' });
      }
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
    } catch {
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



  // Contextual AI Guide tooltips
  useEffect(() => {
    if (isInactive && !showRightPanel && !showGuideTooltip) {
      // Pick random message
      const randomMessage = guideMessages[Math.floor(Math.random() * guideMessages.length)];
      setCurrentGuideMessage(randomMessage);
      setShowGuideTooltip(true);

      // Hide tooltip after 5 seconds
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowGuideTooltip(false);
      }, 5000);
    }

    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, [isInactive, showRightPanel, showGuideTooltip, guideMessages]);

  // Reset tooltip when panel is opened or activity resumes
  useEffect(() => {
    if (showRightPanel || !isInactive) {
      setShowGuideTooltip(false);
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    }
  }, [showRightPanel, isInactive]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl+S for save
      const isSaveCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (isSaveCombo) {
        event.preventDefault();
        handleSaveSolution();
        return;
      }

      // Cmd/Ctrl+H for toggle hints panel (left panel)
      const isHintsCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'h';
      if (isHintsCombo) {
        event.preventDefault();
        toggleLeftPanel();
        return;
      }

      // Cmd/Ctrl+G for toggle AI Guide (right panel)
      const isGuideCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'g';
      if (isGuideCombo) {
        event.preventDefault();
        toggleRightPanel();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveSolution, toggleLeftPanel, toggleRightPanel]);

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
                Back to Video
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

       {/* Edge-Hugging Tabs - Only show when panels are closed */}
       {!showLeftPanel && (
         <motion.div
           initial={{ opacity: 0, x: -10 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -10 }}
           transition={{ duration: 0.2 }}
           className="fixed left-0 top-1/2 transform -translate-y-1/2 z-20 hidden lg:block"
         >
            <button
              onClick={toggleLeftPanel}
              className="group relative cursor-pointer flex items-center justify-center w-8 h-12 bg-card-bg border-r border-t border-b border-border rounded-r-lg shadow-sm transition-all duration-200 hover:w-12 text-secondary hover:text-foreground hover:bg-muted hover:border-accent/50"
              title="Show research desk (Ctrl+H)"
              aria-label="Show research desk"
            >
             <FileText className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
             <div className="absolute left-full ml-2 px-2 py-1 bg-card-bg border border-border rounded-md text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-sm">
               Show Hints & Notes
             </div>
           </button>
         </motion.div>
       )}

        {!showRightPanel && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed right-0 top-1/2 transform -translate-y-1/2 z-20 hidden lg:block"
          >
            <button
              onClick={() => {
                toggleRightPanel();
                resetActivity();
              }}
              className="group cursor-pointer relative flex items-center justify-end w-8 h-12 bg-card-bg border-l border-t border-b border-border rounded-l-lg shadow-sm transition-all duration-200 hover:w-12 text-secondary hover:text-foreground hover:bg-muted hover:border-accent/50 animate-shine"
              title="Chat With Clara (Ctrl+G)"
              aria-label="Show AI Guide"
            >
              <Sparkles className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              <div className="absolute right-full mr-2 px-2 py-1 bg-card-bg border border-border rounded-md text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-sm">
                Ask Clara
              </div>
              {/* Contextual tooltip */}
              <AnimatePresence>
                {showGuideTooltip && (
                  <motion.div
                    initial={{ opacity: 0, x: 10, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-full mr-2 px-3 py-2 bg-card-bg border border-border rounded-lg text-sm text-foreground whitespace-nowrap shadow-lg z-50 max-w-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent shrink-0" />
                      <span className="pr-1">{currentGuideMessage}</span>
                    </div>
                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-card-bg border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-px w-0 h-0 border-l-4 border-l-border border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </motion.div>
        )}

       {/* Main Workspace */}
       <main className="max-w-[1800px] mx-auto px-6 py-8">
         {/* Mobile Panel Controls - Only show when panels are closed */}
         <div className="flex items-center gap-2 mb-6 lg:hidden">
           {!showLeftPanel && (
             <Button
               onClick={toggleLeftPanel}
               size="sm"
               variant="outline"
               className="flex items-center gap-2"
               title="Show research desk (Ctrl+H)"
             >
               <FileText className="w-4 h-4" />
               <span>Show Research</span>
             </Button>
           )}
           {!showRightPanel && (
              <Button
                onClick={toggleRightPanel}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
                title="Show AI guide (Ctrl+G)"
              >
                <Sparkles className="w-4 h-4" />
                <span>Show Guide</span>
              </Button>
           )}
         </div>

          <div className="flex gap-0 relative">
          {/* Left Panel: Research Desk */}
          <AnimatePresence>
            {showLeftPanel && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '320px' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3 }}
                className="shrink-0 relative"
                style={{ width: '320px' }}
              >
                <div className="space-y-6 pr-4">
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
                       {data.notes.segmentNotes.map((note) => (
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-semibold text-foreground">Hints</h2>
                  {anyHintsExpanded && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {Object.values(expandedHints).filter(Boolean).length} revealed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!allHintsExpanded && (
                    <button
                      onClick={expandAllHints}
                      className="text-xs cursor-pointer text-accent hover:text-accent/80 font-medium transition-colors"
                      title="Expand all hints"
                    >
                      Expand All
                    </button>
                  )}
                  {anyHintsExpanded && (
                    <>
                      {!allHintsExpanded && <span className="text-muted-foreground">|</span>}
                      <button
                        onClick={collapseAllHints}
                        className="text-xs cursor-pointer text-muted-foreground hover:text-foreground font-medium transition-colors"
                        title="Collapse all hints"
                      >
                        Collapse All
                      </button>
                    </>
                  )}
                </div>
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
                 </div>

                 {/* Left Panel Collapse Indicator */}
                 <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 flex-col items-center justify-center w-6 h-12 bg-card-bg/80 backdrop-blur-sm border border-border rounded-r-lg hover:border-accent hover:bg-accent/10 transition-all duration-200 shadow-sm group cursor-pointer z-10"
                      onClick={toggleLeftPanel}
                      title="Hide research desk (Ctrl+H)"
                      aria-label="Hide research desk">
                   <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                 </div>

               </motion.div>
             )}
           </AnimatePresence>

           {/* Center Panel: Workbench */}
           <div className="flex-1 min-w-0 space-y-6 px-4">
              {/* Problem Scenario */}
              <div className="bg-card-bg border border-border rounded-xl p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">The Challenge</h2>
                <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:border prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                  <ReactMarkdown>
                    {data.problem.scenario}
                  </ReactMarkdown>
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
                 initial={{ opacity: 0, width: 0 }}
                 animate={{ opacity: 1, width: '500px' }}
                 exit={{ opacity: 0, width: 0 }}
                 transition={{ duration: 0.3 }}
                 className="shrink-0 relative"
                 style={{ width: '500px' }}
               >
                 <div className="pl-4">
              <div className="sticky top-24 bg-card-bg border border-border rounded-xl p-6 h-[calc(100vh-8rem)] flex flex-col">
               <div className="flex items-center gap-2 mb-4">
                 <Sparkles className="w-5 h-5 text-accent" />
                 <h2 className="text-lg font-semibold text-foreground">Clara</h2>
               </div>
               <div
                 className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-themed"
                 ref={guideMessagesRef}
               >
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-2">
                      Need help? Ask Clara!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      I&apos;m here to guide your thinking, not give you the answer.
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
                  </div>

                 {/* Right Panel Collapse Indicator */}
                 <div className="hidden lg:flex absolute top-1/2 -left-3 transform -translate-y-1/2 flex-col items-center justify-center w-6 h-12 bg-card-bg/80 backdrop-blur-sm border border-border rounded-l-lg hover:border-accent hover:bg-accent/10 transition-all duration-200 shadow-sm group cursor-pointer z-10"
                      onClick={toggleRightPanel}
                      title="Hide AI Guide (Ctrl+G)"
                      aria-label="Hide AI Guide">
                   <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
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
              Ready to apply what you&apos;ve learned?
              </h2>
              <div className="space-y-3 text-sm text-foreground mb-6">
                <p>
                  This is your space to tackle a real-world problem using concepts from the video.
                </p>
                <p>
                  <strong className="text-accent">Clara</strong> is here to help you think through the problem.
                </p>
                <p>
                  Use your notes, explore hints, and work through the challenge at your own pace.
                </p>
              </div>
              <Button onClick={() => setShowOnboarding(false)} className="w-full">
                Let&apos;s Start!
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
