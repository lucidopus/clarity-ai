'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { Play, Trash2, Bold, Italic, List, Code, Info } from 'lucide-react';
import type { Chapter, TranscriptSegment } from './types';
import { clamp, formatTimestamp } from './utils';

interface SegmentNotePopupProps {
  open: boolean;
  segmentIndex: number | null;
  transcript: TranscriptSegment[];
  initialContent: string;
  isExisting: boolean;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  scrubberRef?: React.RefObject<HTMLDivElement | null>;
  duration?: number;
  chapters?: Chapter[];
}

interface ScrubberSpotlight {
  left: number;
  top: number;
  width: number;
  height: number;
}

function getMarkdown(editor: Editor | null): string {
  if (!editor) return '';
  // @ts-expect-error tiptap-markdown adds markdown to storage
  const md = editor.storage.markdown?.getMarkdown?.() as string | undefined;
  return (md ?? editor.getText()).trim();
}

export default function SegmentNotePopup({
  open,
  segmentIndex,
  transcript,
  initialContent,
  isExisting,
  onClose,
  onSave,
  onDelete,
  scrubberRef,
  duration = 0,
  chapters = [],
}: SegmentNotePopupProps) {
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, forceTick] = useState(0);
  const [spotlight, setSpotlight] = useState<ScrubberSpotlight | null>(null);
  const lastInitRef = useRef<string | null>(null);
  // Ref so the tiptap editor's keymap can call the latest handleSave without
  // recreating the editor on every render.
  const handleSaveRef = useRef<() => void>(() => {});

  useEffect(() => { setMounted(true); }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Placeholder.configure({
        placeholder: 'Write your thought. ⌘B bold · ⌘I italic · ⌘⇧8 list',
      }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    editorProps: {
      attributes: { class: 'segment-note-editor focus:outline-none' },
      // Intercept Mod-Enter before tiptap's HardBreak inserts a <br>, and
      // stop propagation so the window-level listener doesn't double-save.
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

  // Sync content when the popup opens or the target segment changes.
  useEffect(() => {
    if (!open || !editor) return;
    const key = `${segmentIndex}::${initialContent}`;
    if (lastInitRef.current === key) return;
    lastInitRef.current = key;
    editor.commands.setContent(initialContent || '', { emitUpdate: false });
    requestAnimationFrame(() => editor.commands.focus('end'));
  }, [open, editor, initialContent, segmentIndex]);

  // Reset the init key on close so the next open re-applies content.
  useEffect(() => {
    if (!open) lastInitRef.current = null;
  }, [open]);

  // Capture the scrubber's screen coordinates while the popup is open so we
  // can paint a "spotlight" seekbar on top of the blurred backdrop.
  useEffect(() => {
    if (!open) {
      setSpotlight(null);
      return;
    }
    const measure = () => {
      const el = scrubberRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSpotlight({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, scrubberRef]);

  const segment = useMemo(() => {
    if (segmentIndex == null) return null;
    return transcript[segmentIndex] ?? null;
  }, [segmentIndex, transcript]);

  const handleSave = useCallback(async () => {
    const md = getMarkdown(editor);
    if (!md) {
      onClose();
      return;
    }
    try {
      setSaving(true);
      await onSave(md);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [editor, onClose, onSave]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleSave, onClose]);

  const liveText = editor?.getText() ?? '';
  const charCount = liveText.trim().length;
  const canSave = charCount > 0 && !saving;

  if (!mounted) return null;

  const overlay = (
    <AnimatePresence>
      {open && segment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-9999 flex items-center justify-center p-6"
          style={{
            background: 'rgba(6,8,13,0.45)',
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          }}
          onClick={onClose}
        >
          {/* Spotlight seekbar — punches the scrubber back through the blur with a
              yellow pulse marking exactly where the note will be anchored. */}
          {spotlight && duration > 0 && (
            <div
              className="pointer-events-none fixed z-9999"
              style={{
                left: spotlight.left,
                top: spotlight.top,
                width: spotlight.width,
                height: Math.max(spotlight.height, 4),
              }}
            >
              {/* Track */}
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full"
                style={{
                  height: 4,
                  background: 'rgba(255,255,255,0.22)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
                }}
              />
              {/* Played fill up to the anchor point */}
              <div
                className="absolute top-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: 0,
                  height: 4,
                  width: `${clamp(((segment?.start ?? 0) / duration) * 100, 0, 100)}%`,
                  background: 'color-mix(in srgb, var(--accent) 55%, transparent)',
                }}
              />
              {/* Chapter markers (muted, just for spatial context) */}
              {chapters.map((c, i) => {
                const pct = clamp((c.timeSeconds / duration) * 100, 0, 100);
                return (
                  <span
                    key={`spot-ch-${i}-${c.timeSeconds}`}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      left: `${pct}%`,
                      width: 6,
                      height: 6,
                      background: 'rgba(255,255,255,0.55)',
                      border: '1.5px solid rgba(0,0,0,0.45)',
                    }}
                  />
                );
              })}
              {/* Yellow pulse at the anchor */}
              {segment && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${clamp((segment.start / duration) * 100, 0, 100)}%`,
                    top: '50%',
                    width: 14,
                    height: 14,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span
                    className="segment-anchor-pulse-ring"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: '#facc15',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: '#facc15',
                      border: '2px solid rgba(6,8,13,0.85)',
                      boxShadow: '0 0 18px rgba(250,204,21,0.65)',
                    }}
                  />
                  {/* Anchor tooltip */}
                  <div
                    className="whitespace-nowrap rounded-md font-mono text-[10px]"
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '4px 8px',
                      background: 'rgba(17,21,28,0.95)',
                      border: '1px solid rgba(250,204,21,0.4)',
                      color: '#facc15',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Anchoring at {formatTimestamp(segment.start)}
                  </div>
                </div>
              )}
            </div>
          )}

          <motion.div
            initial={{ y: -6, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl overflow-hidden segment-note-popup"
            style={{
              width: 'min(560px, 92vw)',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 60px -16px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {/* Header — single inline row */}
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-1 rounded-md"
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  <Play size={9} fill="currentColor" />
                  {formatTimestamp(segment.start)}
                </span>
                <span className="text-[12px] truncate" style={{ color: 'var(--secondary)' }}>
                  {isExisting ? 'Editing note' : 'New note'}
                  <span className="mx-1.5 opacity-50">·</span>
                  paused
                </span>
                <span className="relative group/info inline-flex">
                  <Info
                    size={12}
                    className="cursor-help opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--secondary)' }}
                  />
                  <span
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 opacity-0 group-hover/info:opacity-100 transition-opacity duration-150 whitespace-normal rounded-md text-[11px] leading-snug z-10"
                    style={{
                      top: 'calc(100% + 8px)',
                      width: 240,
                      padding: '8px 10px',
                      background: 'rgba(17,21,28,0.96)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                      boxShadow: '0 8px 24px -8px rgba(0,0,0,0.5)',
                    }}
                  >
                    Pinned to {formatTimestamp(segment.start)}. Shows up in your notes panel and pops as an Up Next card 10s before this moment on replay.
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-[10px] px-1.5 py-1 rounded transition-colors hover:opacity-80 cursor-pointer"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--secondary)',
                }}
                title="Close (Esc)"
              >
                Esc
              </button>
            </div>

            {/* Caption — slim quote, no box */}
            <div className="px-5 pb-3">
              <div
                className="text-[12.5px] italic leading-snug pl-3 line-clamp-2"
                style={{
                  borderLeft: '2px solid color-mix(in srgb, var(--accent) 55%, transparent)',
                  color: 'var(--secondary)',
                }}
              >
                “{segment.text}”
              </div>
            </div>

            {/* Editor */}
            <div className="px-5 pb-2">
              <EditorContent editor={editor} />
            </div>

            {/* Inline formatting bar */}
            <div className="px-5 pb-3 flex items-center gap-1">
              <FmtButton
                active={!!editor?.isActive('bold')}
                onClick={() => editor?.chain().focus().toggleBold().run()}
                title="Bold (⌘B)"
              >
                <Bold size={12} />
              </FmtButton>
              <FmtButton
                active={!!editor?.isActive('italic')}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                title="Italic (⌘I)"
              >
                <Italic size={12} />
              </FmtButton>
              <FmtButton
                active={!!editor?.isActive('bulletList')}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                title="Bullet list (⌘⇧8)"
              >
                <List size={12} />
              </FmtButton>
              <FmtButton
                active={!!editor?.isActive('code')}
                onClick={() => editor?.chain().focus().toggleCode().run()}
                title="Inline code (⌘E)"
              >
                <Code size={12} />
              </FmtButton>
              <span
                className="ml-auto text-[10px] font-mono"
                style={{ color: 'var(--secondary)', opacity: 0.7 }}
              >
                Markdown rendered live
              </span>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 border-t flex items-center justify-between gap-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--secondary)' }}>
                <span className="inline-flex items-center gap-1.5">
                  <Play size={10} style={{ color: 'var(--accent)' }} />
                  Resumes on save
                </span>
                {charCount > 0 && (
                  <span className="opacity-70">
                    {charCount} char{charCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {isExisting && onDelete && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDelete();
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-md transition-colors hover:bg-background cursor-pointer"
                    style={{ color: '#ef4444' }}
                    title="Delete note"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2.5 py-1.5 text-[12px] rounded-md transition-colors hover:bg-background cursor-pointer"
                  style={{ color: 'var(--secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 text-[12px] leading-none rounded-md font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ background: 'var(--accent)', color: '#06080d' }}
                >
                  <span className="leading-none">Save note</span>
                  <span
                    className="inline-flex items-center justify-center font-mono rounded leading-none"
                    style={{
                      background: 'rgba(6,8,13,0.18)',
                      color: 'rgba(6,8,13,0.85)',
                      fontSize: 10,
                      height: 18,
                      padding: '0 6px',
                    }}
                  >
                    ⌘↵
                  </span>
                </button>
              </div>
            </div>
          </motion.div>

          <style jsx global>{`
            .segment-note-editor {
              font-size: 15px;
              line-height: 1.65;
              color: var(--foreground);
              min-height: 96px;
              max-height: 320px;
              overflow-y: auto;
              outline: none !important;
            }
            .segment-note-editor p { margin-bottom: 8px; }
            .segment-note-editor p:last-child { margin-bottom: 0; }
            .segment-note-editor strong { font-weight: 600; }
            .segment-note-editor em { font-style: italic; }
            .segment-note-editor ul {
              list-style: disc;
              padding-left: 22px;
              margin: 4px 0 8px;
            }
            .segment-note-editor ol {
              list-style: decimal;
              padding-left: 22px;
              margin: 4px 0 8px;
            }
            .segment-note-editor li { margin-bottom: 2px; }
            .segment-note-editor code {
              background: color-mix(in srgb, var(--secondary) 14%, transparent);
              color: var(--accent);
              padding: 1px 5px;
              border-radius: 4px;
              font-family: var(--font-mono), 'JetBrains Mono', ui-monospace, monospace;
              font-size: 13px;
            }
            .segment-note-editor blockquote {
              border-left: 3px solid var(--accent);
              padding-left: 10px;
              color: var(--secondary);
              margin: 6px 0;
            }
            .segment-note-editor p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              float: left;
              color: var(--secondary);
              opacity: 0.55;
              pointer-events: none;
              height: 0;
            }
            .segment-note-editor ::selection {
              background: color-mix(in srgb, var(--accent) 22%, transparent);
            }
            @keyframes segmentAnchorPulse {
              0% {
                transform: scale(1);
                opacity: 0.75;
              }
              100% {
                transform: scale(3.2);
                opacity: 0;
              }
            }
            .segment-anchor-pulse-ring {
              animation: segmentAnchorPulse 1.6s ease-out infinite;
              pointer-events: none;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}

function FmtButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="w-7 h-7 grid place-items-center rounded-md transition-colors hover:bg-background cursor-pointer"
      style={{
        color: active ? 'var(--accent)' : 'var(--secondary)',
        background: active ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}
