'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Trash2 } from 'lucide-react';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const lastSavedContentRef = useRef('');

  // Initialize Tiptap editor
  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration issues
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Take notes while watching the video...',
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      // Get markdown content from editor
      // @ts-expect-error - tiptap-markdown adds markdown to storage
      const markdown = editor.storage.markdown.getMarkdown();
      
      // Debounced auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (markdown !== lastSavedContentRef.current) {
        saveTimeoutRef.current = setTimeout(() => {
          saveNotes(markdown);
        }, 2000);
      }
    },
  });

  // Initialize content from props or fetch if not provided (ONLY ONCE)
  useEffect(() => {
    // Only run on initial mount
    if (initializedRef.current || !editor) return;

    const initializeContent = async () => {
      let initialContent = '';

      if (notes && segmentId) {
        // Find segment note
        const segmentNote = notes.segmentNotes.find(note => note.segmentId === segmentId);
        initialContent = segmentNote?.content || '';
      } else if (notes && !segmentId) {
        // Use general note
        initialContent = notes.generalNote || '';
      } else {
        // Fallback to old API for backward compatibility
        try {
          const url = segmentId
            ? `/api/videos/${videoId}/segments/${segmentId}/notes`
            : `/api/notes?videoId=${videoId}`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            initialContent = data.content || '';
          }
        } catch (error) {
          console.error('Error fetching notes:', error);
        }
      }

      // Set content in editor
      editor.commands.setContent(initialContent, {
        emitUpdate: false,
      });
      lastSavedContentRef.current = initialContent;
      setIsLoading(false);
      initializedRef.current = true;
    };

    initializeContent();
  }, [videoId, segmentId, notes, editor]);

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
      editor?.commands.setContent(''); // Clear editor content
      lastSavedContentRef.current = ''; // Update last saved content
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting segment note:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [segmentId, notes, onSaveNotes, editor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

  if (!editor) {
    return null;
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

        {/* Delete Button and Save Status */}
        <div className="flex items-center gap-3">
          {/* Delete Button (only for segment notes) */}
          {segmentId && editor.getText().trim() && (
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
      <div className="mb-3 flex items-center gap-1 flex-wrap pb-3 border-b border-border">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-lg cursor-pointer hover:bg-background border border-border transition-all duration-200 ${
            editor.isActive('bold') ? 'bg-accent text-white border-accent' : 'text-muted-foreground hover:text-foreground hover:border-accent'
          }`}
          title="Bold (⌘/Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-lg cursor-pointer hover:bg-background border border-border transition-all duration-200 ${
            editor.isActive('italic') ? 'bg-accent text-white border-accent' : 'text-muted-foreground hover:text-foreground hover:border-accent'
          }`}
          title="Italic (⌘/Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded-lg cursor-pointer hover:bg-background border border-border transition-all duration-200 ${
            editor.isActive('underline') ? 'bg-accent text-white border-accent' : 'text-muted-foreground hover:text-foreground hover:border-accent'
          }`}
          title="Underline (⌘/Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded-lg cursor-pointer hover:bg-background border border-border transition-all duration-200 ${
            editor.isActive('strike') ? 'bg-accent text-white border-accent' : 'text-muted-foreground hover:text-foreground hover:border-accent'
          }`}
          title="Strikethrough (⌘/Ctrl+Shift+S)"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-lg cursor-pointer hover:bg-background border border-border transition-all duration-200 ${
            editor.isActive('bulletList') ? 'bg-accent text-white border-accent' : 'text-muted-foreground hover:text-foreground hover:border-accent'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded-lg cursor-pointer hover:bg-background border border-border transition-all duration-200 ${
            editor.isActive('orderedList') ? 'bg-accent text-white border-accent' : 'text-muted-foreground hover:text-foreground hover:border-accent'
          }`}
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
                  <span className="text-muted-foreground">Bold</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-card-bg border border-border rounded font-mono">⌘/Ctrl+I</kbd>
                  <span className="text-muted-foreground">Italic</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-card-bg border border-border rounded font-mono">⌘/Ctrl+U</kbd>
                  <span className="text-muted-foreground">Underline</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-card-bg border border-border rounded font-mono">⌘/Ctrl+Shift+S</kbd>
                  <span className="text-muted-foreground">Strike</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-card-bg border border-border rounded font-mono">- Space</kbd>
                  <span className="text-muted-foreground">Bullet</span>
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

      {/* Tiptap Editor */}
      <div className="bg-background border-2 border-border rounded-xl focus-within:ring-2 focus-within:ring-accent focus-within:border-transparent transition-all duration-200 h-[200px] overflow-y-auto scrollbar-themed">
        <EditorContent editor={editor} />
      </div>

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
