'use client';

import { useMemo, useState } from 'react';
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
}

interface UpNext {
  kind: 'chapter' | 'moment';
  time: number;
  label: string;
}

const SURFACE_WINDOW_S = 10;

export default function UpNextCard({
  currentTime,
  chapters,
  segmentNotes,
  transcript,
  onSeek,
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
        (n.content || '').replace(/[#*_>`-]/g, '').trim().split('\n')[0].slice(0, 60) || 'Note';
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
            <motion.div
              key={key}
              layout
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.7 }}
              className="flex gap-3 items-stretch"
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
                  className="font-semibold text-[14px] mt-0.5 leading-tight"
                  style={{ color: 'var(--foreground)' }}
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
                onClick={() => dismiss(key)}
                className="self-center w-7 h-7 grid place-items-center rounded-lg hover:bg-background transition-colors cursor-pointer"
                style={{ color: 'var(--secondary)' }}
                title="Dismiss"
                aria-label="Dismiss up next card"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
