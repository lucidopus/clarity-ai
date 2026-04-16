'use client';

import { useMemo, useState } from 'react';
import { ListTree, Search, StickyNote, X } from 'lucide-react';

export interface OutlineChapter {
  title: string;
  /** 1-indexed page number where the chapter starts. */
  page: number;
}

import type { PageConfidence } from '@/lib/types/notes';

export interface OutlineNote {
  content: string;
  updatedAt?: Date | string;
  confidence?: PageConfidence;
}

const CONFIDENCE_DOT: Record<PageConfidence, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-emerald-500',
};

interface DocumentOutlineProps {
  title: string;
  chapters?: OutlineChapter[];
  numPages: number;
  activePage: number;
  /** Map of pageNumber -> the note anchored there (one per page, page-based segmentId). */
  notesByPage: Record<number, OutlineNote>;
  onJump: (page: number) => void;
  /** Opens the note composer for editing an existing note on a specific page. */
  onOpenNote?: (page: number) => void;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^>\s?/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function DocumentOutline({
  title,
  chapters = [],
  activePage,
  notesByPage,
  onJump,
  onOpenNote,
}: DocumentOutlineProps) {
  const [filter, setFilter] = useState('');

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.page - b.page),
    [chapters]
  );

  const filteredChapters = useMemo(() => {
    if (!filter.trim()) return sortedChapters;
    const q = filter.toLowerCase();
    return sortedChapters.filter((c) => c.title.toLowerCase().includes(q));
  }, [sortedChapters, filter]);

  const pagesWithNotes = useMemo(() => {
    return Object.keys(notesByPage)
      .map((k) => parseInt(k, 10))
      .filter(
        (p) => Number.isFinite(p) && notesByPage[p]?.content?.trim()
      )
      .sort((a, b) => a - b);
  }, [notesByPage]);

  const hasChapters = filteredChapters.length > 0;
  const hasNotes = pagesWithNotes.length > 0;

  return (
    <aside className="h-full w-[264px] flex flex-col bg-card-bg">
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2 text-foreground">
          <ListTree className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium truncate" title={title}>
            {title}
          </span>
        </div>
        {sortedChapters.length > 0 && (
          <div className="mt-3 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter outline"
              className="w-full h-8 pl-8 pr-8 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition"
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-themed px-2 py-3 space-y-4">
        {hasChapters && (
          <section>
            <h4 className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Chapters
            </h4>
            <ul className="space-y-0.5">
              {filteredChapters.map((c, idx) => {
                const isActive =
                  activePage >= c.page &&
                  (idx === filteredChapters.length - 1 ||
                    activePage < filteredChapters[idx + 1].page);
                return (
                  <li key={`${c.page}-${idx}`}>
                    <button
                      onClick={() => onJump(c.page)}
                      className={`group w-full flex items-start gap-2 px-2 py-1.5 rounded-md text-left text-xs transition cursor-pointer ${
                        isActive
                          ? 'bg-accent/12 text-foreground'
                          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
                      }`}
                    >
                      <span
                        className={`shrink-0 mt-0.5 w-9 text-[10px] tabular-nums text-left ${
                          isActive ? 'text-accent' : 'text-muted-foreground/70 group-hover:text-muted-foreground'
                        }`}
                      >
                        p.{c.page}
                      </span>
                      <span className="flex-1 line-clamp-2 leading-snug">
                        {c.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {hasNotes && (
          <section>
            <h4 className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <StickyNote className="w-3 h-3" /> Your notes
            </h4>
            <ul className="space-y-1">
              {pagesWithNotes.map((p) => {
                const note = notesByPage[p];
                const preview = stripMarkdown(note.content);
                return (
                  <li key={`note-${p}`}>
                    <button
                      onClick={() => {
                        onJump(p);
                        onOpenNote?.(p);
                      }}
                      className="w-full flex flex-col gap-1 px-2 py-2 rounded-md text-left text-xs text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition group cursor-pointer"
                      title="Click to view and edit this note"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-9 text-[10px] tabular-nums text-muted-foreground/70">
                          p.{p}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shrink-0" />
                        {note.confidence && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${CONFIDENCE_DOT[note.confidence]}`}
                            title={`Confidence: ${note.confidence}`}
                          />
                        )}
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 group-hover:text-accent transition">
                          Edit
                        </span>
                      </div>
                      <p className="pl-11 text-[11px] leading-snug text-foreground/80 line-clamp-3">
                        {preview}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!hasChapters && !hasNotes && (
          <div className="px-3 pt-6 text-xs text-muted-foreground/70 leading-relaxed">
            Chapters and notes will appear here as you study. Use the page
            input above the PDF to jump to a specific page.
          </div>
        )}
      </div>
    </aside>
  );
}
