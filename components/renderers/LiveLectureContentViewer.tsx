'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, FileText, Search, Star, MessageSquare, BookOpen, X,
  Bot, User, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ContentViewerProps } from './types';

// ── Types ──

interface Segment {
  text: string;
  startOffset: number;
  endOffset: number;
}

interface Marker {
  offsetSeconds: number;
  notePosition?: number;
  createdAt: string;
}

interface QAMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ContextDoc {
  sourceId: string;
  name: string;
}

interface NotesData {
  sessionId: string;
  focusNotes: string;
  markers: Marker[];
  segments: Segment[];
  contextDocs: ContextDoc[];
  questionCount: number;
  durationSeconds?: number;
  startedAt?: string;
}

type FilterType = 'all' | 'important' | 'qa' | 'notes';

interface TimelineEvent {
  id: string;
  type: 'marker' | 'qa' | 'note';
  offsetSeconds: number;
  // Marker
  segmentText?: string;
  // QA
  question?: string;
  answer?: string;
  // Note
  noteText?: string;
}

// ── Helpers ──

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-accent/20 text-foreground rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}

// ── Sub-Components ──

function FilterChip({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  color?: 'teal' | 'accent' | 'amber' | 'default';
  onClick: () => void;
}) {
  const colorMap = {
    teal: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    accent: 'bg-accent/10 border-accent/30 text-accent',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    default: 'bg-accent/10 border-accent/30 text-accent',
  };
  const dotMap = {
    teal: 'bg-teal-400',
    accent: 'bg-accent',
    amber: 'bg-amber-400',
    default: '',
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        border transition-all cursor-pointer
        ${active
          ? colorMap[color || 'default']
          : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
        }
      `}
    >
      {color && color !== 'default' && (
        <span className={`w-1.5 h-1.5 rounded-full ${active ? dotMap[color] : 'bg-muted-foreground/40'}`} />
      )}
      {label}
      {count !== undefined && (
        <span className={`text-[10px] ${active ? 'opacity-80' : 'opacity-50'}`}>({count})</span>
      )}
    </button>
  );
}

function EventCard({
  event,
  searchQuery,
}: {
  event: TimelineEvent;
  searchQuery: string;
}) {
  const [qaExpanded, setQaExpanded] = useState(true);

  if (event.type === 'marker') {
    return (
      <div className="bg-teal-500/[0.06] border border-teal-500/15 rounded-lg p-3 mb-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Star className="w-3 h-3 text-teal-400 fill-teal-400" />
          <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wide">
            Important &middot; {formatTime(event.offsetSeconds)}
          </span>
        </div>
        <p className="text-[13px] text-foreground/85 leading-relaxed">
          {searchQuery ? highlightMatch(event.segmentText || '', searchQuery) : event.segmentText}
        </p>
      </div>
    );
  }

  if (event.type === 'qa') {
    return (
      <div className="bg-card-bg border border-border rounded-lg overflow-hidden mb-2">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/50">
          <MessageSquare className="w-3 h-3 text-accent" />
          <span className="text-[11px] font-semibold text-accent uppercase tracking-wide">
            Q&A &middot; {formatTime(event.offsetSeconds)}
          </span>
          <button
            onClick={() => setQaExpanded(!qaExpanded)}
            className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {qaExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        <div className="flex items-start gap-2 px-3 py-2.5 border-b border-border/30">
          <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
            <User className="w-3 h-3 text-accent" />
          </div>
          <p className="text-[13px] text-foreground font-medium leading-snug">
            {searchQuery ? highlightMatch(event.question || '', searchQuery) : event.question}
          </p>
        </div>
        {qaExpanded && event.answer && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-black/[0.08]">
            <div className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3 h-3 text-teal-400" />
            </div>
            <div className="text-[13px] text-foreground/70 leading-relaxed min-w-0 flex-1 prose prose-sm max-w-none
              [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal
              [&_strong]:text-foreground/80 [&_code]:text-xs [&_code]:bg-background/50 [&_code]:px-1 [&_code]:rounded">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {event.answer}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Note
  return (
    <div className="bg-amber-500/[0.06] border border-amber-500/12 rounded-lg p-3 mb-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <FileText className="w-3 h-3 text-amber-400" />
        <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide">
          Your Note &middot; {formatTime(event.offsetSeconds)}
        </span>
      </div>
      <p className="text-[13px] text-foreground/85 leading-relaxed italic">
        {searchQuery ? highlightMatch(event.noteText || '', searchQuery) : event.noteText}
      </p>
    </div>
  );
}

// ── Main Component ──

export default function LiveLectureContentViewer({
  materials,
}: ContentViewerProps) {
  const sourceId = materials.video.sourceId || materials.video.videoId;

  // State
  const [notesData, setNotesData] = useState<NotesData | null>(null);
  const [qaMessages, setQaMessages] = useState<QAMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Fetch all data in parallel
  useEffect(() => {
    if (!sourceId) return;
    let cancelled = false;

    async function fetchAll() {
      try {
        // Fetch notes/markers/segments and resolve sessionId for Q&A in parallel
        const [notesRes, sessionRes] = await Promise.all([
          fetch(`/api/live-lecture/${sourceId}/notes`),
          fetch(`/api/live-lecture/by-source/${sourceId}`),
        ]);

        if (cancelled) return;

        let notes: NotesData | null = null;
        if (notesRes.ok) {
          notes = await notesRes.json();
          if (!cancelled) setNotesData(notes);
        }

        // Fetch Q&A history using resolved sessionId
        let actualSessionId = sourceId;
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.sessionId) actualSessionId = sessionData.sessionId;
        }

        const qaRes = await fetch(
          `/api/chatbot/history?channel=live_lecture&contextId=${actualSessionId}`
        );
        if (qaRes.ok && !cancelled) {
          const qaData = await qaRes.json();
          setQaMessages(qaData.messages || []);
        }
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [sourceId]);

  // Segments from notesData (includes startOffset/endOffset)
  const segments = useMemo(() => notesData?.segments || [], [notesData]);

  // Build timeline events
  const allEvents = useMemo(() => {
    if (!notesData) return [];

    const events: TimelineEvent[] = [];
    const lectureStart = notesData.startedAt ? new Date(notesData.startedAt).getTime() : 0;

    // Markers → events
    notesData.markers.forEach((m, i) => {
      const seg = segments.find(
        s => m.offsetSeconds >= s.startOffset && m.offsetSeconds <= s.endOffset
      );
      events.push({
        id: `marker-${i}`,
        type: 'marker',
        offsetSeconds: m.offsetSeconds,
        segmentText: seg?.text || 'Marked as important',
      });
    });

    // Q&A → events (pair user+assistant messages)
    for (let i = 0; i < qaMessages.length; i++) {
      const msg = qaMessages[i];
      if (msg.role === 'user') {
        const answer = qaMessages[i + 1]?.role === 'assistant' ? qaMessages[i + 1] : null;
        const msgTime = new Date(msg.timestamp).getTime();
        const offset = lectureStart > 0 ? Math.max(0, (msgTime - lectureStart) / 1000) : 0;
        events.push({
          id: `qa-${i}`,
          type: 'qa',
          offsetSeconds: offset,
          question: msg.content,
          answer: answer?.content,
        });
      }
    }

    // Focus notes with markers → note events
    if (notesData.focusNotes.trim()) {
      const noteLines = notesData.focusNotes.split('\n').filter(l => l.trim());
      // Create note events for lines near markers
      const markerPositions = new Set(
        notesData.markers
          .filter(m => m.notePosition !== undefined)
          .map(m => m.notePosition!)
      );

      let charPos = 0;
      noteLines.forEach((line, i) => {
        const isMarked = markerPositions.has(charPos) ||
          Array.from(markerPositions).some(pos => Math.abs(pos - charPos) < 5);

        if (isMarked) {
          const marker = notesData.markers.find(m =>
            m.notePosition !== undefined &&
            Math.abs(m.notePosition - charPos) < 5
          );
          events.push({
            id: `note-${i}`,
            type: 'note',
            offsetSeconds: marker?.offsetSeconds || 0,
            noteText: line,
          });
        }
        charPos += line.length + 1; // +1 for newline
      });

      // If no notes matched markers but notes exist, show them as a single event at the start
      if (events.filter(e => e.type === 'note').length === 0 && noteLines.length > 0) {
        events.push({
          id: 'note-all',
          type: 'note',
          offsetSeconds: 0,
          noteText: noteLines.join('\n'),
        });
      }
    }

    return events.sort((a, b) => a.offsetSeconds - b.offsetSeconds);
  }, [notesData, qaMessages, segments]);

  // Map segment index → events
  const segmentEventsMap = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    for (const event of allEvents) {
      // Find the segment containing this event's timestamp
      let segIdx = segments.findIndex(
        s => event.offsetSeconds >= s.startOffset && event.offsetSeconds <= s.endOffset
      );
      // If no exact match, find nearest
      if (segIdx < 0 && segments.length > 0) {
        let minDist = Infinity;
        segments.forEach((s, i) => {
          const dist = Math.min(
            Math.abs(event.offsetSeconds - s.startOffset),
            Math.abs(event.offsetSeconds - s.endOffset)
          );
          if (dist < minDist) { minDist = dist; segIdx = i; }
        });
      }
      if (segIdx >= 0) {
        const existing = map.get(segIdx) || [];
        existing.push(event);
        map.set(segIdx, existing);
      }
    }
    return map;
  }, [segments, allEvents]);

  // Counts for filter chips
  const markerCount = allEvents.filter(e => e.type === 'marker').length;
  const qaCount = allEvents.filter(e => e.type === 'qa').length;
  const noteCount = allEvents.filter(e => e.type === 'note').length;

  // Filtered + searched segments
  const filteredSegmentIndices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return segments.map((_, i) => i).filter(i => {
      const seg = segments[i];
      const events = segmentEventsMap.get(i) || [];

      // Filter by event type
      if (activeFilter !== 'all') {
        const typeMap: Record<FilterType, string> = {
          all: '', important: 'marker', qa: 'qa', notes: 'note',
        };
        const targetType = typeMap[activeFilter];
        const hasMatchingEvent = events.some(e => e.type === targetType);
        if (!hasMatchingEvent) return false;
      }

      // Search
      if (q) {
        const segMatch = seg.text.toLowerCase().includes(q);
        const eventMatch = events.some(e =>
          (e.segmentText?.toLowerCase().includes(q)) ||
          (e.question?.toLowerCase().includes(q)) ||
          (e.answer?.toLowerCase().includes(q)) ||
          (e.noteText?.toLowerCase().includes(q))
        );
        return segMatch || eventMatch;
      }

      return true;
    });
  }, [segments, segmentEventsMap, activeFilter, searchQuery]);

  const wordCount = useMemo(() => {
    return segments.map(s => s.text).join(' ').split(/\s+/).filter(Boolean).length;
  }, [segments]);

  const hasEvents = allEvents.length > 0;

  const setFilter = useCallback((f: FilterType) => {
    setActiveFilter(prev => prev === f ? 'all' : f);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Lecture Info Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
          <Mic className="w-6 h-6 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{materials.video.title}</h2>
          <p className="text-xs text-muted-foreground">
            Live Lecture
            {materials.video.createdAt && (
              <> &middot; {new Date(materials.video.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}</>
            )}
            {notesData?.durationSeconds && (
              <> &middot; {formatDuration(notesData.durationSeconds)}</>
            )}
          </p>
        </div>
        {/* Stats pills + Summary button */}
        <div className="flex gap-2 shrink-0 items-center">
          {materials.summary && (
            <button
              onClick={() => setSummaryExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/15 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3 h-3" />
              Summary
            </button>
          )}
          {notesData?.focusNotes.trim() && (
            <button
              onClick={() => setNotesExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/15 transition-colors cursor-pointer"
            >
              <FileText className="w-3 h-3" />
              Focus Notes
            </button>
          )}
          {wordCount > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground bg-card-bg border border-border rounded-lg">
              <FileText className="w-3 h-3" />
              {wordCount.toLocaleString()} words
            </span>
          )}
          {markerCount > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg">
              <Star className="w-3 h-3" />
              {markerCount}
            </span>
          )}
          {qaCount > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg">
              <MessageSquare className="w-3 h-3" />
              {qaCount}
            </span>
          )}
        </div>
      </motion.div>

      {/* AI Summary — modal popup (portaled to body to escape containing block) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {summaryExpanded && materials.summary && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm cursor-pointer"
                onClick={() => setSummaryExpanded(false)}
              />
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-card-bg border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4.5 h-4.5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-foreground">Lecture Summary</h2>
                        <p className="text-xs text-muted-foreground truncate">{materials.video.title}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSummaryExpanded(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/20 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto scrollbar-themed px-6 py-5 text-sm text-foreground/85 leading-relaxed
                    [&_p]:mb-3 [&_p:last-child]:mb-0
                    [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:mb-3 [&_ul]:space-y-1.5
                    [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:mb-3 [&_ol]:space-y-1.5
                    [&_li]:leading-relaxed
                    [&_strong]:font-semibold [&_strong]:text-foreground
                    [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:first:mt-0
                    [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3
                    [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-2
                    [&_blockquote]:border-l-2 [&_blockquote]:border-accent/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                    [&_code]:text-xs [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {materials.summary}
                    </ReactMarkdown>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end px-6 py-3 border-t border-border">
                    <button
                      onClick={() => setSummaryExpanded(false)}
                      className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors cursor-pointer"
                    >
                      Got it
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Focus Notes — modal popup (portaled to body to escape containing block) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {notesExpanded && notesData?.focusNotes.trim() && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm cursor-pointer"
                onClick={() => setNotesExpanded(false)}
              />
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-card-bg border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4.5 h-4.5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-foreground">Your Focus Notes</h2>
                        <p className="text-xs text-muted-foreground truncate">Notes taken during the lecture</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotesExpanded(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/20 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto scrollbar-themed px-6 py-5">
                    <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                      {notesData.focusNotes}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end px-6 py-3 border-t border-border">
                    <button
                      onClick={() => setNotesExpanded(false)}
                      className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Reference Documents */}
      {notesData?.contextDocs && notesData.contextDocs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {notesData.contextDocs.map((doc) => (
            <span
              key={doc.sourceId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-card-bg border border-border rounded-lg hover:border-accent/30 transition-colors"
            >
              <FileText className="w-3 h-3" />
              {doc.name}
            </span>
          ))}
        </div>
      )}

      {/* Filter Chips + Search */}
      {(hasEvents || segments.length > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 flex-wrap pb-3 border-b border-border"
        >
          <FilterChip label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
          {markerCount > 0 && (
            <FilterChip label="Important" count={markerCount} active={activeFilter === 'important'} color="teal" onClick={() => setFilter('important')} />
          )}
          {qaCount > 0 && (
            <FilterChip label="Q&A" count={qaCount} active={activeFilter === 'qa'} color="accent" onClick={() => setFilter('qa')} />
          )}
          {noteCount > 0 && (
            <FilterChip label="Notes" count={noteCount} active={activeFilter === 'notes'} color="amber" onClick={() => setFilter('notes')} />
          )}

          {/* Search */}
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-card-bg border border-border rounded-lg">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none w-36"
            />
          </div>
        </motion.div>
      )}

      {/* Dual-Rail Timeline */}
      {segments.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-themed rounded-xl border border-border bg-card-bg"
        >
          {filteredSegmentIndices.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No matches found for &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : (
            filteredSegmentIndices.map((segIdx) => {
              const segment = segments[segIdx];
              const events = segmentEventsMap.get(segIdx) || [];
              const hasSegEvents = events.length > 0;
              const hasMarker = events.some(e => e.type === 'marker');

              return (
                <div
                  key={segIdx}
                  className={`flex flex-col md:flex-row border-b border-border/50 last:border-b-0 transition-colors ${
                    hasMarker ? 'bg-teal-500/[0.04]' : 'hover:bg-white/[0.01]'
                  }`}
                >
                  {/* Left Rail: Transcript */}
                  <div className={`${hasEvents ? 'md:w-[55%]' : 'w-full'} flex gap-3 py-3 px-4 ${
                    hasEvents ? 'md:border-r md:border-border/40' : ''
                  }`}>
                    {segment.startOffset !== undefined && (
                      <span className={`text-[11px] font-mono w-9 shrink-0 pt-0.5 text-right select-none ${
                        hasMarker ? 'text-teal-400/70' : 'text-muted-foreground/50'
                      }`}>
                        {formatTime(segment.startOffset)}
                      </span>
                    )}
                    <p className={`text-[13px] leading-relaxed ${
                      hasMarker ? 'text-foreground/90' : 'text-foreground/55'
                    }`}>
                      {searchQuery
                        ? highlightMatch(segment.text, searchQuery)
                        : segment.text
                      }
                    </p>
                  </div>

                  {/* Right Rail: Events */}
                  {hasEvents && (
                    <div className="md:w-[45%] py-2 px-3 relative">
                      {/* Connector dot */}
                      {hasSegEvents && (
                        <div className="hidden md:block absolute left-0 top-5 w-2.5 h-[1px] bg-border/60" />
                      )}
                      {events.map((event) => (
                        <EventCard key={event.id} event={event} searchQuery={searchQuery} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </motion.div>
      ) : (
        <div className="text-center py-16">
          <Mic className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">No transcript available</h3>
          <p className="text-sm text-muted-foreground">
            The transcript will appear here after the lecture is processed.
          </p>
        </div>
      )}

    </div>
  );
}
