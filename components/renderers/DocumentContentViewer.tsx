'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Loader2 } from 'lucide-react';
import VideoSummaryButton from '@/components/VideoSummaryButton';
import type { ContentViewerProps } from './types';

interface Segment {
  text: string;
  page?: number;
  startTime?: number;
  endTime?: number;
}

/**
 * Document Content Viewer
 *
 * Renders the "Learn" tab for document sources (PDF, PPTX):
 * - Document info header with page count, word count
 * - Searchable extracted text grouped by page
 * - Summary button
 * - Notes editor
 */
export default function DocumentContentViewer({
  materials,
}: ContentViewerProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [fullText, setFullText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const sourceId = materials.video.sourceId || materials.video.videoId;
  const fileName = materials.sourceMeta?.fileName;

  // Fetch segments from the segments API
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const res = await fetch(`/api/videos/${sourceId}/segments`);
        if (res.ok) {
          const data = await res.json();
          setSegments(data.segments || []);
          setFullText(data.fullText || '');
          setWordCount(data.wordCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch document segments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSegments();
  }, [sourceId]);

  // Group segments by page
  const pageGroups = useMemo(() => {
    const groups = new Map<number | 'none', Segment[]>();

    for (const seg of segments) {
      const key = seg.page ?? 'none';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(seg);
    }

    return groups;
  }, [segments]);

  const pageCount = useMemo(() => {
    const pages = new Set(segments.filter(s => s.page != null).map(s => s.page!));
    return pages.size;
  }, [segments]);

  // Search filtering
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return null; // null = show all
    const q = searchQuery.toLowerCase();
    return new Set(
      segments
        .map((seg, i) => (seg.text.toLowerCase().includes(q) ? i : -1))
        .filter(i => i !== -1)
    );
  }, [segments, searchQuery]);

  const highlightText = useCallback((text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800/60 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, []);

  const matchCount = filteredSegments?.size ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  // Determine display content: segments with pages, or fullText fallback
  const hasSegments = segments.length > 0;
  const hasPages = pageCount > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Button */}
      {materials.summary && (
        <div className="shrink-0">
          <VideoSummaryButton
            summary={materials.summary}
            videoTitle={materials.video.title}
          />
        </div>
      )}

      {/* Document Info Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{materials.video.title}</h2>
          <p className="text-xs text-muted-foreground">
            {fileName ? `Document · ${fileName}` : 'Document'}
            {materials.video.createdAt && (
              <> &middot; {new Date(materials.video.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}</>
            )}
          </p>
        </div>
        {/* Stats pills */}
        <div className="flex gap-2 shrink-0 items-center">
          {wordCount > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground bg-card-bg border border-border rounded-lg">
              <FileText className="w-3 h-3" />
              {wordCount.toLocaleString()} words
            </span>
          )}
          {hasPages && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <FileText className="w-3 h-3" />
              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            </span>
          )}
        </div>
      </motion.div>

      {/* Search Bar */}
      {hasSegments && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content..."
              className="w-full pl-10 pr-4 py-2.5 bg-card-bg border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 transition-all"
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'} found
            </p>
          )}
        </motion.div>
      )}

      {/* Document Content */}
      {hasSegments ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-themed rounded-xl border border-border bg-card-bg"
        >
          {hasPages ? (
            // Page-grouped display
            Array.from(pageGroups.entries()).map(([pageKey, segs]) => {
              const globalStartIdx = segments.indexOf(segs[0]);
              const visibleSegs = segs.filter((_, i) =>
                !filteredSegments || filteredSegments.has(globalStartIdx + i)
              );
              if (filteredSegments && visibleSegs.length === 0) return null;

              return (
                <div key={pageKey} className="border-b border-border/50 last:border-b-0">
                  {pageKey !== 'none' && (
                    <div className="sticky top-0 z-10 px-4 py-2 bg-background/95 border-b border-border/30">
                      <span className="text-xs font-medium text-blue-400">
                        Page {pageKey}
                      </span>
                    </div>
                  )}
                  <div className="px-5 py-4 space-y-3">
                    {visibleSegs.map((seg, i) => (
                      <p key={i} className="text-[13px] leading-relaxed text-foreground/75">
                        {searchQuery ? highlightText(seg.text, searchQuery) : seg.text}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // No pages — continuous text display
            <div className="px-5 py-4 space-y-3">
              {segments.map((seg, i) => {
                if (filteredSegments && !filteredSegments.has(i)) return null;
                return (
                  <p key={i} className="text-[13px] leading-relaxed text-foreground/75">
                    {searchQuery ? highlightText(seg.text, searchQuery) : seg.text}
                  </p>
                );
              })}
            </div>
          )}
        </motion.div>
      ) : fullText ? (
        // Fallback: render fullText as prose
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-themed rounded-xl border border-border bg-card-bg px-5 py-4"
        >
          <div className="text-[13px] leading-relaxed text-foreground/75 whitespace-pre-wrap">
            {searchQuery ? highlightText(fullText, searchQuery) : fullText}
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">No content available</h3>
          <p className="text-sm text-muted-foreground">
            The extracted text will appear here after processing.
          </p>
        </div>
      )}

    </div>
  );
}
