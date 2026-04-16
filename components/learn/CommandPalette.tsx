'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Bookmark,
  Plus,
  PanelRightClose,
  Keyboard,
  Search as SearchIcon,
  Clapperboard,
} from 'lucide-react';
import type { Chapter, SegmentNote, TranscriptSegment } from './types';
import { formatTimestamp } from './utils';

interface Action {
  id: string;
  label: string;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  transcript: TranscriptSegment[];
  chapters: Chapter[];
  segmentNotes: SegmentNote[];
  currentTime: number;
  onSeek: (s: number) => void;
  actions: Action[];
}

interface PaletteItem {
  section: string;
  icon: React.ReactNode;
  label: string;
  meta?: string;
  hint?: string;
  onSelect: () => void;
  key: string;
}

export default function CommandPalette({
  open,
  onClose,
  transcript,
  chapters,
  segmentNotes,
  currentTime,
  onSeek,
  actions,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevQuery, setPrevQuery] = useState(query);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  // Reset state on open transition (React-recommended render-phase pattern)
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setPrevQuery('');
    }
  }
  // Reset active index when query changes
  if (prevQuery !== query) {
    setPrevQuery(query);
    setActiveIdx(0);
  }

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items: PaletteItem[] = useMemo(() => {
    const out: PaletteItem[] = [];

    // Moments
    segmentNotes.forEach((n) => {
      const m = n.segmentId.match(/segment-(\d+)/);
      if (!m) return;
      const idx = parseInt(m[1], 10);
      const seg = transcript[idx];
      if (!seg) return;
      const preview =
        (n.content || '').replace(/[#*_>`-]/g, '').trim().split('\n')[0].slice(0, 70) || 'Note';
      out.push({
        section: 'Moments · your notes',
        icon: <Sparkles size={14} style={{ color: 'var(--accent)' }} />,
        label: preview,
        meta: formatTimestamp(seg.start),
        onSelect: () => {
          onSeek(seg.start);
          onClose();
        },
        key: `moment-${n.segmentId}`,
      });
    });

    // Actions
    actions.forEach((a) => {
      out.push({
        section: 'Actions',
        icon:
          a.id === 'add-segment-note' ? (
            <Plus size={14} />
          ) : a.id === 'toggle-notes' ? (
            <PanelRightClose size={14} />
          ) : a.id === 'toggle-mode' ? (
            <Clapperboard size={14} />
          ) : (
            <Keyboard size={14} />
          ),
        label: a.label,
        hint: a.shortcut,
        onSelect: () => {
          a.run();
          onClose();
        },
        key: `action-${a.id}`,
      });
    });

    // Chapters
    chapters.forEach((c) => {
      out.push({
        section: 'Chapters',
        icon: <Bookmark size={14} />,
        label: c.topic,
        meta: formatTimestamp(c.timeSeconds),
        onSelect: () => {
          onSeek(c.timeSeconds);
          onClose();
        },
        key: `chapter-${c.id}`,
      });
    });

    // Transcript matches (only when querying)
    transcript.forEach((seg, i) => {
      out.push({
        section: 'Transcript',
        icon: <SearchIcon size={14} />,
        label: seg.text,
        meta: formatTimestamp(seg.start),
        onSelect: () => {
          onSeek(seg.start);
          onClose();
        },
        key: `seg-${i}`,
      });
    });

    return out;
  }, [segmentNotes, chapters, transcript, actions, onSeek, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Without query, hide raw transcript dump
      return items.filter((i) => i.section !== 'Transcript');
    }
    return items.filter((i) => i.label.toLowerCase().includes(q) || (i.meta || '').toLowerCase().includes(q));
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    filtered.forEach((it) => {
      const arr = map.get(it.section) || [];
      arr.push(it);
      map.set(it.section, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const flatList = filtered;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(flatList.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = flatList[activeIdx];
        if (it) it.onSelect();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flatList, activeIdx]);

  let runningIdx = -1;

  if (!mounted) return null;

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-9999 flex items-start justify-center"
          style={{
            background: 'rgba(6,8,13,0.45)',
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            paddingTop: '14vh',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -8, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl overflow-hidden"
            style={{
              width: 'min(560px, 92vw)',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <SearchIcon size={16} style={{ color: 'var(--secondary)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Run an action or jump to a moment, chapter, or note…"
                className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 appearance-none py-4 text-[15px]"
                style={{ color: 'var(--foreground)', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
              />
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--secondary)',
                }}
              >
                Esc
              </span>
            </div>

            <div className="p-2 max-h-[360px] overflow-y-auto">
              {flatList.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--secondary)' }}>
                  No matches for &ldquo;{query}&rdquo;
                </div>
              ) : (
                grouped.map(([section, items]) => (
                  <div key={section}>
                    <div
                      className="font-mono uppercase tracking-widest px-3 pt-2 pb-1 text-[10px] font-bold"
                      style={{ color: 'var(--secondary)' }}
                    >
                      {section}
                    </div>
                    {items.map((it) => {
                      runningIdx += 1;
                      const isActive = runningIdx === activeIdx;
                      return (
                        <button
                          key={it.key}
                          type="button"
                          onMouseEnter={() => setActiveIdx(items.indexOf(it) === -1 ? activeIdx : flatList.indexOf(it))}
                          onClick={it.onSelect}
                          className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-[13px]"
                          style={{
                            background: isActive ? 'var(--background)' : 'transparent',
                            color: 'var(--foreground)',
                          }}
                        >
                          <span className="shrink-0">{it.icon}</span>
                          <span className="flex-1 truncate">{it.label}</span>
                          {it.meta && (
                            <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--secondary)' }}>
                              {it.meta}
                            </span>
                          )}
                          {it.hint && (
                            <span
                              className="font-mono text-[10px] shrink-0 px-1.5 py-0.5 rounded"
                              style={{
                                background: 'var(--background)',
                                border: '1px solid var(--border)',
                                color: 'var(--secondary)',
                              }}
                            >
                              {it.hint}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div
              className="px-4 py-2 border-t flex items-center justify-between text-[11px] font-mono"
              style={{ borderColor: 'var(--border)', color: 'var(--secondary)' }}
            >
              <span>
                Now playing · {formatTimestamp(currentTime)}
              </span>
              <span className="flex items-center gap-2">
                <Kbd>↑↓</Kbd>navigate <Kbd>↵</Kbd>open
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono inline-flex items-center px-1.5 py-0.5 rounded"
      style={{
        background: 'var(--background)',
        border: '1px solid var(--border)',
        color: 'var(--secondary)',
        fontSize: 10,
      }}
    >
      {children}
    </span>
  );
}
