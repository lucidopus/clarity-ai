'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Eye, Edit3, Trash2 } from 'lucide-react';

interface NotesEditorProps {
  videoId: string;
  segmentId?: string; // Optional for segment-specific notes
  notes?: {
    generalNote: string;
    segmentNotes: Array<{
      segmentId: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
  onSaveNotes?: (notes: {
    generalNote: string;
    segmentNotes: Array<{
      segmentId: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }) => Promise<void>;
}

export default function NotesEditor({ videoId, segmentId, notes, onSaveNotes }: NotesEditorProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);
  const lastSavedContentRef = useRef('');

  // Initialize content from props or fetch if not provided (ONLY ONCE)
  useEffect(() => {
    // Only run on initial mount
    if (initializedRef.current) return;

    if (notes && segmentId) {
      // Find segment note
      const segmentNote = notes.segmentNotes.find(note => note.segmentId === segmentId);
      const initialContent = segmentNote?.content || '';
      setContent(initialContent);
      lastSavedContentRef.current = initialContent;
      setIsLoading(false);
      initializedRef.current = true;
    } else if (notes && !segmentId) {
      // Use general note
      const initialContent = notes.generalNote || '';
      setContent(initialContent);
      lastSavedContentRef.current = initialContent;
      setIsLoading(false);
      initializedRef.current = true;
    } else {
      // Fallback to old API for backward compatibility
      const fetchNotes = async () => {
        try {
          const url = segmentId
            ? `/api/videos/${videoId}/segments/${segmentId}/notes`
            : `/api/notes?videoId=${videoId}`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const initialContent = data.content || '';
            setContent(initialContent);
            lastSavedContentRef.current = initialContent;
          }
        } catch (error) {
          console.error('Error fetching notes:', error);
        } finally {
          setIsLoading(false);
          initializedRef.current = true;
        }
      };

      fetchNotes();
    }
  }, [videoId, segmentId, notes]);

  const saveNotes = useCallback(async (contentToSave: string) => {
    setIsSaving(true);
    try {
      if (onSaveNotes && notes) {
        // Use new callback-based saving
        const updatedNotes = { ...notes };
        if (segmentId) {
          // Update or add segment note
          const existingIndex = updatedNotes.segmentNotes.findIndex(note => note.segmentId === segmentId);
          const now = new Date();
          if (existingIndex >= 0) {
            updatedNotes.segmentNotes[existingIndex] = {
              ...updatedNotes.segmentNotes[existingIndex],
              content: contentToSave,
              updatedAt: now
            };
          } else {
            updatedNotes.segmentNotes.push({
              segmentId,
              content: contentToSave,
              createdAt: now,
              updatedAt: now
            });
          }
        } else {
          // Update general note
          updatedNotes.generalNote = contentToSave;
        }
        await onSaveNotes(updatedNotes);
      } else {
        // Fallback to old API
        const url = segmentId
          ? `/api/videos/${videoId}/segments/${segmentId}/notes`
          : '/api/notes';
        const body = segmentId
          ? JSON.stringify({ content: contentToSave })
          : JSON.stringify({ videoId, content: contentToSave });

        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: body,
        });
      }
      // Update last saved content after successful save
      lastSavedContentRef.current = contentToSave;
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setIsSaving(false);
    }
  }, [videoId, segmentId, notes, onSaveNotes]);

  const deleteSegmentNote = useCallback(async () => {
    if (!segmentId || !notes || !onSaveNotes) return;

    setIsDeleting(true);
    try {
      // Filter out the segment note to delete
      const updatedNotes = {
        ...notes,
        segmentNotes: notes.segmentNotes.filter(note => note.segmentId !== segmentId)
      };

      await onSaveNotes(updatedNotes);
      setContent(''); // Clear local content
      lastSavedContentRef.current = ''; // Update last saved content
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting segment note:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [segmentId, notes, onSaveNotes]);

  // Auto-save with debounce
  useEffect(() => {
    if (!isLoading && initializedRef.current && content !== lastSavedContentRef.current) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for auto-save (2 seconds after user stops typing)
      saveTimeoutRef.current = setTimeout(() => {
        saveNotes(content);
      }, 2000);

      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }
  }, [content, isLoading, saveNotes]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    // Cmd/Ctrl + B for bold
    if (modKey && e.key === 'b') {
      e.preventDefault();
      wrapSelectedText('**', '**');
    }

    // Cmd/Ctrl + I for italic
    if (modKey && e.key === 'i') {
      e.preventDefault();
      wrapSelectedText('*', '*');
    }

    // Cmd/Ctrl + U for underline
    if (modKey && e.key === 'u') {
      e.preventDefault();
      wrapSelectedText('__', '__');
    }

    // Cmd/Ctrl + K for strikethrough
    if (modKey && e.key === 'k') {
      e.preventDefault();
      wrapSelectedText('~~', '~~');
    }

    // Auto-bullet on Enter after bullet
    if (e.key === 'Enter') {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      // Check if current line starts with bullet
      const bulletMatch = currentLine.match(/^(\s*[-*]\s)/);
      if (bulletMatch) {
        e.preventDefault();
        const bullet = bulletMatch[1];
        const newContent = content.substring(0, cursorPos) + '\n' + bullet + content.substring(cursorPos);
        setContent(newContent);

        // Set cursor position after the new bullet
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + bullet.length + 1;
        }, 0);
      }

      // Check if current line starts with numbered list
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
      if (numberMatch) {
        e.preventDefault();
        const indent = numberMatch[1];
        const nextNumber = parseInt(numberMatch[2]) + 1;
        const numberedBullet = `${indent}${nextNumber}. `;
        const newContent = content.substring(0, cursorPos) + '\n' + numberedBullet + content.substring(cursorPos);
        setContent(newContent);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + numberedBullet.length + 1;
        }, 0);
      }
    }
  };

  // Wrap selected text with prefix and suffix
  const wrapSelectedText = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const newText =
      content.substring(0, start) +
      prefix + selectedText + suffix +
      content.substring(end);

    setContent(newText);

    // Restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = end + prefix.length;
    }, 0);
  };

  // Toolbar button handlers
  const handleBold = () => wrapSelectedText('**', '**');
  const handleItalic = () => wrapSelectedText('*', '*');
  const handleUnderline = () => wrapSelectedText('__', '__');
  const handleStrikethrough = () => wrapSelectedText('~~', '~~');

  const handleBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    // If text is selected, add bullet to each line
    if (selectedText) {
      const lines = selectedText.split('\n');
      const bulletedLines = lines.map(line => line.trim() ? `- ${line}` : line).join('\n');
      const newText = content.substring(0, start) + bulletedLines + content.substring(end);
      setContent(newText);
    } else {
      // Add bullet at current line
      const textBeforeCursor = content.substring(0, start);
      const lastNewline = textBeforeCursor.lastIndexOf('\n');
      const lineStart = lastNewline >= 0 ? lastNewline + 1 : 0;

      const newText = content.substring(0, lineStart) + '- ' + content.substring(lineStart);
      setContent(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleNumberedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    // If text is selected, add numbers to each line
    if (selectedText) {
      const lines = selectedText.split('\n');
      const numberedLines = lines.map((line, index) =>
        line.trim() ? `${index + 1}. ${line}` : line
      ).join('\n');
      const newText = content.substring(0, start) + numberedLines + content.substring(end);
      setContent(newText);
    } else {
      // Add number at current line
      const textBeforeCursor = content.substring(0, start);
      const lastNewline = textBeforeCursor.lastIndexOf('\n');
      const lineStart = lastNewline >= 0 ? lastNewline + 1 : 0;

      const newText = content.substring(0, lineStart) + '1. ' + content.substring(lineStart);
      setContent(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + 3;
      }, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card-bg border-2 border-border rounded-2xl p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-border rounded w-24 mb-4"></div>
          <div className="h-32 bg-border rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg border-2 border-border rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h3 className="text-sm font-semibold text-foreground">
            {segmentId ? 'Segment Notes' : 'Your Notes'}
          </h3>
        </div>

        {/* View Mode Toggle, Delete Button, and Save Status */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('edit')}
              className={`flex cursor-pointer items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                viewMode === 'edit'
                  ? 'bg-accent text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Edit mode"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex cursor-pointer items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                viewMode === 'preview'
                  ? 'bg-accent text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Preview mode"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>

          {/* Delete Button (only for segment notes) */}
          {segmentId && content.trim() && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="p-2 rounded-lg cursor-pointer text-red-500 hover:bg-red-500/10 border border-border hover:border-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete this segment note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Save Status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AnimatePresence mode="wait">
              {isSaving ? (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5"
                >
                  <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="auto-save"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Auto-saves</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {viewMode === 'edit' && (
        <div className="mb-3 flex items-center gap-1 flex-wrap pb-3 border-b border-border">
          <button
            onClick={handleBold}
            className="p-2 rounded-lg cursor-pointer hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Bold (⌘/Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={handleItalic}
            className="p-2 rounded-lg cursor-pointer hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Italic (⌘/Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={handleUnderline}
            className="p-2 rounded-lg cursor-pointer hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Underline (⌘/Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            onClick={handleStrikethrough}
            className="p-2 rounded-lg cursor-pointer hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Strikethrough (⌘/Ctrl+K)"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={handleBulletList}
            className="p-2 rounded-lg cursor-pointer hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={handleNumberedList}
            className="p-2 rounded-lg cursor-pointer hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="p-2 rounded-lg cursor-pointer hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="View keyboard shortcuts"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Panel */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="bg-background/50 border border-border rounded-xl p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-card-bg border border-border rounded font-mono">⌘/Ctrl+B</kbd>
                  <span className="text-muted-foreground">**Bold**</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-card-bg border border-border rounded font-mono">⌘/Ctrl+I</kbd>
                  <span className="text-muted-foreground">*Italic*</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-card-bg border border-border rounded font-mono">⌘/Ctrl+U</kbd>
                  <span className="text-muted-foreground">__Underline__</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-card-bg border border-border rounded font-mono">⌘/Ctrl+K</kbd>
                  <span className="text-muted-foreground">~~Strike~~</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-card-bg border border-border rounded font-mono">- Space</kbd>
                  <span className="text-muted-foreground">• Bullet</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-card-bg border border-border rounded font-mono">1. Space</kbd>
                  <span className="text-muted-foreground">Numbered</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area - Edit or Preview Mode */}
      <AnimatePresence mode="wait">
        {viewMode === 'edit' ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Take notes while watching the video..."
              className="w-full h-40 px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
            />
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-40 px-4 py-3 bg-background border-2 border-border rounded-xl"
          >
            {content.trim() ? (
              <div className="markdown-preview text-foreground text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Custom styling for markdown elements
                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
                    u: ({ children }) => <span className="underline">{children}</span>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="ml-2">{children}</li>,
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h3>,
                    code: ({ children }) => (
                      <code className="bg-muted/30 px-1.5 py-0.5 rounded text-sm font-mono text-accent">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-muted/30 p-3 rounded-lg overflow-x-auto mb-3">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-accent pl-4 italic text-muted-foreground mb-3">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="border-border my-4" />,
                    a: ({ children, href }) => (
                      <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center justify-center h-38 text-muted-foreground">
                <p className="text-sm">No content to preview. Switch to Edit mode to start writing.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card-bg border-2 border-border rounded-2xl p-6 max-w-md mx-4"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Delete Segment Note?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete this note. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSegmentNote}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
