'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  PenLine,
  Search,
  PanelRightClose,
  PanelRightOpen,
  Check,
  Loader2,
  Pencil,
  Trash2,
  Play,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import type { NotesShape, SaveNotes, SegmentNote, TranscriptSegment } from './types';
import { formatTimestamp } from './utils';

interface NotesPanelProps {
  videoTitle?: string;
  notes: NotesShape;
  onSaveNotes: SaveNotes;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCommandPalette: () => void;
  transcript: TranscriptSegment[];
  onSeek: (time: number) => void;
  onEditSegmentNote: (segmentIndex: number) => void;
  width: number;
}

export default function NotesPanel({
  videoTitle,
  notes,
  onSaveNotes,
  collapsed,
  onToggleCollapse,
  onOpenCommandPalette,
  transcript,
  onSeek,
  onEditSegmentNote,
  width,
}: NotesPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const initializedRef = useRef(false);
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: 'Capture the big idea. ⌘/ anchors a note to the current moment.',
      }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    editorProps: {
      attributes: {
        class: 'editor-prose focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      // @ts-expect-error tiptap-markdown adds markdown to storage
      const md: string = ed.storage.markdown.getMarkdown();
      if (md === lastSavedRef.current) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSaving(true);
          await onSaveNotes({ ...notesRef.current, generalNote: md });
          lastSavedRef.current = md;
          setHasSaved(true);
        } finally {
          setIsSaving(false);
        }
      }, 1500);
    },
  });

  useEffect(() => {
    if (initializedRef.current || !editor) return;
    initializedRef.current = true;
    const initial = notes.generalNote || '';
    editor.commands.setContent(initial, { emitUpdate: false });
    lastSavedRef.current = initial;
  }, [editor, notes.generalNote]);

  // Focus the editor whenever the panel transitions from collapsed → open,
  // so users can start typing immediately after opening notes.
  useEffect(() => {
    if (collapsed || !editor) return;
    const t = setTimeout(() => editor.commands.focus('end'), 50);
    return () => clearTimeout(t);
  }, [collapsed, editor]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const segmentNoteEntries = useMemo(() => {
    return notes.segmentNotes
      .map((n) => {
        const m = n.segmentId.match(/segment-(\d+)/);
        if (!m) return null;
        const idx = parseInt(m[1], 10);
        const seg = transcript[idx];
        if (!seg) return null;
        return { note: n, segment: seg, index: idx };
      })
      .filter((x): x is { note: SegmentNote; segment: TranscriptSegment; index: number } => x !== null)
      .sort((a, b) => a.segment.start - b.segment.start);
  }, [notes.segmentNotes, transcript]);

  const wordCount = useMemo(() => {
    const text = (lastSavedRef.current || notes.generalNote || '').replace(/[#*_>`-]/g, ' ');
    const fromGeneral = text.split(/\s+/).filter(Boolean).length;
    const fromSegments = segmentNoteEntries.reduce(
      (acc, { note }) => acc + (note.content || '').split(/\s+/).filter(Boolean).length,
      0
    );
    return fromGeneral + fromSegments;
  }, [notes.generalNote, segmentNoteEntries]);

  const handleDeleteSegmentNote = useCallback(
    async (segmentId: string) => {
      await onSaveNotes({
        ...notes,
        segmentNotes: notes.segmentNotes.filter((n) => n.segmentId !== segmentId),
      });
    },
    [notes, onSaveNotes]
  );

  const lastSavedText = hasSaved ? 'Saved' : 'Up to date';

  return (
    <aside
      className="border-l flex flex-col min-h-0 transition-[width] duration-300 ease-out shrink-0"
      style={{
        width: collapsed ? 44 : width,
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-11 h-full flex flex-col items-center pt-4 gap-3 cursor-pointer hover:bg-(--background)/40 transition-colors"
          title="Open notes (N)"
        >
          <span
            className="w-7 h-7 grid place-items-center rounded-md border"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--accent)',
            }}
          >
            <PanelRightOpen size={14} />
          </span>
          <span
            className="font-mono uppercase tracking-[0.18em] text-[10px] font-semibold"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'var(--secondary)' }}
          >
            Notes · N
          </span>
          <span className="mt-auto mb-3" style={{ color: 'var(--secondary)' }}>
            <PenLine size={14} />
          </span>
        </button>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div
            className="px-5 py-3 border-b flex items-center justify-between gap-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <PenLine size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-semibold truncate" title={videoTitle}>
                {videoTitle || 'Notes'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px]"
                style={{ color: 'var(--secondary)' }}
                title={isSaving ? 'Saving your notes…' : lastSavedText}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={11} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check size={11} strokeWidth={2.5} style={{ color: 'var(--accent)' }} />
                    {lastSavedText}
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-background transition-colors cursor-pointer"
                title="Actions (⌘P)"
                style={{ color: 'var(--secondary)' }}
              >
                <Search size={14} />
              </button>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-background transition-colors cursor-pointer"
                title="Collapse notes (N)"
                style={{ color: 'var(--secondary)' }}
              >
                <PanelRightClose size={14} />
              </button>
            </div>
          </div>

          {/* Shortcut strip */}
          <div
            className="px-5 py-2 border-b flex items-center gap-3 text-[11px] overflow-x-auto"
            style={{ borderColor: 'var(--border)', color: 'var(--secondary)' }}
          >
            <span className="flex items-center gap-1.5">
              <Kbd>⌘/</Kbd>segment note
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>⌘P</Kbd>actions
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>N</Kbd>toggle notes
            </span>
          </div>

          {/* Body — scrollable editor */}
          <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
            <EditorContent editor={editor} />
          </div>

          {/* Segment notes drawer (collapses upward from above the footer) */}
          <SegmentDrawer
            open={drawerOpen}
            onToggle={() => setDrawerOpen((o) => !o)}
            entries={segmentNoteEntries}
            onSeek={onSeek}
            onEdit={onEditSegmentNote}
            onDelete={handleDeleteSegmentNote}
          />

          {/* Footer */}
          <div
            className="px-5 py-3 border-t text-[11px]"
            style={{ borderColor: 'var(--border)', color: 'var(--secondary)' }}
          >
            <span>
              {segmentNoteEntries.length} timestamp{segmentNoteEntries.length === 1 ? '' : 's'} · {wordCount}{' '}
              word{wordCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}

      <style jsx global>{`
        .editor-prose {
          font-family: inherit;
          font-size: 15px;
          line-height: 1.65;
          color: var(--foreground);
        }
        .editor-prose p {
          margin-bottom: 14px;
        }
        .editor-prose p:last-child {
          margin-bottom: 0;
        }
        .editor-prose p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--secondary);
          opacity: 0.7;
          pointer-events: none;
          height: 0;
        }
        .editor-prose ::selection {
          background: color-mix(in srgb, var(--accent) 18%, transparent);
        }
        .editor-prose h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 18px 0 10px;
        }
        .editor-prose h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 16px 0 8px;
        }
        .editor-prose h3 {
          font-size: 15px;
          font-weight: 600;
          margin: 14px 0 6px;
        }
        .editor-prose ul {
          list-style: disc;
          padding-left: 22px;
          margin-bottom: 14px;
        }
        .editor-prose ol {
          list-style: decimal;
          padding-left: 22px;
          margin-bottom: 14px;
        }
        .editor-prose li {
          margin-bottom: 4px;
        }
        .editor-prose code {
          background: color-mix(in srgb, var(--secondary) 14%, transparent);
          padding: 1px 5px;
          border-radius: 4px;
          font-family: var(--font-mono), 'JetBrains Mono', ui-monospace, monospace;
          font-size: 13px;
        }
        .editor-prose blockquote {
          border-left: 3px solid var(--accent);
          padding-left: 12px;
          color: var(--secondary);
          margin: 12px 0;
        }
      `}</style>
    </aside>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono inline-flex items-center"
      style={{
        fontSize: 10,
        background: 'var(--background)',
        border: '1px solid var(--border)',
        padding: '2px 6px',
        borderRadius: 5,
        color: 'var(--secondary)',
      }}
    >
      {children}
    </span>
  );
}

