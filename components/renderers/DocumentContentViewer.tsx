'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { FileText, Search, Loader2 } from 'lucide-react';
import VideoSummaryButton from '@/components/VideoSummaryButton';
import type { ContentViewerProps } from './types';
import DocumentNoteComposer from './document/DocumentNoteComposer';
import type { OutlineChapter } from './document/DocumentOutline';
import type { PageSignal } from './document/DocumentRightRail';
import type { PageConfidence } from '@/lib/types/notes';

// react-pdf + pdfjs-dist are strictly browser-only. Loading them at SSR time
// triggers a "Please use the legacy build in Node.js environments" warning and
// is wasted work — no pixels get rendered on the server anyway.
const DocumentStage = dynamic(() => import('./document/DocumentStage'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 min-h-[560px] rounded-2xl bg-card-bg border border-border flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
    </div>
  ),
});

interface Segment {
  text: string;
  page?: number;
  startTime?: number;
  endTime?: number;
}

const PAGE_SEGMENT_PREFIX = 'page-';
const pageNoteId = (page: number) => `${PAGE_SEGMENT_PREFIX}${page}`;
const pageFromSegmentId = (id: string): number | null => {
  const m = /^page-(\d+)$/.exec(id);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
};

// Defense-in-depth: the PDF URL comes from Mongo (written by our upload
// pipeline) but we still refuse anything that isn't http(s). Prevents
// javascript:/data: URIs from ever reaching react-pdf or an <a href>.
function isSafeFileUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function DocumentContentViewer({
  materials,
  notes,
  onSaveNotes,
}: ContentViewerProps) {
  const sourceId = materials.video.sourceId || materials.video.videoId;
  const fileName: string | undefined = materials.sourceMeta?.fileName;
  const fileUrl: string | undefined = materials.sourceMeta?.fileUrl;
  const mimeType: string | undefined = materials.sourceMeta?.mimeType;
  const safeFileUrl = isSafeFileUrl(fileUrl) ? fileUrl : undefined;
  const isPdf =
    !!safeFileUrl &&
    (mimeType?.toLowerCase().includes('pdf') || safeFileUrl.toLowerCase().includes('.pdf'));

  const [segments, setSegments] = useState<Segment[]>([]);
  const [fullText, setFullText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingPageJump, setPendingPageJump] = useState<number | null>(null);
  const [, setActivePage] = useState<number>(1);


  // Note composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPage, setComposerPage] = useState<number | null>(null);
  const [composerQuote, setComposerQuote] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const fetchSegments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/videos/${sourceId}/segments`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setSegments(data.segments || []);
          setFullText(data.fullText || '');
          setWordCount(data.wordCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch document segments:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSegments();
    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  const pageCount = useMemo(() => {
    if (!segments.length) return 0;
    let max = 0;
    for (const s of segments) {
      if (typeof s.page === 'number' && s.page > max) max = s.page;
    }
    return max;
  }, [segments]);

  const chapters: OutlineChapter[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (materials.chapters || []) as Array<any>;
    return raw
      .filter((c) => typeof c.pageNumber === 'number' && c.pageNumber > 0)
      .map((c) => ({ title: c.topic as string, page: c.pageNumber as number }));
  }, [materials.chapters]);

  const signalsByPage = useMemo<Record<number, PageSignal>>(() => {
    const map: Record<number, PageSignal> = {};
    for (const n of notes.segmentNotes) {
      const p = pageFromSegmentId(n.segmentId);
      if (p == null) continue;
      map[p] = {
        page: p,
        content: n.content,
        confidence: n.confidence,
        updatedAt: n.updatedAt,
      };
    }
    return map;
  }, [notes.segmentNotes]);

  const handleSelectionAction = useCallback(
    (action: 'note' | 'copy', selectedText: string, pageNumber: number) => {
      if (action === 'note') {
        setComposerPage(pageNumber);
        setComposerQuote(selectedText);
        setComposerOpen(true);
      }
      // 'copy' handled inside DocumentStage.
    },
    []
  );

  const openPageNote = useCallback((page: number) => {
    setComposerPage(page);
    setComposerQuote(undefined);
    setComposerOpen(true);
  }, []);

  const existingNote = useMemo(() => {
    if (composerPage == null) return undefined;
    const id = pageNoteId(composerPage);
    return notes.segmentNotes.find((n) => n.segmentId === id);
  }, [composerPage, notes.segmentNotes]);

  const handleSaveNote = useCallback(
    async (content: string) => {
      if (composerPage == null) return;
      const id = pageNoteId(composerPage);
      const now = new Date();
      const others = notes.segmentNotes.filter((n) => n.segmentId !== id);
      const existing = notes.segmentNotes.find((n) => n.segmentId === id);
      const next = {
        generalNote: notes.generalNote,
        segmentNotes: [
          ...others,
          {
            segmentId: id,
            content,
            // Preserve any confidence signal already recorded against this page.
            confidence: existing?.confidence,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          },
        ],
      };
      await onSaveNotes(next);
    },
    [composerPage, notes.segmentNotes, notes.generalNote, onSaveNotes]
  );

  const handleDeleteNote = useCallback(async () => {
    if (composerPage == null) return;
    const id = pageNoteId(composerPage);
    const existing = notes.segmentNotes.find((n) => n.segmentId === id);
    // If the page still carries a confidence rating, keep the segment record
    // and only clear its content. Otherwise drop the record entirely.
    const keepAsConfidenceOnly = !!existing?.confidence;
    const others = notes.segmentNotes.filter((n) => n.segmentId !== id);
    const next = {
      generalNote: notes.generalNote,
      segmentNotes: keepAsConfidenceOnly
        ? [
            ...others,
            {
              segmentId: id,
              content: '',
              confidence: existing!.confidence,
              createdAt: existing!.createdAt,
              updatedAt: new Date(),
            },
          ]
        : others,
    };
    await onSaveNotes(next);
  }, [composerPage, notes.segmentNotes, notes.generalNote, onSaveNotes]);

  const handleDeletePageNote = useCallback(
    async (page: number) => {
      const id = pageNoteId(page);
      const existing = notes.segmentNotes.find((n) => n.segmentId === id);
      if (!existing) return;
      const keepAsConfidenceOnly = !!existing.confidence;
      const others = notes.segmentNotes.filter((n) => n.segmentId !== id);
      const next = {
        generalNote: notes.generalNote,
        segmentNotes: keepAsConfidenceOnly
          ? [
              ...others,
              {
                segmentId: id,
                content: '',
                confidence: existing.confidence,
                createdAt: existing.createdAt,
                updatedAt: new Date(),
              },
            ]
          : others,
      };
      await onSaveNotes(next);
    },
    [notes.segmentNotes, notes.generalNote, onSaveNotes]
  );

  const handleSetPageConfidence = useCallback(
    async (page: number, level: PageConfidence | null) => {
      const id = pageNoteId(page);
      const existing = notes.segmentNotes.find((n) => n.segmentId === id);
      const others = notes.segmentNotes.filter((n) => n.segmentId !== id);
      // Clearing confidence when there is no note content means drop the
      // segment entirely — otherwise keep the record so the note survives.
      if (level === null && !existing?.content?.trim()) {
        const next = {
          generalNote: notes.generalNote,
          segmentNotes: others,
        };
        await onSaveNotes(next);
        return;
      }
      const now = new Date();
      const nextSegment = {
        segmentId: id,
        content: existing?.content ?? '',
        confidence: level ?? undefined,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const next = {
        generalNote: notes.generalNote,
        segmentNotes: [...others, nextSegment],
      };
      await onSaveNotes(next);
    },
    [notes.segmentNotes, notes.generalNote, onSaveNotes]
  );

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading && !isPdf) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  // ─── Header + search (shared) ───────────────────────────────────────────
  const header = (
    <>
      {materials.summary && (
        <div className="shrink-0">
          <VideoSummaryButton
            summary={materials.summary}
            videoTitle={materials.video.title}
          />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">
            {materials.video.title}
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            {fileName ? `Document · ${fileName}` : 'Document'}
            {materials.video.createdAt && (
              <>
                {' '}
                &middot;{' '}
                {new Date(materials.video.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          {wordCount > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground bg-card-bg border border-border rounded-lg">
              <FileText className="w-3 h-3" />
              {wordCount.toLocaleString()} words
            </span>
          )}
          {pageCount > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <FileText className="w-3 h-3" />
              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            </span>
          )}
        </div>
      </motion.div>
    </>
  );

  // ─── PDF Experience ─────────────────────────────────────────────────────
  // The PDF stage owns its own chrome — title lives in the outline, search
  // and summary are surfaced as chrome buttons. The outer wrapper just gives
  // the stage a full-height frame to fill.
  if (isPdf && safeFileUrl) {
    return (
      <div className="flex flex-col h-[calc(100vh-160px)]">
        <DocumentStage
          fileUrl={safeFileUrl}
          title={materials.video.title}
          pageCount={pageCount}
          chapters={chapters}
          segments={segments}
          summary={materials.summary}
          signalsByPage={signalsByPage}
          pendingPageJump={pendingPageJump}
          onPageJumpHandled={() => setPendingPageJump(null)}
          onActivePageChange={setActivePage}
          onSelectionAction={handleSelectionAction}
          onRequestPageNote={openPageNote}
          onDeletePageNote={handleDeletePageNote}
          onSetPageConfidence={handleSetPageConfidence}
        />

        <DocumentNoteComposer
          open={composerOpen}
          pageNumber={composerPage}
          prefilledQuote={composerQuote}
          initialContent={existingNote?.content ?? ''}
          isExisting={!!existingNote}
          onClose={() => setComposerOpen(false)}
          onSave={handleSaveNote}
          onDelete={existingNote ? handleDeleteNote : undefined}
        />
      </div>
    );
  }

  // ─── Legacy fallback for PPTX / text-only documents ─────────────────────
  return <LegacyTextViewer
    header={header}
    segments={segments}
    fullText={fullText}
    searchQuery={searchQuery}
    setSearchQuery={setSearchQuery}
  />;
}

// ─── Legacy text viewer (PPTX, no-PDF case) ─────────────────────────────
function LegacyTextViewer({
  header,
  segments,
  fullText,
  searchQuery,
  setSearchQuery,
}: {
  header: React.ReactNode;
  segments: Segment[];
  fullText: string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  const pageGroups = useMemo(() => {
    const groups = new Map<number | 'none', Segment[]>();
    for (const seg of segments) {
      const key = seg.page ?? 'none';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(seg);
    }
    return groups;
  }, [segments]);

  const filteredIndices = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return new Set(
      segments
        .map((seg, i) => (seg.text.toLowerCase().includes(q) ? i : -1))
        .filter((i) => i !== -1)
    );
  }, [segments, searchQuery]);

  const highlightText = useCallback(
    (text: string, query: string): React.ReactNode => {
      if (!query.trim()) return text;
      const regex = new RegExp(
        `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
        'gi'
      );
      const parts = text.split(regex);
      return parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-800/60 px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          part
        )
      );
    },
    []
  );

  const hasSegments = segments.length > 0;
  const hasPages = segments.some((s) => s.page != null);

  return (
    <div className="flex flex-col gap-5">
      {header}

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
              {(filteredIndices?.size ?? 0)}{' '}
              {(filteredIndices?.size ?? 0) === 1 ? 'match' : 'matches'} found
            </p>
          )}
        </motion.div>
      )}

      {hasSegments ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-themed rounded-xl border border-border bg-card-bg"
        >
          {hasPages ? (
            Array.from(pageGroups.entries()).map(([pageKey, segs]) => {
              const globalStartIdx = segments.indexOf(segs[0]);
              const visibleSegs = segs.filter(
                (_, i) =>
                  !filteredIndices || filteredIndices.has(globalStartIdx + i)
              );
              if (filteredIndices && visibleSegs.length === 0) return null;
              return (
                <div
                  key={pageKey}
                  className="border-b border-border/50 last:border-b-0"
                >
                  {pageKey !== 'none' && (
                    <div className="sticky top-0 z-10 px-4 py-2 bg-background/95 border-b border-border/30">
                      <span className="text-xs font-medium text-blue-400">
                        Page {pageKey}
                      </span>
                    </div>
                  )}
                  <div className="px-5 py-4 space-y-3">
                    {visibleSegs.map((seg, i) => (
                      <p
                        key={i}
                        className="text-[13px] leading-relaxed text-foreground/75"
                      >
                        {searchQuery
                          ? highlightText(seg.text, searchQuery)
                          : seg.text}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-4 space-y-3">
              {segments.map((seg, i) => {
                if (filteredIndices && !filteredIndices.has(i)) return null;
                return (
                  <p
                    key={i}
                    className="text-[13px] leading-relaxed text-foreground/75"
                  >
                    {searchQuery
                      ? highlightText(seg.text, searchQuery)
                      : seg.text}
                  </p>
                );
              })}
            </div>
          )}
        </motion.div>
      ) : fullText ? (
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
          <h3 className="text-base font-semibold text-foreground mb-1">
            No content available
          </h3>
          <p className="text-sm text-muted-foreground">
            The extracted text will appear here after processing.
          </p>
        </div>
      )}
    </div>
  );
}
