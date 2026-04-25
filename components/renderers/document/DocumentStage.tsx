'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Maximize,
  ExternalLink,
  Loader2,
  FileWarning,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Search,
  StickyNote,
  X,
} from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

import DocumentOutline, { type OutlineChapter, type OutlineNote } from './DocumentOutline';
import DocumentSelectionHud from './DocumentSelectionHud';
import DocumentRightRail, { type PageSignal } from './DocumentRightRail';
import DocumentFocusReview from './DocumentFocusReview';
import VideoSummaryButton from '@/components/VideoSummaryButton';
import type { PageConfidence } from '@/lib/types/notes';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const ZOOM_STEPS = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];

export interface DocumentStageProps {
  fileUrl: string;
  title: string;
  pageCount: number;
  chapters?: OutlineChapter[];
  /** Full-text search segments. When provided, a Search button in the chrome
      exposes in-document search with page jumps. */
  segments?: Array<{ text: string; page?: number }>;
  /** LLM-generated summary. When provided, a Summary button in the chrome
      opens the existing summary modal. */
  summary?: string;
  /** Map of pageNumber -> signals anchored there (note content + confidence). */
  signalsByPage: Record<number, PageSignal>;
  /** External request to scroll to a specific page (e.g., from search). */
  pendingPageJump?: number | null;
  onPageJumpHandled?: () => void;
  onActivePageChange?: (page: number) => void;
  onSelectionAction: (action: 'note' | 'copy', selectedText: string, pageNumber: number) => void;
  /** Opens the note composer anchored to a specific page. */
  onRequestPageNote: (pageNumber: number) => void;
  /** Deletes the note anchored to a page (but leaves any confidence signal intact). */
  onDeletePageNote: (pageNumber: number) => Promise<void> | void;
  /** Persists the confidence rating for a page. Pass null to clear. */
  onSetPageConfidence: (pageNumber: number, level: PageConfidence | null) => Promise<void> | void;
  /** Show outline sidebar as closed by default (used by narrow screens). */
  defaultOutlineOpen?: boolean;
  defaultRightRailOpen?: boolean;
}

interface PendingSelection {
  text: string;
  pageNumber: number;
  rect: { left: number; top: number; width: number; height: number };
}

