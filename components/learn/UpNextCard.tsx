'use client';

import { useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, X, Play } from 'lucide-react';
import type { Chapter, SegmentNote, TranscriptSegment } from './types';
import { formatTimestamp } from './utils';

interface UpNextCardProps {
  currentTime: number;
  chapters: Chapter[];
  segmentNotes: SegmentNote[];
  transcript: TranscriptSegment[];
  onSeek: (s: number) => void;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
}

interface UpNext {
  kind: 'chapter' | 'moment';
  time: number;
  label: string;
}

interface NotifCardProps {
  item: UpNext;
  cardKey: string;
  onSeek: (s: number) => void;
  onDismiss: (key: string) => void;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
}

const SURFACE_WINDOW_S = 10;

function NotifCard({
  item,
  cardKey,
  onSeek,
  onDismiss,
  onHoverEnter,
  onHoverLeave,
}: NotifCardProps) {
  const labelRef = useRef<HTMLDivElement | null>(null);
  const [isClipped, setIsClipped] = useState(false);

  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    setIsClipped(el.scrollHeight > el.clientHeight + 1);
  }, [item.label]);

  // Fire hover-enter/leave for keyboard users too, but only when focus
  // crosses the card boundary — not on internal button-to-button moves.
  const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      onHoverEnter?.();
    }
  };
  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      onHoverLeave?.();
    }
  };

  return (
    <motion.div
      layout
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.7 }}
      className="flex gap-3 items-stretch"
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{
        pointerEvents: 'auto',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '12px 14px 12px 12px',
        minWidth: 260,
        maxWidth: 320,
        boxShadow: '0 18px 48px -16px rgba(0,0,0,0.55)',
      }}
    >
      <button
        type="button"
        onClick={() => onSeek(item.time)}
        className="w-[3px] rounded-full shrink-0 cursor-pointer"
        style={{ background: item.kind === 'moment' ? '#facc15' : 'var(--accent)' }}
        title="Jump to this moment"
        aria-label="Jump to upcoming moment"
      />
      <button
        type="button"
        onClick={() => onSeek(item.time)}
        className="flex-1 min-w-0 text-left cursor-pointer"
      >
        <div
          className="font-mono uppercase tracking-widest text-[9px] font-bold flex items-center gap-1"
          style={{ color: item.kind === 'moment' ? '#facc15' : 'var(--accent)' }}
        >
          {item.kind === 'moment' ? (
            <StickyNote size={9} fill="currentColor" />
          ) : (
            <Play size={9} fill="currentColor" />
          )}
          {item.kind === 'moment' ? 'Your note' : 'Up next'}
        </div>
        <div
          ref={labelRef}
          className="font-semibold text-[14px] mt-0.5 leading-snug break-words"
          style={{
            color: 'var(--foreground)',
            display: '-webkit-box',
            WebkitLineClamp: 8,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            maskImage: isClipped
              ? 'linear-gradient(to bottom, black 82%, transparent 100%)'
              : undefined,
            WebkitMaskImage: isClipped
              ? 'linear-gradient(to bottom, black 82%, transparent 100%)'
              : undefined,
          }}
        >
          {item.label}
        </div>
        <div className="mt-1.5 font-mono text-[11px]" style={{ color: 'var(--secondary)' }}>
          {formatTimestamp(item.time)} ·{' '}
          {item.kind === 'moment' ? 'returning to your note' : 'chapter'}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onDismiss(cardKey)}
        className="self-center w-7 h-7 grid place-items-center rounded-lg hover:bg-background transition-colors cursor-pointer"
        style={{ color: 'var(--secondary)' }}
        title="Dismiss"
        aria-label="Dismiss up next card"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export default function UpNextCard({
  currentTime,
  chapters,
  segmentNotes,
  transcript,
  onSeek,
  onHoverEnter,
  onHoverLeave,
}: UpNextCardProps) {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  // All upcoming markers currently inside the 10s lead-in window, sorted ascending by time.
  // When a chapter and a moment coincide, both surface and stack.
  const surfacedList = useMemo<UpNext[]>(() => {
    const candidates: UpNext[] = [];

    chapters.forEach((c) => {
      const delta = c.timeSeconds - currentTime;
      if (delta > 0 && delta <= SURFACE_WINDOW_S) {
        candidates.push({ kind: 'chapter', time: c.timeSeconds, label: c.topic });
      }
    });

    segmentNotes.forEach((n) => {
      const m = n.segmentId.match(/segment-(\d+)/);
      if (!m) return;
      const idx = parseInt(m[1], 10);
      const seg = transcript[idx];
      if (!seg) return;
      const delta = seg.start - currentTime;
      if (delta <= 0 || delta > SURFACE_WINDOW_S) return;
      const preview =
        (n.content || '').replace(/[#*_>`-]/g, '').replace(/\s+/g, ' ').trim() || 'Note';
      candidates.push({ kind: 'moment', time: seg.start, label: preview });
    });

    return candidates
      .filter((c) => !dismissedKeys.has(`${c.kind}-${c.time}`))
      .sort((a, b) => a.time - b.time);
  }, [currentTime, chapters, segmentNotes, transcript, dismissedKeys]);

  const dismiss = (key: string) =>
    setDismissedKeys((s) => {
      const ns = new Set(s);
      ns.add(key);
      return ns;
    });

  return (
    <div
      className="absolute z-30 flex flex-col-reverse gap-2 items-end"
      style={{ right: 20, bottom: 20, pointerEvents: 'none' }}
    >
      <AnimatePresence initial={false}>
        {surfacedList.map((item) => {
          const key = `${item.kind}-${item.time}`;
          return (
            <NotifCard
              key={key}
              item={item}
              cardKey={key}
              onSeek={onSeek}
              onDismiss={dismiss}
              onHoverEnter={onHoverEnter}
              onHoverLeave={onHoverLeave}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
