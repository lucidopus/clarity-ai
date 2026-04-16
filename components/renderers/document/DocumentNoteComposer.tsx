'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { Trash2, BookOpen } from 'lucide-react';

interface DocumentNoteComposerProps {
  open: boolean;
  pageNumber: number | null;
  /** Text quoted above the note body when creating a new note from a selection. */
  prefilledQuote?: string;
  initialContent: string;
  isExisting: boolean;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function getMarkdown(editor: Editor | null): string {
  if (!editor) return '';
  // @ts-expect-error tiptap-markdown adds markdown to storage
  const md = editor.storage.markdown?.getMarkdown?.() as string | undefined;
  return (md ?? editor.getText()).trim();
}

export default function DocumentNoteComposer({
  open,
  pageNumber,
  prefilledQuote,
  initialContent,
  isExisting,
  onClose,
  onSave,
  onDelete,
}: DocumentNoteComposerProps) {
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, forceTick] = useState(0);
  const lastInitRef = useRef<string | null>(null);
  const handleSaveRef = useRef<() => void>(() => {});

  useEffect(() => {
    setMounted(true);
  }, []);

  const startingBody = useMemo(() => {
    if (initialContent) return initialContent;
    if (prefilledQuote) {
      // Prefix selection as a blockquote for context, then an empty line to
      // write into.
      const quote = prefilledQuote
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      return `${quote}\n\n`;
    }
    return '';
  }, [initialContent, prefilledQuote]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Placeholder.configure({
        placeholder:
          'What does this mean? Why does it matter? Link it to what you already know.',
      }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    editorProps: {
      attributes: { class: 'segment-note-editor focus:outline-none' },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          handleSaveRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: () => forceTick((n) => n + 1),
    onSelectionUpdate: () => forceTick((n) => n + 1),
  });

  useEffect(() => {
    if (!open || !editor) return;
    const key = `${pageNumber}::${startingBody}`;
    if (lastInitRef.current === key) return;
    lastInitRef.current = key;
    editor.commands.setContent(startingBody || '', { emitUpdate: false });
    requestAnimationFrame(() => editor.commands.focus('end'));
  }, [open, editor, startingBody, pageNumber]);

  useEffect(() => {
    if (!open) lastInitRef.current = null;
  }, [open]);

  const handleSave = useCallback(async () => {
    if (!editor || saving) return;
    const content = getMarkdown(editor);
    if (!content.trim() && !isExisting) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onSave(content);
      onClose();
    } catch (err) {
      console.error('Failed to save note', err);
    } finally {
      setSaving(false);
    }
  }, [editor, saving, isExisting, onSave, onClose]);

  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    await onDelete();
    onClose();
  }, [onDelete, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
        >
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
            aria-label="Dismiss note"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative w-full max-w-xl rounded-2xl border border-border bg-card-bg shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden"
          >
            <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-border">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">
                {isExisting ? 'Edit note' : 'New note'}
                {pageNumber != null && (
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    · page {pageNumber}
                  </span>
                )}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                ⌘↵ save · esc cancel
              </span>
            </div>
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto scrollbar-themed bg-background/40">
              <EditorContent editor={editor} />
            </div>
            <div className="px-5 py-3 flex items-center gap-2 border-t border-border bg-foreground/[0.02]">
              {isExisting && onDelete && (
                <button
                  onClick={handleDelete}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition text-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="h-8 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-8 px-3 rounded-lg bg-accent text-white font-medium transition text-xs hover:bg-accent-hover disabled:opacity-50 cursor-pointer disabled:cursor-default"
                >
                  {saving ? 'Saving…' : 'Save note'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
