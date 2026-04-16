'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  StickyNote,
  Sparkles,
  ArrowRight,
  Target,
  Trash2,
  Check,
  AlertCircle,
  HelpCircle,
  PencilLine,
} from 'lucide-react';
import type { PageConfidence } from '@/lib/types/notes';

export interface PageSignal {
  /** 1-indexed page. */
  page: number;
  content?: string;
  confidence?: PageConfidence;
  updatedAt?: Date | string;
}

interface DocumentRightRailProps {
  activePage: number;
  numPages: number;
  /** Keyed by page number. */
  signalsByPage: Record<number, PageSignal>;
  /** Current-page note content + confidence. Convenience accessor. */
  onSetConfidence: (page: number, level: PageConfidence | null) => void;
  onOpenNote: (page: number) => void;
  onDeleteNote: (page: number) => void;
  onJumpToPage: (page: number) => void;
  /** Opens the full-screen focus review sheet with all weak pages. */
  onStartFocusReview: () => void;
}

const CONFIDENCE_OPTIONS: Array<{
  value: PageConfidence;
  label: string;
  description: string;
  Icon: typeof Check;
  activeClass: string;
  idleClass: string;
  dot: string;
}> = [
  {
    value: 'red',
    label: 'Confused',
    description: 'Re-read soon',
    Icon: AlertCircle,
    activeClass: 'bg-red-500/15 border-red-500/60 text-red-500',
    idleClass: 'border-border text-muted-foreground hover:border-red-500/40 hover:text-red-500',
    dot: 'bg-red-500',
  },
  {
    value: 'yellow',
    label: 'Shaky',
    description: 'Needs review',
    Icon: HelpCircle,
    activeClass: 'bg-yellow-500/15 border-yellow-500/60 text-yellow-600 dark:text-yellow-400',
    idleClass: 'border-border text-muted-foreground hover:border-yellow-500/40 hover:text-yellow-500',
    dot: 'bg-yellow-500',
  },
  {
    value: 'green',
    label: 'Got it',
    description: 'Schedule review',
    Icon: Check,
    activeClass: 'bg-emerald-500/15 border-emerald-500/60 text-emerald-600 dark:text-emerald-400',
    idleClass: 'border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500',
    dot: 'bg-emerald-500',
  },
];

