'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Eye, Edit3 } from 'lucide-react';

interface NotesEditorProps {
  videoId: string;
}

export default function NotesEditor({ videoId }: NotesEditorProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch existing notes on mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch(`/api/notes?videoId=${videoId}`);
        if (response.ok) {
          const data = await response.json();
          setContent(data.content || '');
          if (data.updatedAt) {
            setLastSaved(new Date(data.updatedAt));
          }
        }
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [videoId]);

  // Auto-save with debounce
  useEffect(() => {
    if (!isLoading) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for auto-save (2 seconds after user stops typing)
      saveTimeoutRef.current = setTimeout(() => {
        saveNotes();
      }, 2000);

      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }
  }, [content, isLoading]);

  const saveNotes = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId, content }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastSaved(new Date(data.updatedAt));
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
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
      const textAfterCursor = content.substring(start);
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
      const textAfterCursor = content.substring(start);
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

  const formatLastSaved = () => {
    if (!lastSaved) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return lastSaved.toLocaleDateString();
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
          <h3 className="text-sm font-semibold text-foreground">Your Notes</h3>
        </div>

        {/* View Mode Toggle and Save Status */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
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
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
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

          {/* Save Status */}
          <AnimatePresence mode="wait">
            {isSaving ? (
              <motion.div
                key="saving"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </motion.div>
            ) : lastSaved ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Saved {formatLastSaved()}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {viewMode === 'edit' && (
        <div className="mb-3 flex items-center gap-1 flex-wrap pb-3 border-b border-border">
          <button
            onClick={handleBold}
            className="p-2 rounded-lg hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Bold (⌘/Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={handleItalic}
            className="p-2 rounded-lg hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Italic (⌘/Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={handleUnderline}
            className="p-2 rounded-lg hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Underline (⌘/Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            onClick={handleStrikethrough}
            className="p-2 rounded-lg hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Strikethrough (⌘/Ctrl+K)"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={handleBulletList}
            className="p-2 rounded-lg hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={handleNumberedList}
            className="p-2 rounded-lg hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="p-2 rounded-lg hover:bg-background border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
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
            className="min-h-[10rem] px-4 py-3 bg-background border-2 border-border rounded-xl"
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
    </div>
  );
}
