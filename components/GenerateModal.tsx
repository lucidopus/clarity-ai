'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Link as LinkIcon, Loader2, CheckCircle2, AlertTriangle,
  FileText, Youtube, ArrowRight, Lightbulb, ChevronDown,
  Upload, File, Headphones
} from 'lucide-react';
import Button from './Button';

// ─── Types ───────────────────────────────────────────────────────────────────

type SourceTab = 'youtube' | 'text' | 'document' | 'audio';

export interface SourceItem {
  sourceType: SourceTab;
  youtubeUrl?: string;
  rawText?: string;
  title?: string;
  // File upload fields
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface GeneratePayload {
  sources: SourceItem[];
}

interface AddedSource {
  id: string;
  type: SourceTab;
  label: string;
  meta: string;
  payload: SourceItem;
}

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (payload: GeneratePayload) => void;
  isLoading?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE_PILLS: { id: SourceTab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-3.5 h-3.5" />, color: 'text-red-400' },
  { id: 'text', label: 'Text Notes', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-blue-400' },
  { id: 'document', label: 'Document', icon: <File className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
  { id: 'audio', label: 'Audio', icon: <Headphones className="w-3.5 h-3.5" />, color: 'text-purple-400' },
];

const SOURCE_DOT_COLORS: Record<SourceTab, string> = {
  youtube: 'bg-red-400',
  text: 'bg-blue-400',
  document: 'bg-emerald-400',
  audio: 'bg-purple-400',
};

const ACCEPTED_DOC_TYPES = '.pdf,.pptx';
const ACCEPTED_AUDIO_TYPES = '.mp3,.wav,.m4a,.flac,.ogg,.webm';

// ─── Component ───────────────────────────────────────────────────────────────

export default function GenerateModal({
  isOpen,
  onClose,
  onGenerate,
  isLoading = false,
}: GenerateModalProps) {
  const [activeTab, setActiveTab] = useState<SourceTab>('youtube');
  const [sources, setSources] = useState<AddedSource[]>([]);

  // YouTube state
  const [url, setUrl] = useState('');
  // Text state
  const [rawText, setRawText] = useState('');
  const [textTitle, setTextTitle] = useState('');
  // Document state
  const [docFile, setDocFile] = useState<File | null>(null);
  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Shared
  const [error, setError] = useState('');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      setUrl('');
      setRawText('');
      setTextTitle('');
      setDocFile(null);
      setAudioFile(null);
      setIsUploading(false);
      setError('');
      setActiveTab('youtube');
      setSources([]);
      setExpandedSourceId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // ─── Validation ──────────────────────────────────────────────────────────

  const isValidUrl = useMemo(() => {
    if (!url) return false;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
    return youtubeRegex.test(url.trim());
  }, [url]);

  const wordCount = useMemo(() => {
    return rawText.trim().split(/\s+/).filter(Boolean).length;
  }, [rawText]);

  const isTextValid = rawText.trim().length > 0 && wordCount <= 1000;

  const canAdd =
    activeTab === 'youtube' ? isValidUrl :
    activeTab === 'text' ? isTextValid :
    activeTab === 'document' ? !!docFile :
    activeTab === 'audio' ? !!audioFile :
    false;
  const canGenerate = sources.length > 0;

  // Badge counts per type
  const badgeCounts = useMemo(() => {
    const counts: Record<SourceTab, number> = { youtube: 0, text: 0, document: 0, audio: 0 };
    sources.forEach((s) => { counts[s.type]++; });
    return counts;
  }, [sources]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleTabChange = (tab: SourceTab) => {
    setActiveTab(tab);
    setError('');
  };

  const handleAddSource = useCallback(async () => {
    setError('');

    if (activeTab === 'youtube') {
      if (!isValidUrl) {
        setError('Please enter a valid YouTube URL.');
        return;
      }
      const hasYoutube = sources.some((s) => s.type === 'youtube');
      if (hasYoutube) {
        setError('Only one YouTube video can be added. Remove the existing one first.');
        return;
      }
      const newSource: AddedSource = {
        id: crypto.randomUUID(),
        type: 'youtube',
        label: url.trim().length > 40 ? url.trim().slice(0, 37) + '...' : url.trim(),
        meta: 'YouTube',
        payload: { sourceType: 'youtube', youtubeUrl: url.trim() },
      };
      setSources((prev) => [...prev, newSource]);
      setUrl('');
    } else if (activeTab === 'text') {
      if (!isTextValid) {
        setError('Please enter some text content.');
        return;
      }
      const textCount = sources.filter((s) => s.type === 'text').length;
      if (textCount >= 2) {
        setError('Maximum 2 text notes allowed per generation.');
        return;
      }
      const titleStr = textTitle.trim() || `Text notes (${wordCount} words)`;
      const newSource: AddedSource = {
        id: crypto.randomUUID(),
        type: 'text',
        label: titleStr.length > 40 ? titleStr.slice(0, 37) + '...' : titleStr,
        meta: `${wordCount} words`,
        payload: {
          sourceType: 'text',
          rawText: rawText.trim(),
          title: textTitle.trim() || undefined,
        },
      };
      setSources((prev) => [...prev, newSource]);
      setRawText('');
      setTextTitle('');
    } else if (activeTab === 'document') {
      if (!docFile) {
        setError('Please select a file.');
        return;
      }
      const docCount = sources.filter((s) => s.type === 'document').length;
      if (docCount >= 2) {
        setError('Maximum 2 documents allowed per generation.');
        return;
      }

      // Upload to Supabase via API
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', docFile);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Upload failed');
          setIsUploading(false);
          return;
        }

        const fileSizeMB = (docFile.size / (1024 * 1024)).toFixed(1);
        const ext = docFile.name.split('.').pop()?.toUpperCase() || 'DOC';
        const label = docFile.name.length > 35 ? docFile.name.slice(0, 32) + '...' : docFile.name;

        const newSource: AddedSource = {
          id: crypto.randomUUID(),
          type: 'document',
          label,
          meta: `${ext} - ${fileSizeMB} MB`,
          payload: {
            sourceType: 'document',
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileSize: data.fileSize,
            mimeType: data.mimeType,
          },
        };
        setSources((prev) => [...prev, newSource]);
        setDocFile(null);
        // Reset the file input
        const fileInput = document.getElementById('doc-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } catch {
        setError('Failed to upload file. Please try again.');
      } finally {
        setIsUploading(false);
      }
    } else if (activeTab === 'audio') {
      if (!audioFile) {
        setError('Please select an audio file.');
        return;
      }
      // Only one audio file allowed
      const hasAudio = sources.some((s) => s.type === 'audio');
      if (hasAudio) {
        setError('Only one audio file allowed per generation. Remove the existing one first.');
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', audioFile);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Upload failed');
          setIsUploading(false);
          return;
        }

        const fileSizeMB = (audioFile.size / (1024 * 1024)).toFixed(1);
        const ext = audioFile.name.split('.').pop()?.toUpperCase() || 'AUDIO';
        const label = audioFile.name.length > 35 ? audioFile.name.slice(0, 32) + '...' : audioFile.name;

        const newSource: AddedSource = {
          id: crypto.randomUUID(),
          type: 'audio',
          label,
          meta: `${ext} - ${fileSizeMB} MB`,
          payload: {
            sourceType: 'audio',
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileSize: data.fileSize,
            mimeType: data.mimeType,
          },
        };
        setSources((prev) => [...prev, newSource]);
        setAudioFile(null);
        const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } catch {
        setError('Failed to upload audio file. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  }, [activeTab, isValidUrl, isTextValid, url, rawText, textTitle, wordCount, sources, docFile, audioFile]);

  const handleRemoveSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleGenerate = () => {
    if (isLoading || sources.length === 0) return;
    onGenerate({ sources: sources.map((s) => s.payload) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && activeTab === 'youtube' && canAdd) {
      e.preventDefault();
      handleAddSource();
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-card-bg border border-border rounded-2xl shadow-xl w-full max-w-[740px] mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Generate Study Materials</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add your sources &mdash; we&apos;ll create flashcards, quizzes, and more
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close modal"
                className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Two-panel body */}
            <div className="flex min-h-[360px]">
              {/* ── LEFT: Focus Input ──────────────────────────────── */}
              <div className="flex-1 p-5 border-r border-border flex flex-col">
                {/* Source type pills */}
                <div className="flex gap-1 mb-4">
                  {SOURCE_PILLS.map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => handleTabChange(pill.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        activeTab === pill.id
                          ? 'bg-accent/10 text-accent border border-accent/25'
                          : 'text-muted-foreground hover:text-foreground border border-transparent'
                      }`}
                    >
                      {pill.icon}
                      {pill.label}
                      {badgeCounts[pill.id] > 0 && (
                        <span className="ml-0.5 bg-accent text-background text-[10px] font-bold px-1.5 py-px rounded-full leading-none">
                          {badgeCounts[pill.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Contextual input */}
                <AnimatePresence mode="wait">
                  {activeTab === 'youtube' && (
                    <motion.div
                      key="youtube-input"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.12 }}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {isValidUrl ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <LinkIcon className="w-4 h-4" />
                            )}
                          </div>
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => { setUrl(e.target.value); if (error) setError(''); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Paste YouTube URL..."
                            className="w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                            disabled={isLoading}
                            autoFocus
                          />
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={!isValidUrl || isLoading}
                          onClick={handleAddSource}
                          className="shrink-0 gap-1"
                        >
                          Add <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                  {activeTab === 'text' && (
                    <motion.div
                      key="text-input"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.12 }}
                      className="flex flex-col gap-3 flex-1"
                    >
                      <input
                        type="text"
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                        disabled={isLoading}
                        autoFocus
                      />
                      <textarea
                        value={rawText}
                        onChange={(e) => { setRawText(e.target.value); if (error) setError(''); }}
                        placeholder="Paste your lecture notes, study notes, or any educational content..."
                        rows={6}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors resize-y min-h-[120px] leading-relaxed flex-1"
                        disabled={isLoading}
                      />
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${wordCount > 1000 ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {wordCount > 0 && `${wordCount}/1,000 ${wordCount === 1 ? 'word' : 'words'}`}
                        </span>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={!isTextValid || isLoading}
                          onClick={handleAddSource}
                          className="gap-1"
                        >
                          Add to Sources <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                  {activeTab === 'document' && (
                    <motion.div
                      key="document-input"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.12 }}
                      className="flex flex-col gap-3 flex-1"
                    >
                      {/* Drop zone / file selector */}
                      <label
                        htmlFor="doc-file-input"
                        className={`flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                          docFile
                            ? 'border-emerald-400/50 bg-emerald-400/5'
                            : 'border-border hover:border-accent/40 hover:bg-accent/5'
                        }`}
                      >
                        {docFile ? (
                          <>
                            <div className="w-10 h-10 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-foreground">{docFile.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {(docFile.size / (1024 * 1024)).toFixed(1)} MB &middot; Click to change
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                              <Upload className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-foreground">
                                Click to select a file
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                PDF or PPTX &middot; Max 25 MB
                              </p>
                            </div>
                          </>
                        )}
                        <input
                          id="doc-file-input"
                          type="file"
                          accept={ACCEPTED_DOC_TYPES}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setDocFile(file);
                              if (error) setError('');
                            }
                          }}
                          className="hidden"
                          disabled={isLoading || isUploading}
                        />
                      </label>

                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={!docFile || isLoading || isUploading}
                          onClick={handleAddSource}
                          className="gap-1"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              Add to Sources <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                  {activeTab === 'audio' && (
                    <motion.div
                      key="audio-input"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.12 }}
                      className="flex flex-col gap-3 flex-1"
                    >
                      <label
                        htmlFor="audio-file-input"
                        className={`flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                          audioFile
                            ? 'border-purple-400/50 bg-purple-400/5'
                            : 'border-border hover:border-accent/40 hover:bg-accent/5'
                        }`}
                      >
                        {audioFile ? (
                          <>
                            <div className="w-10 h-10 rounded-lg bg-purple-400/10 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-foreground">{audioFile.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {(audioFile.size / (1024 * 1024)).toFixed(1)} MB &middot; Click to change
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                              <Headphones className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-foreground">
                                Upload a recorded lecture or audio notes
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                MP3, WAV, M4A, FLAC, OGG, WebM &middot; Max 25 MB
                              </p>
                            </div>
                          </>
                        )}
                        <input
                          id="audio-file-input"
                          type="file"
                          accept={ACCEPTED_AUDIO_TYPES}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAudioFile(file);
                              if (error) setError('');
                            }
                          }}
                          className="hidden"
                          disabled={isLoading || isUploading}
                        />
                      </label>

                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={!audioFile || isLoading || isUploading}
                          onClick={handleAddSource}
                          className="gap-1"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              Add to Sources <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-500 mt-3">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {/* Tip box */}
                <div className="mt-auto pt-4">
                  <div className="flex items-start gap-2.5 p-3 bg-muted/30 border border-border/50 rounded-lg">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Add one or more sources and hit <strong className="text-foreground/80">Generate</strong> to create personalized study materials.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Source Panel ────────────────────────────── */}
              <div className="w-[240px] p-5 flex flex-col bg-muted/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sources ({sources.length})
                  </span>
                </div>

                {/* Source list */}
                <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {sources.map((source) => {
                      const isExpanded = expandedSourceId === source.id;
                      return (
                        <motion.div
                          key={source.id}
                          layout
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className={`bg-card-bg border rounded-lg overflow-hidden transition-colors ${
                            isExpanded ? 'border-accent/30' : 'border-border/60'
                          }`}
                        >
                          {/* Row header — clickable to expand */}
                          <button
                            type="button"
                            onClick={() => setExpandedSourceId(isExpanded ? null : source.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 group text-left cursor-pointer"
                          >
                            <div className={`w-2 h-2 rounded-sm shrink-0 ${SOURCE_DOT_COLORS[source.type]}`} />
                            <span className="flex-1 min-w-0 text-xs font-medium text-foreground truncate">
                              {source.label}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Expanded detail preview */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-2.5 border-t border-border/40">
                                  {source.type === 'youtube' ? (
                                    <div className="pt-2 space-y-1.5">
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">URL</p>
                                      <p className="text-[11px] text-foreground/80 break-all leading-relaxed">
                                        {source.payload.youtubeUrl}
                                      </p>
                                    </div>
                                  ) : source.type === 'document' || source.type === 'audio' ? (
                                    <div className="pt-2 space-y-1.5">
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">File</p>
                                      <p className="text-[11px] text-foreground/80">{source.payload.fileName}</p>
                                      <p className="text-[10px] text-muted-foreground">{source.meta}</p>
                                    </div>
                                  ) : (
                                    <div className="pt-2 space-y-1.5">
                                      {source.payload.title && (
                                        <>
                                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Title</p>
                                          <p className="text-[11px] text-foreground/80">{source.payload.title}</p>
                                        </>
                                      )}
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                        Content &middot; {source.meta}
                                      </p>
                                      <p className="text-[11px] text-foreground/60 leading-relaxed line-clamp-4">
                                        {source.payload.rawText}
                                      </p>
                                    </div>
                                  )}
                                  {/* Remove action */}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveSource(source.id); }}
                                    disabled={isLoading}
                                    className="mt-2 flex items-center gap-1 text-[10px] text-red-400/70 hover:text-red-400 transition-colors cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" /> Remove
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Empty state */}
                  {sources.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                      <div className="text-2xl opacity-30 mb-2">📚</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No sources yet. Use the input on the left to add one.
                      </p>
                    </div>
                  )}
                </div>

                {/* Generate button */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!canGenerate || isLoading}
                    onClick={handleGenerate}
                    className="w-full justify-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Materials'
                    )}
                  </Button>
                  {sources.length === 1 && (
                    <p className="text-center text-[10px] text-muted-foreground mt-2">
                      1 source ready
                    </p>
                  )}
                  {sources.length > 1 && (
                    <p className="text-center text-[10px] text-muted-foreground mt-2">
                      {sources.length} sources &middot; Combined
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