export default function DocumentStage({
  fileUrl,
  title,
  pageCount: expectedPageCount,
  chapters,
  segments,
  summary,
  signalsByPage,
  pendingPageJump,
  onPageJumpHandled,
  onActivePageChange,
  onSelectionAction,
  onRequestPageNote,
  onDeletePageNote,
  onSetPageConfidence,
  defaultOutlineOpen = false,
  defaultRightRailOpen = true,
}: DocumentStageProps) {
  // Derived: keep a `notesByPage` shape for the outline (content-only).
  const notesByPage = useMemo<Record<number, OutlineNote>>(() => {
    const out: Record<number, OutlineNote> = {};
    for (const [k, sig] of Object.entries(signalsByPage)) {
      const page = parseInt(k, 10);
      if (!Number.isFinite(page)) continue;
      if (sig.content?.trim()) {
        out[page] = {
          content: sig.content,
          updatedAt: sig.updatedAt,
          confidence: sig.confidence,
        };
      }
    }
    return out;
  }, [signalsByPage]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [numPages, setNumPages] = useState<number>(expectedPageCount || 0);
  const [activePage, setActivePage] = useState<number>(1);
  // Which way the user just navigated — drives the page transition so the
  // incoming page slides from the direction they're paging toward.
  const [pageDirection, setPageDirection] = useState<1 | -1>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [zoomIdx, setZoomIdx] = useState<number>(3); // index in ZOOM_STEPS; 1.0
  const [outlineOpen, setOutlineOpen] = useState<boolean>(defaultOutlineOpen);
  const [rightRailOpen, setRightRailOpen] = useState<boolean>(defaultRightRailOpen);
  const [focusReviewOpen, setFocusReviewOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(760);
  const [selection, setSelection] = useState<PendingSelection | null>(null);
  // Aspect ratio learned from the first loaded page — used as a fallback
  // while the next page's intrinsic dimensions are still resolving, so the
  // page frame stays stable during a paging transition.
  const [docAspect, setDocAspect] = useState<number>(1.414);

  // First-visit discoverability for the highlight-to-note flow. The selection
  // HUD only appears when the user *already* selects text — they have to know
  // the gesture exists. Bump the version suffix when the copy or behavior
  // changes so prior dismissals don't suppress the new tip.
  const HIGHLIGHT_TIP_KEY = 'clarity.docHighlightTip.v1';
  const [showHighlightTip, setShowHighlightTip] = useState<boolean>(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(HIGHLIGHT_TIP_KEY) !== 'dismissed') {
        setShowHighlightTip(true);
      }
    } catch {
      // localStorage can throw in private/locked-down contexts — fall back to
      // simply not showing the tip rather than crashing.
    }
  }, []);
  const dismissHighlightTip = useCallback(() => {
    setShowHighlightTip(false);
    try {
      localStorage.setItem(HIGHLIGHT_TIP_KEY, 'dismissed');
    } catch {
      // ignore — see above
    }
  }, []);
  // Auto-graduate: the moment the user makes a selection (whether they action
  // it or not) they've discovered the gesture, so retire the tip permanently.
  useEffect(() => {
    if (selection && showHighlightTip) {
      dismissHighlightTip();
    }
  }, [selection, showHighlightTip, dismissHighlightTip]);

  const zoom = ZOOM_STEPS[zoomIdx] ?? 1;

  // Measure container to fit the page by *both* dimensions — on tall/portrait
  // pages a width-only fit leaves a lot of vertical slack; on wide/landscape
  // pages a height-only fit cuts off horizontally. Picking the smaller of the
  // two caps makes the page actually span the viewport. Aspect ratio feeds in
  // via `docAspect` (initial guess 1.414; updated when the first page loads).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      // Match the `p-4` padding on the inner wrapper so we don't compute a
      // width the page can't actually use.
      const maxByWidth = Math.max(320, w - 32);
      const maxByHeight = Math.max(320, (h - 32) / docAspect);
      // Cap for enormous monitors so we don't render a comically huge page.
      const next = Math.min(maxByWidth, maxByHeight, 1400);
      setPageWidth(Math.round(next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [docAspect]);

  // Inform the parent whenever the visible page changes, and keep the page
  // input in sync (without remounting it — just nudge the value when the
  // field isn't being edited).
  useEffect(() => {
    onActivePageChange?.(activePage);
    setPageInput(String(activePage));
  }, [activePage, onActivePageChange]);

  // External page-jump requests (e.g. from search, outline).
  useEffect(() => {
    if (!pendingPageJump) return;
    goToPage(pendingPageJump);
    onPageJumpHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPageJump]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setLoadError(null);
    },
    []
  );

  const onDocumentLoadError = useCallback((err: Error) => {
    setLoadError(err?.message || 'Failed to load PDF');
  }, []);

  // Reset scroll-within-page when the active page flips so a zoomed-in read
  // doesn't leave the user halfway down the next page.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activePage]);

  // Keyboard navigation — ↑ ↓ for prev/next, PgUp/PgDn mirror, Home/End jump
  // to first/last. ← → are intentionally NOT bound so they remain available
  // for horizontal scroll when the user zooms past the viewport. Skipped
  // while the user is typing in an input or editing a note, and while any
  // modal (Focus Review, composer) is open so their own shortcuts don't
  // collide.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        if (target.closest('[role="dialog"]')) return;
      }
      if (focusReviewOpen) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          setPageDirection(-1);
          setActivePage((p) => Math.max(1, p - 1));
          break;
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          setPageDirection(1);
          setActivePage((p) => (numPages ? Math.min(numPages, p + 1) : p));
          break;
        case 'Home':
          e.preventDefault();
          setPageDirection(-1);
          setActivePage(1);
          break;
        case 'End':
          e.preventDefault();
          setPageDirection(1);
          if (numPages) setActivePage(numPages);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [numPages, focusReviewOpen]);

  // Selection capture: when the user releases a text selection inside the
  // PDF scroll area, compute its bounding rect in stage-local coordinates
  // and the page number it originated from, then show the floating HUD.
  // Scoped to the scroll area (not the whole stage) so selections in the
  // outline, right rail, or chrome don't surface a "note this page"
  // affordance that makes no sense for those surfaces.
  useEffect(() => {
    const stage = stageRef.current;
    const scroller = scrollRef.current;
    if (!stage || !scroller) return;

    const computeSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text || text.length < 2) {
        setSelection(null);
        return;
      }
      // Only act on selections that originate from the PDF itself —
      // anything outside the scroller (right rail, outline, chrome) should
      // be ignored.
      const anchorNode = sel.anchorNode;
      if (!anchorNode || !scroller.contains(anchorNode)) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSelection(null);
        return;
      }
      const stageRect = stage.getBoundingClientRect();

      // In paged mode the only page on-screen is `activePage`, so every
      // selection lives there.
      const pageNumber = activePage;

      setSelection({
        text,
        pageNumber,
        rect: {
          left: rect.left - stageRect.left,
          top: rect.top - stageRect.top,
          width: rect.width,
          height: rect.height,
        },
      });
    };

    const onMouseUp = () => setTimeout(computeSelection, 0);
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey || e.key === 'Shift') computeSelection();
    };
    const onScrollDismiss = () => setSelection(null);

    scroller.addEventListener('mouseup', onMouseUp);
    scroller.addEventListener('keyup', onKeyUp);
    scroller.addEventListener('scroll', onScrollDismiss, { passive: true });
    return () => {
      scroller.removeEventListener('mouseup', onMouseUp);
      scroller.removeEventListener('keyup', onKeyUp);
      scroller.removeEventListener('scroll', onScrollDismiss);
    };
  }, [activePage]);

  const dismissSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleSelectionAction = useCallback(
    (action: 'note' | 'copy') => {
      if (!selection) return;
      onSelectionAction(action, selection.text, selection.pageNumber);
      if (action === 'copy') {
        // Copy to clipboard here to keep the stage self-contained
        navigator.clipboard?.writeText(selection.text).catch(() => {});
      }
      dismissSelection();
    },
    [selection, onSelectionAction, dismissSelection]
  );

  const goToPage = useCallback(
    (page: number) => {
      if (!numPages) {
        setActivePage(Math.max(1, page));
        return;
      }
      const clamped = Math.max(1, Math.min(numPages, page));
      setPageDirection((d) =>
        clamped > activePage ? 1 : clamped < activePage ? -1 : d
      );
      setActivePage(clamped);
    },
    [numPages, activePage]
  );

  const requestFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  const fileOptions = useMemo(
    () => ({
      url: fileUrl,
      withCredentials: false,
      // Silence pdfjs warnings about missing standard fonts by pointing at
      // the copy shipped with pdfjs-dist via our public static mirror.
    }),
    [fileUrl]
  );

  // Search across extracted segments — produces page matches the user can
  // jump to. Only runs when the search panel is open and has a query, so a
  // 500-page textbook doesn't needlessly churn while the user types
  // elsewhere.
  const searchResults = useMemo(() => {
    if (!searchOpen) return [] as Array<{ page: number; snippet: string }>;
    const q = searchQuery.trim().toLowerCase();
    if (!q || !segments?.length) return [];
    const seen = new Set<number>();
    const results: Array<{ page: number; snippet: string }> = [];
    for (const seg of segments) {
      if (typeof seg.page !== 'number' || seen.has(seg.page)) continue;
      const idx = seg.text.toLowerCase().indexOf(q);
      if (idx === -1) continue;
      seen.add(seg.page);
      const start = Math.max(0, idx - 40);
      const end = Math.min(seg.text.length, idx + q.length + 60);
      const snippet =
        (start > 0 ? '… ' : '') +
        seg.text.slice(start, end) +
        (end < seg.text.length ? ' …' : '');
      results.push({ page: seg.page, snippet });
      if (results.length >= 20) break;
    }
    return results;
  }, [searchOpen, searchQuery, segments]);

  const iconBtnBase =
    'h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none disabled:cursor-default';

  return (
    <div
      ref={stageRef}
      className="relative flex-1 min-h-[560px] rounded-2xl overflow-hidden flex bg-card-bg border border-border"
    >
      {/* Outline */}
      <AnimatePresence initial={false}>
        {outlineOpen && (
          <motion.div
            key="outline"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 264, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
            className="shrink-0 border-r border-border overflow-hidden"
          >
            <DocumentOutline
              title={title}
              chapters={chapters}
              numPages={numPages}
              activePage={activePage}
              notesByPage={notesByPage}
              onJump={goToPage}
              onOpenNote={onRequestPageNote}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main column: top chrome + PDF scroller */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top chrome */}
        <div className="shrink-0 h-12 px-3 flex items-center gap-1 border-b border-border bg-card-bg">
          <button
            type="button"
            onClick={() => setOutlineOpen((v) => !v)}
            className={iconBtnBase}
            title={outlineOpen ? 'Hide outline' : 'Show outline'}
          >
            {outlineOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </button>

          <div className="mx-2 h-5 w-px bg-border" />

          <button
            type="button"
            onClick={() => goToPage(activePage - 1)}
            className={iconBtnBase}
            disabled={activePage <= 1}
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = parseInt(pageInput, 10);
              if (!Number.isNaN(v)) goToPage(v);
              else setPageInput(String(activePage));
            }}
            className="flex items-center gap-1.5 text-xs text-foreground"
          >
            <input
              name="page"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => setPageInput(String(activePage))}
              className="w-11 h-7 text-center bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 tabular-nums"
              inputMode="numeric"
              aria-label="Go to page"
            />
            <span className="text-muted-foreground tabular-nums">/ {numPages || '—'}</span>
          </form>

          <button
            type="button"
            onClick={() => goToPage(activePage + 1)}
            className={iconBtnBase}
            disabled={!numPages || activePage >= numPages}
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="mx-2 h-5 w-px bg-border" />

          <button
            type="button"
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
            className={iconBtnBase}
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomIdx(3)}
            className="h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition text-xs tabular-nums cursor-pointer"
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() =>
              setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
            }
            className={iconBtnBase}
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="ml-auto flex items-center gap-1">
            {segments && segments.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchOpen((v) => {
                    const next = !v;
                    if (next) {
                      // Focus after the panel mounts.
                      requestAnimationFrame(() => searchInputRef.current?.focus());
                    } else {
                      setSearchQuery('');
                    }
                    return next;
                  });
                }}
                className={`h-8 px-2.5 flex items-center gap-1.5 rounded-lg transition text-xs cursor-pointer ${
                  searchOpen
                    ? 'bg-accent/15 text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                }`}
                title="Search document"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search</span>
              </button>
            )}
            {summary && (
              <VideoSummaryButton
                summary={summary}
                videoTitle={title}
              />
            )}
            <button
              type="button"
              onMouseDown={(e) => {
                // Prevent the stage's native selection listener from firing
                // off this click, which would otherwise try to read the
                // current window selection right as the composer mounts.
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onRequestPageNote(activePage);
              }}
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition text-xs cursor-pointer"
              title={`Add note on page ${activePage}`}
            >
              <StickyNote className="w-3.5 h-3.5 text-yellow-500" />
              <span className="hidden sm:inline">Note</span>
            </button>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition text-xs cursor-pointer"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open</span>
            </a>
            <button
              type="button"
              onClick={requestFullscreen}
              className={iconBtnBase}
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
            <div className="mx-1 h-5 w-px bg-border" />
            <button
              type="button"
              onClick={() => setRightRailOpen((v) => !v)}
              className={iconBtnBase}
              title={rightRailOpen ? 'Hide study panel' : 'Show study panel'}
            >
              {rightRailOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Inline search panel — collapses the chrome to a thin strip when
            closed so it never steals vertical space by default. */}
        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              key="search-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="shrink-0 border-b border-border bg-card-bg overflow-hidden"
            >
              <div className="px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchOpen(false);
                        setSearchQuery('');
                      }
                    }}
                    placeholder="Search across the document…"
                    className="w-full h-8 pl-9 pr-9 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-foreground/5 transition cursor-pointer"
                    aria-label="Close search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {searchQuery.trim() && (
                  <div className="mt-2 max-h-64 overflow-y-auto scrollbar-themed rounded-lg border border-border bg-background">
                    {searchResults.length === 0 ? (
                      <div className="px-3 py-2.5 text-xs text-muted-foreground">
                        No matches found in the extracted text.
                      </div>
                    ) : (
                      <ul className="py-1">
                        {searchResults.map((r) => (
                          <li key={r.page}>
                            <button
                              type="button"
                              onClick={() => {
                                goToPage(r.page);
                                setSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-foreground/5 transition flex items-start gap-3 cursor-pointer"
                            >
                              <span className="shrink-0 mt-0.5 w-10 text-[10px] tabular-nums text-accent font-medium">
                                p.{r.page}
                              </span>
                              <span className="flex-1 text-[12px] text-foreground/80 line-clamp-2 leading-snug">
                                {r.snippet}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF scroll area — subtle neutral surface so the white pages pop */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-auto scrollbar-themed bg-background/60"
        >
          {loadError ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
              <FileWarning className="w-8 h-8 text-muted-foreground/70" />
              <p className="text-sm text-foreground font-medium">
                Couldn&apos;t render this PDF
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {loadError}. You can still open it in a new tab.
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:underline cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open file
              </a>
            </div>
          ) : (
            // Paged mode: render only the active page. react-pdf keeps the
            // Document instance mounted so swapping pageNumber is cheap.
            // `flex` + `m-auto` centers the page in both axes when it fits
            // the viewport, and collapses the auto-margins to 0 when the
            // user zooms past the container — which avoids the classic
            // flex `justify-center` trap of clipping overflow past the
            // scroll edge.
            <div className="min-h-full flex">
              <div className="m-auto w-fit p-4">
                <Document
                  file={fileOptions}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="h-[560px] flex items-center justify-center text-muted-foreground text-sm">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading document…
                    </div>
                  }
                  error={
                    <div className="h-[560px] flex items-center justify-center text-foreground text-sm">
                      Couldn&apos;t open this file.
                    </div>
                  }
                >
                  {numPages > 0 && (
                    // key={activePage} remounts the frame on page change so
                    // intrinsicAspect resets without a setState-in-effect
                    // dance — the docAspect fallback covers the moment
                    // between mount and the new page's onLoadSuccess.
                    // AnimatePresence mode="wait" slides the old page out
                    // before the new one slides in, keyed to the paging
                    // direction so the motion matches the user's intent
                    // (down-arrow → new page enters from below).
                    <AnimatePresence mode="wait" initial={false} custom={pageDirection}>
                      <motion.div
                        key={activePage}
                        custom={pageDirection}
                        variants={{
                          enter: (d: number) => ({ opacity: 0, y: d > 0 ? 18 : -18 }),
                          center: { opacity: 1, y: 0 },
                          exit: (d: number) => ({ opacity: 0, y: d > 0 ? -14 : 14 }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.18, ease: [0.2, 0, 0.2, 1] }}
                      >
                        <PageFrame
                          pageNumber={activePage}
                          zoomedWidth={pageWidth * zoom}
                          hasNote={!!signalsByPage[activePage]?.content?.trim()}
                          confidence={signalsByPage[activePage]?.confidence}
                          defaultAspect={docAspect}
                          onAspect={setDocAspect}
                        />
                      </motion.div>
                    </AnimatePresence>
                  )}
                </Document>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right rail: study panel */}
      <AnimatePresence initial={false}>
        {rightRailOpen && (
          <motion.div
            key="right-rail"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 296, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
            className="shrink-0 border-l border-border overflow-hidden"
          >
            <DocumentRightRail
              activePage={activePage}
              numPages={numPages}
              signalsByPage={signalsByPage}
              onSetConfidence={onSetPageConfidence}
              onOpenNote={onRequestPageNote}
              onDeleteNote={(p) => onDeletePageNote(p)}
              onJumpToPage={goToPage}
              onStartFocusReview={() => setFocusReviewOpen(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection HUD */}
      <AnimatePresence>
        {selection && (
          <DocumentSelectionHud
            rect={selection.rect}
            onAction={handleSelectionAction}
            onDismiss={dismissSelection}
          />
        )}
      </AnimatePresence>

      {/* Highlight-to-note coachmark — first-visit only. The selection HUD
          is the destination; this teaches the gesture that triggers it.
          Suppressed while the inline search panel is open so the two top-anchored
          surfaces don't visually stack. */}
      <AnimatePresence>
        {showHighlightTip && !selection && !searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="absolute left-1/2 -translate-x-1/2 z-30 hidden lg:flex items-center gap-2 rounded-full text-[11.5px]"
            style={{
              // 48px chrome + 14px gap so the tip floats just below the toolbar,
              // over the actual PDF surface where the highlight gesture applies
              // (not on top of the Search/Note/Open buttons in the chrome row).
              top: 62,
              background: 'rgba(17,21,28,0.80)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.92)',
              padding: '6px 6px 6px 12px',
              boxShadow: '0 6px 24px -8px rgba(0,0,0,0.5)',
            }}
            role="status"
            aria-live="polite"
          >
            <StickyNote size={12} style={{ color: '#facc15' }} />
            <span>Highlight any text to add a quoted note</span>
            <button
              type="button"
              onClick={dismissHighlightTip}
              aria-label="Dismiss tip"
              title="Dismiss"
              className="grid place-items-center rounded-full cursor-pointer transition-colors hover:bg-white/10"
              style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.7)' }}
            >
              <X size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus review — active-recall loop for weak pages */}
      <DocumentFocusReview
        open={focusReviewOpen}
        docTitle={title}
        signalsByPage={signalsByPage}
        numPages={numPages}
        onClose={() => setFocusReviewOpen(false)}
        onJumpToPage={goToPage}
        onSetConfidence={onSetPageConfidence}
        onOpenNote={onRequestPageNote}
        onAskClara={(page, preview, userMessage) => {
          // Build a general context frame for Clara: what document, which page,
          // the user's own note if any, and then the user's free-form ask. If
          // the user didn't type anything, we fall back to a neutral open-ended
          // request so Clara still has something concrete to answer.
          const contextLines: string[] = [
            `I'm studying the document "${title}" and I'd like help with page ${page}, which I've marked as confusing.`,
          ];
          if (preview) {
            contextLines.push(`Note I've jotted on this page: "${preview}"`);
          }

          const ask = userMessage.trim()
            ? `My question: ${userMessage.trim()}`
            : 'I haven\'t pinned down exactly what\'s tripping me up — walk me through this page in a way that would help me get unstuck.';

          const closing =
            'Please ground your answer in what\'s actually on this page (pull from the source if you need to), and feel free to reference nearby pages when that adds useful context.';

          const question = [...contextLines, '', ask, '', closing].join('\n');
          window.dispatchEvent(
            new CustomEvent('chatbot:open', { detail: { question } })
          );
          setFocusReviewOpen(false);
        }}
      />
    </div>
  );
}

const CONFIDENCE_RIBBON: Record<PageConfidence, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-emerald-500',
};

// The page frame keeps the visible box at the zoomed aspect ratio while
// react-pdf rasterises, so swapping pageNumber doesn't cause the layout to
// jump between pages of different shapes.
function PageFrame({
  pageNumber,
  zoomedWidth,
  hasNote,
  confidence,
  defaultAspect,
  onAspect,
}: {
  pageNumber: number;
  zoomedWidth: number;
  hasNote: boolean;
  confidence?: PageConfidence;
  defaultAspect: number;
  onAspect?: (aspect: number) => void;
}) {
  const [intrinsicAspect, setIntrinsicAspect] = useState<number | null>(null);

  const aspect = intrinsicAspect ?? defaultAspect;
  const height = zoomedWidth * aspect;

  return (
    <div
      data-page={pageNumber}
      className="relative flex flex-col items-center"
      style={{ width: zoomedWidth }}
    >
      <div
        className="relative rounded-md shadow-2xl shadow-black/40 bg-white overflow-hidden w-full"
        style={{ minHeight: height }}
      >
        {/* Confidence ribbon — thin vertical stripe on the left edge of the page */}
        {confidence && (
          <span
            className={`pointer-events-none absolute left-0 top-0 bottom-0 w-1 z-10 ${CONFIDENCE_RIBBON[confidence]}`}
            title={`Confidence: ${confidence}`}
            aria-hidden
          />
        )}
        <Page
          pageNumber={pageNumber}
          width={zoomedWidth}
          renderAnnotationLayer={false}
          renderTextLayer
          onLoadSuccess={(page) => {
            if (page?.height && page?.width) {
              const a = page.height / page.width;
              setIntrinsicAspect(a);
              onAspect?.(a);
            }
          }}
          loading={
            <div
              className="flex items-center justify-center text-neutral-400 text-xs"
              style={{ height }}
            >
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              Page {pageNumber}
            </div>
          }
        />

        {/* Note marker — subtle pill showing a note exists on this page. */}
        {hasNote && (
          <span
            className="pointer-events-none absolute top-2 right-3 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-yellow-500/90 text-white shadow-sm"
            title="You have a note on this page"
          >
            <StickyNote className="w-3 h-3" />
          </span>
        )}

        <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] px-1.5 py-0.5 rounded-md bg-black/60 text-white/80 tabular-nums">
          {pageNumber}
        </span>
      </div>
    </div>
  );
}