function stripMarkdown(md: string): string {
  return md
    .replace(/^>\s?/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function DocumentRightRail({
  activePage,
  numPages,
  signalsByPage,
  onSetConfidence,
  onOpenNote,
  onDeleteNote,
  onJumpToPage,
  onStartFocusReview,
}: DocumentRightRailProps) {
  const active = signalsByPage[activePage];
  const note = active?.content?.trim() ? active : undefined;
  const activeConfidence = active?.confidence;

  // Document-level readiness: 100% only when *every* page is marked "Got it".
  // Unrated and Stuck pages contribute 0, Shaky contributes 0.5, Got-it
  // contributes 1 — divided by the total page count, not just rated pages.
  // This makes the score stable as the user scrolls (it's a snapshot of the
  // whole document) and truthful (rating one page 100% no longer implies
  // mastery of the other 50).
  const readiness = useMemo(() => {
    const entries = Object.values(signalsByPage);
    let red = 0;
    let yellow = 0;
    let green = 0;
    const redPages: number[] = [];
    const yellowPages: number[] = [];
    for (const s of entries) {
      if (s.confidence === 'red') {
        red += 1;
        if (typeof s.page === 'number') redPages.push(s.page);
      } else if (s.confidence === 'yellow') {
        yellow += 1;
        if (typeof s.page === 'number') yellowPages.push(s.page);
      } else if (s.confidence === 'green') {
        green += 1;
      }
    }
    const rated = red + yellow + green;
    const score =
      numPages > 0 ? (green + yellow * 0.5) / numPages : 0;
    redPages.sort((a, b) => a - b);
    yellowPages.sort((a, b) => a - b);
    return {
      red,
      yellow,
      green,
      rated,
      score,
      weakPages: [...redPages, ...yellowPages],
    };
  }, [signalsByPage, numPages]);

  const readinessPct = Math.round(readiness.score * 100);

  // Find the next weak page after the active one for the "jump" CTA.
  const nextWeak = useMemo(() => {
    const ahead = readiness.weakPages.find((p) => p > activePage);
    return ahead ?? readiness.weakPages[0];
  }, [readiness.weakPages, activePage]);

  const preview = note ? stripMarkdown(note.content!) : '';

  return (
    <aside className="h-full w-[296px] flex flex-col bg-card-bg">
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-foreground">Study panel</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-themed px-4 py-4 space-y-5">
        {/* This page — primary task (user control) */}
        <section>
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              This page
            </span>
            <span className="text-[10px] font-medium text-foreground tabular-nums inline-block min-w-[2.5rem] text-right">
              p.{activePage}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground mb-2">
            How well did you get this page?
          </p>

          <div className="grid grid-cols-3 gap-1.5">
            {CONFIDENCE_OPTIONS.map(({ value, label, description, Icon, activeClass, idleClass }) => {
              const isActive = activeConfidence === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onSetConfidence(activePage, isActive ? null : value)
                  }
                  className={`group flex flex-col items-center gap-1 py-2 px-1.5 rounded-lg border text-[11px] transition cursor-pointer ${
                    isActive ? activeClass : idleClass
                  }`}
                  title={description}
                  aria-pressed={isActive}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="font-medium leading-none">{label}</span>
                </button>
              );
            })}
          </div>

          {activeConfidence && (
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground/80">
                Saved · feeds readiness
              </span>
              <button
                type="button"
                onClick={() => onSetConfidence(activePage, null)}
                className="text-muted-foreground/70 hover:text-foreground underline-offset-2 hover:underline transition cursor-pointer"
              >
                Clear rating
              </button>
            </div>
          )}
        </section>

        {/* Note — paired with confidence as page-level capture. The note
            preview is the hero; edit/delete are quiet icon affordances that
            only announce themselves on hover. Clicking anywhere on the card
            opens the editor. */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <StickyNote className="w-3 h-3" /> Your note
            </span>
          </div>

          {note ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onOpenNote(activePage)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenNote(activePage);
                }
              }}
              className="group relative rounded-xl border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 p-3 pr-10 hover:bg-yellow-100/80 dark:hover:bg-yellow-500/15 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              title="Click to edit note"
            >
              <p className="text-[12px] leading-snug text-foreground/90 line-clamp-[8] whitespace-pre-wrap">
                {preview}
              </p>
              <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <span
                  aria-hidden
                  className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground"
                  title="Edit note"
                >
                  <PencilLine className="w-3 h-3" />
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(activePage);
                  }}
                  className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                  title="Delete note"
                  aria-label="Delete note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenNote(activePage)}
              className="w-full rounded-xl border border-dashed border-border hover:border-accent/40 hover:text-foreground text-muted-foreground px-3 py-4 text-[12px] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5" />
              Add note on this page
            </button>
          )}
        </section>

        {/* Readiness — document-level scoreboard. Doesn't change as the user
            scrolls; only shifts when they rate or re-rate a page. */}
        <section className="rounded-xl border border-border bg-background/60 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Document readiness
            </span>
            <span className="text-[10px] text-muted-foreground/80 tabular-nums">
              {readiness.rated}/{numPages || '—'} rated
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground tabular-nums">
              {readinessPct}%
            </span>
            <span className="text-xs text-muted-foreground">
              {readiness.rated === 0
                ? 'rate pages to start'
                : readinessPct >= 90
                  ? 'mastered'
                  : readinessPct >= 60
                    ? 'on track'
                    : readinessPct >= 30
                      ? 'getting there'
                      : 'needs work'}
            </span>
          </div>

          <div className="mt-2.5 h-1.5 w-full rounded-full bg-foreground/5 overflow-hidden">
            <motion.div
              layout
              initial={false}
              animate={{ width: `${readinessPct}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              className={`h-full rounded-full ${
                readinessPct >= 75
                  ? 'bg-emerald-500'
                  : readinessPct >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="tabular-nums">{readiness.green} got</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              <span className="tabular-nums">{readiness.yellow} shaky</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="tabular-nums">{readiness.red} stuck</span>
            </div>
          </div>

          {readiness.weakPages.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              <button
                type="button"
                onClick={onStartFocusReview}
                className="w-full group flex items-center justify-between gap-2 text-xs rounded-lg bg-accent text-white hover:bg-accent-hover transition px-2.5 py-2 font-medium cursor-pointer shadow-sm shadow-accent/20"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  Focus on {readiness.weakPages.length} weak page
                  {readiness.weakPages.length === 1 ? '' : 's'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
              {nextWeak != null && (
                <button
                  type="button"
                  onClick={() => onJumpToPage(nextWeak)}
                  className="w-full text-[10px] text-muted-foreground/80 hover:text-foreground transition cursor-pointer text-left"
                >
                  or jump to the next one · p.{nextWeak}
                </button>
              )}
            </div>
          ) : readiness.rated > 0 ? (
            <p className="mt-3 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Nothing flagged — you&apos;re caught up.
            </p>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
