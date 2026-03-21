'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Loader2, StickyNote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import VideoSummaryButton from '@/components/VideoSummaryButton';
import NotesEditor from '@/components/NotesEditor';
import type { ContentViewerProps } from './types';

/**
 * Text Content Viewer
 *
 * Renders the "Learn" tab for text/notes sources:
 * - Clean display of user-pasted text
 * - Markdown rendering when content contains markdown
 * - Search with highlighting
 * - Summary button + notes editor
 */
export default function TextContentViewer({
  materials,
  notes,
  onSaveNotes,
}: ContentViewerProps) {
  const [fullText, setFullText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const sourceId = materials.video.sourceId || materials.video.videoId;

  // Fetch content from segments API
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/videos/${sourceId}/segments`);
        if (res.ok) {
          const data = await res.json();
          // For text sources, use fullText (segments may or may not exist)
          setFullText(data.fullText || '');
          setWordCount(data.wordCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch text content:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [sourceId]);

  // Detect if content looks like markdown
  const isMarkdown = useMemo(() => {
    if (!fullText) return false;
    // Check for common markdown patterns
    return /^#{1,6}\s|^\*\s|^-\s|^\d+\.\s|\*\*|__|\[.*\]\(.*\)|```/m.test(fullText);
  }, [fullText]);

  // Search highlighting for plain text mode
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

  // Count search matches
  const matchCount = useMemo(() => {
    if (!searchQuery.trim() || !fullText) return 0;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (fullText.match(regex) || []).length;
  }, [fullText, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

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

      {/* Text Notes Info Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <StickyNote className="w-6 h-6 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{materials.video.title}</h2>
          <p className="text-xs text-muted-foreground">
            Text Notes
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
        </div>
      </motion.div>

      {/* Search Bar */}
      {fullText && (
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
              placeholder="Search notes..."
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

      {/* Text Content */}
      {fullText ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-themed rounded-xl border border-border bg-card-bg px-6 py-5"
        >
          {isMarkdown && !searchQuery ? (
            <div className="text-sm text-foreground/85 leading-relaxed
              [&_p]:mb-3 [&_p:last-child]:mb-0
              [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:mb-3 [&_ul]:space-y-1.5
              [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:mb-3 [&_ol]:space-y-1.5
              [&_li]:leading-relaxed
              [&_strong]:font-semibold [&_strong]:text-foreground
              [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:first:mt-0
              [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3
              [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-2
              [&_blockquote]:border-l-2 [&_blockquote]:border-accent/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
              [&_code]:text-xs [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {fullText}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-[13px] leading-relaxed text-foreground/75 whitespace-pre-wrap">
              {searchQuery ? highlightText(fullText, searchQuery) : fullText}
            </div>
          )}
        </motion.div>
      ) : (
        <div className="text-center py-16">
          <StickyNote className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">No content available</h3>
          <p className="text-sm text-muted-foreground">
            The text notes will appear here after processing.
          </p>
        </div>
      )}

      {/* Notes Editor */}
      <NotesEditor
        videoId={sourceId}
        notes={notes}
        onSaveNotes={onSaveNotes}
      />
    </div>
  );
}