interface SegmentDrawerProps {
  open: boolean;
  onToggle: () => void;
  entries: { note: SegmentNote; segment: TranscriptSegment; index: number }[];
  onSeek: (time: number) => void;
  onEdit: (segmentIndex: number) => void;
  onDelete: (segmentId: string) => void | Promise<void>;
}

function SegmentDrawer({ open, onToggle, entries, onSeek, onEdit, onDelete }: SegmentDrawerProps) {
  const count = entries.length;
  const isEmpty = count === 0;
  const effectivelyOpen = open && !isEmpty;

  return (
    <div
      className="border-t shrink-0"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--card-bg)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={isEmpty}
        className="w-full flex items-center justify-between px-5 py-2.5 text-[12px] transition-colors hover:bg-background cursor-pointer disabled:cursor-not-allowed disabled:hover:bg-transparent"
        style={{ color: 'var(--secondary)' }}
        title={isEmpty ? 'No segment notes yet' : effectivelyOpen ? 'Hide moments' : 'Show moments'}
      >
        <span className="flex items-center gap-2">
          <Sparkles size={12} style={{ color: isEmpty ? 'var(--secondary)' : 'var(--accent)' }} />
          <span className="font-medium" style={{ color: isEmpty ? 'var(--secondary)' : 'var(--foreground)' }}>
            {isEmpty
              ? 'No moments yet — press ⌘/ to anchor one'
              : `${count} moment${count === 1 ? '' : 's'} anchored`}
          </span>
        </span>
        {!isEmpty && (
          <motion.span
            animate={{ rotate: effectivelyOpen ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="grid place-items-center"
            style={{ color: 'var(--secondary)' }}
          >
            <ChevronUp size={14} />
          </motion.span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {effectivelyOpen && (
          <motion.div
            key="segment-drawer-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 280, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="h-full overflow-y-auto px-5 py-4 space-y-3">
              {entries.map(({ note, segment, index }) => (
                <SegmentNoteBand
                  key={note.segmentId}
                  timestamp={segment.start}
                  caption={segment.text}
                  content={note.content}
                  onSeek={() => onSeek(segment.start)}
                  onEdit={() => onEdit(index)}
                  onDelete={() => onDelete(note.segmentId)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SegmentNoteBandProps {
  timestamp: number;
  caption: string;
  content: string;
  onSeek: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SegmentNoteBand({ timestamp, caption, content, onSeek, onEdit, onDelete }: SegmentNoteBandProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div
      className="relative rounded-xl pl-4 pr-3 py-3 group/band"
      style={{
        background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
      }}
    >
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{ background: 'var(--accent)' }}
      />

      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={onSeek}
          className="font-mono inline-flex items-center gap-1 rounded-md cursor-pointer"
          style={{
            fontSize: 11,
            background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
            color: 'var(--accent)',
            padding: '2px 8px',
          }}
          title="Jump to this moment"
        >
          <Play size={9} fill="currentColor" />
          {formatTimestamp(timestamp)}
        </button>
        <div className="flex items-center gap-1 opacity-60 group-hover/band:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            className="w-6 h-6 grid place-items-center rounded-md hover:bg-card-bg cursor-pointer"
            title="Edit note"
            style={{ color: 'var(--secondary)' }}
          >
            <Pencil size={12} />
          </button>
          {confirming ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                className="text-[10px] px-2 h-6 rounded-md font-medium cursor-pointer"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-[10px] px-2 h-6 rounded-md font-medium cursor-pointer"
                style={{ color: 'var(--secondary)' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-6 h-6 grid place-items-center rounded-md hover:bg-card-bg cursor-pointer"
              title="Delete note"
              style={{ color: 'var(--secondary)' }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div
        className="text-[12px] italic mb-2 line-clamp-2"
        style={{ color: 'var(--secondary)' }}
      >
        “{caption}”
      </div>

      <div className="text-[14px] leading-relaxed" style={{ color: 'var(--foreground)' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 mb-2">{children}</ol>,
            code: ({ children }) => (
              <code
                className="font-mono px-1 py-0.5 rounded text-[12px]"
                style={{ background: 'color-mix(in srgb, var(--secondary) 14%, transparent)', color: 'var(--accent)' }}
              >
                {children}
              </code>
            ),
            a: ({ children, href }) => (
              <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }} className="underline">
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
