'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Monitor, Upload, File, Loader2, AlertTriangle } from 'lucide-react';
import Button from '../Button';

export interface LiveLectureConfig {
  title: string;
  audioSource: 'mic' | 'system';
  contextDocIds: string[];
  contextDocs: Array<{ sourceId: string; fileName: string }>;
}

interface LiveLectureSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: LiveLectureConfig) => void;
  isLoading?: boolean;
  externalError?: string | null;
  staleSessionId?: string | null;
  onForceEndAndRetry?: (config: LiveLectureConfig) => void;
}

export default function LiveLectureSetupModal({
  isOpen,
  onClose,
  onStart,
  isLoading = false,
  externalError = null,
  staleSessionId = null,
  onForceEndAndRetry,
}: LiveLectureSetupModalProps) {
  const [title, setTitle] = useState('');
  const [audioSource, setAudioSource] = useState<'mic' | 'system'>('mic');
  const [contextDocs, setContextDocs] = useState<Array<{ sourceId: string; fileName: string; fileUrl: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset on open + auto-generate title
  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setTitle(`Lecture — ${dateStr}`);
    setAudioSource('mic');
    setContextDocs([]);
    setError('');
    setIsUploading(false);

    // Focus title input
    setTimeout(() => titleInputRef.current?.select(), 100);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (contextDocs.length >= 2) {
      setError('Maximum 2 context documents allowed');
      return;
    }

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (!validTypes.includes(file.type)) {
      setError('Only PDF and PPTX files are supported');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File must be under 25 MB');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'document');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Extract document content and create SourceContent record
      // so the ask route can use it for mid-lecture Q&A context
      const extractRes = await fetch('/api/live-lecture/extract-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: data.fileUrl,
          fileName: file.name,
          mimeType: file.type,
        }),
      });

      if (!extractRes.ok) {
        const extractData = await extractRes.json();
        throw new Error(extractData.error || 'Failed to extract document content');
      }

      const extractData = await extractRes.json();

      setContextDocs(prev => [...prev, {
        sourceId: extractData.sourceId,
        fileName: file.name,
        fileUrl: data.fileUrl,
      }]);
    } catch {
      setError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeDoc = (index: number) => {
    setContextDocs(prev => prev.filter((_, i) => i !== index));
  };

  const buildConfig = (): LiveLectureConfig | null => {
    if (!title.trim()) {
      setError('Please enter a lecture name');
      return null;
    }
    return {
      title: title.trim(),
      audioSource,
      contextDocIds: contextDocs.map(d => d.sourceId),
      contextDocs: contextDocs.map(d => ({ sourceId: d.sourceId, fileName: d.fileName })),
    };
  };

  const handleStart = () => {
    const cfg = buildConfig();
    if (cfg) onStart(cfg);
  };

  const handleForceEnd = () => {
    if (!onForceEndAndRetry) return;
    const cfg = buildConfig();
    if (cfg) onForceEndAndRetry(cfg);
  };

  const hasStaleSession = !!staleSessionId;
  const displayError = externalError || error;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Modal — bottom sheet on mobile, centered on sm+ */}
          <motion.div
            className="relative w-full sm:max-w-lg bg-card-bg border-t sm:border border-border rounded-t-2xl sm:rounded-2xl landscape-phone-fill shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border shrink-0">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Start a Live Session</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Clara will listen along and help you learn</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-bg/80 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-5 flex-1 overflow-y-auto">
              {/* Lecture Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Lecture Name</label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="CS 440 — Lecture 12"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm"
                />
              </div>

              {/* Audio Source */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Where are you attending?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAudioSource('mic')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      audioSource === 'mic'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground'
                    }`}
                  >
                    <Mic className="w-6 h-6" />
                    <div className="text-center">
                      <div className="text-sm font-medium">In a Classroom</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setAudioSource('system')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      audioSource === 'system'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground'
                    }`}
                  >
                    <Monitor className="w-6 h-6" />
                    <div className="text-center">
                      <div className="text-sm font-medium">Online Lecture</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Context Documents */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Context Documents <span className="text-muted-foreground font-normal">(optional, max 2)</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload slides or notes — Clara will use them to answer your questions better.
                </p>

                {/* Uploaded docs */}
                {contextDocs.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {contextDocs.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg">
                        <File className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-sm text-foreground truncate flex-1">{doc.fileName}</span>
                        <button
                          onClick={() => removeDoc(i)}
                          aria-label={`Remove ${doc.fileName}`}
                          className="inline-flex items-center justify-center min-h-11 min-w-11 -m-2 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {contextDocs.length < 2 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-3 py-2 w-full border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {isUploading ? 'Uploading...' : 'Upload PDF or PPTX'}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.pptx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Privacy Note */}
              <div className="flex items-start gap-2 px-3 py-2.5 bg-accent/5 border border-accent/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Audio is processed in real-time and never stored. Only the transcript text is kept.
                </p>
              </div>

              {/* Stale session recovery banner */}
              {hasStaleSession && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/5 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="text-foreground font-medium mb-0.5">Previous session detected</p>
                    <p>
                      {displayError || "You have a previous session that wasn't ended properly. End it and start fresh?"}
                    </p>
                  </div>
                </div>
              )}

              {/* Error (non-stale) */}
              {!hasStaleSession && displayError && (
                <p className="text-sm text-red-400">{displayError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              {hasStaleSession && onForceEndAndRetry ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleForceEnd}
                  disabled={isLoading || isUploading || !title.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Ending previous...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      End Previous & Start New
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStart}
                  disabled={isLoading || isUploading || !title.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Start Listening
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
