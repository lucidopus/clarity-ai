'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lightbulb, FileText, MessageSquare, Save, ChevronDown, ChevronRight } from 'lucide-react';
import Button from '@/components/Button';
import { useChatBot } from '@/hooks/useChatBot';
import { ToastContainer, type ToastType } from '@/components/Toast';
import { useAuth } from '@/lib/auth-context';
import dynamic from 'next/dynamic';

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
  });

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

  // Save solution
  const handleSaveSolution = async () => {
    if (!solution.trim()) {
      setToast({ message: 'Solution cannot be empty', type: 'error' });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          problemId: caseStudyId,
          content: solution,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save solution');
      }

      setToast({ message: 'Solution saved successfully!', type: 'success' });
    } catch (err) {
      console.error('Error saving solution:', err);
      setToast({ message: 'Failed to save solution', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

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
            <Button
              onClick={handleSaveSolution}
              disabled={isSaving || !solution.trim()}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Solution'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace - Three Column Layout */}
      <main className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Research Desk */}
          <div className="lg:col-span-3 space-y-6">
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
                      className="w-full px-4 py-3 flex items-center justify-between bg-background hover:bg-muted transition-colors"
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

          {/* Center Panel: Workbench */}
          <div className="lg:col-span-6 space-y-6">
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
          <div className="lg:col-span-3">
            <div className="sticky top-24 bg-card-bg border border-border rounded-xl p-6 max-h-[calc(100vh-8rem)] flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold text-foreground">AI Guide</h2>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-2">
                      Need help? Ask the AI Guide!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      I'm here to guide your thinking, not give you the answer.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-accent/10 ml-4'
                          : 'bg-background mr-4'
                      }`}
                    >
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  ))
                )}
                {isStreaming && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    AI Guide is thinking...
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
                  The <strong className="text-accent">AI Guide</strong> is here to help you think through the problem - not to give you the answer.
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
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
