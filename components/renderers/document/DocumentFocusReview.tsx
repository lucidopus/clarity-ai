'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  X,
  ArrowRight,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
  PencilLine,
  Send,
} from 'lucide-react';
import type { PageConfidence } from '@/lib/types/notes';
import type { PageSignal } from './DocumentRightRail';

interface DocumentFocusReviewProps {
  open: boolean;
  docTitle: string;
  signalsByPage: Record<number, PageSignal>;
  numPages: number;
  onClose: () => void;
  onJumpToPage: (page: number) => void;
  onSetConfidence: (page: number, level: PageConfidence | null) => Promise<void> | void;
  onOpenNote: (page: number) => void;
  /** Optional: wire an Ask-Clara action. When provided, Stuck pages get a
      secondary CTA that fires a question anchored to the page. */
  onAskClara?: (page: number, pagePreview: string, userMessage: string) => void;
}

const CONFIDENCE_OPTIONS: Array<{
  value: PageConfidence;
  label: string;
  Icon: typeof Check;
  active: string;
  idle: string;
}> = [
  {
    value: 'red',
    label: 'Confused',
    Icon: AlertCircle,
    active: 'bg-red-500/15 border-red-500/60 text-red-500',
    idle: 'border-border text-muted-foreground hover:border-red-500/40 hover:text-red-500',
  },
  {
    value: 'yellow',
    label: 'Shaky',
    Icon: HelpCircle,
    active: 'bg-yellow-500/15 border-yellow-500/60 text-yellow-600 dark:text-yellow-400',
    idle: 'border-border text-muted-foreground hover:border-yellow-500/40 hover:text-yellow-500',
  },
  {
    value: 'green',
    label: 'Got it',
    Icon: Check,
    active: 'bg-emerald-500/15 border-emerald-500/60 text-emerald-600 dark:text-emerald-400',
    idle: 'border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500',
  },
];

function stripMarkdown(md: string): string {
  return md
    .replace(/^>\s?/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function DocumentFocusReview({
  open,
  docTitle,
  signalsByPage,
  numPages,
  onClose,
  onJumpToPage,
  onSetConfidence,
  onOpenNote,
  onAskClara,
}: DocumentFocusReviewProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const { redPages, yellowPages, greenCount } = useMemo(() => {
    const red: PageSignal[] = [];
    const yellow: PageSignal[] = [];
    let green = 0;
    for (const sig of Object.values(signalsByPage)) {
      if (sig.confidence === 'red') red.push(sig);
      else if (sig.confidence === 'yellow') yellow.push(sig);
      else if (sig.confidence === 'green') green += 1;
    }
    red.sort((a, b) => a.page - b.page);
    yellow.sort((a, b) => a.page - b.page);
    return { redPages: red, yellowPages: yellow, greenCount: green };
  }, [signalsByPage]);

  const weakTotal = redPages.length + yellowPages.length;
  const ratedTotal = weakTotal + greenCount;
  // Same document-level math as the rail — green=1, yellow=0.5, red/unrated=0,
  // over the *total* page count. Matches the score the user just clicked.
  const readinessPct =
    numPages > 0
      ? Math.round(((greenCount + yellowPages.length * 0.5) / numPages) * 100)
      : 0;

  // DocumentStage is loaded via next/dynamic with ssr:false, so this component
  // only ever renders on the client — safe to portal straight to document.body.
  if (typeof document === 'undefined') return null;

  const handleJump = (page: number) => {
    onJumpToPage(page);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
        >
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 cursor-default"
            aria-label="Dismiss focus review"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border border-border bg-card-bg shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 px-5 pt-4 pb-4 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/12 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">
                      Focus review
                    </h3>
                    <span className="text-[10px] text-muted-foreground/80 tabular-nums">
                      {weakTotal > 0
                        ? `${weakTotal} page${weakTotal === 1 ? '' : 's'} to revisit`
                        : 'all caught up'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {docTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Readiness mini bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-foreground/5 overflow-hidden">
                  <motion.div
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
                <span className="text-[11px] font-medium text-foreground tabular-nums shrink-0">
                  {readinessPct}% ready
                </span>
                <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0">
                  {ratedTotal}/{numPages || '—'} rated
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto scrollbar-themed px-5 py-4">
              {weakTotal === 0 ? (
                <EmptyState greenCount={greenCount} />
              ) : (
                <div className="space-y-5">
                  {redPages.length > 0 && (
                    <SeverityGroup
                      label="Stuck"
                      helper="Re-read these first — you flagged them as confused."
                      tone="red"
                      pages={redPages}
                      onJump={handleJump}
                      onSetConfidence={onSetConfidence}
                      onOpenNote={onOpenNote}
                      onAskClara={onAskClara}
                    />
                  )}
                  {yellowPages.length > 0 && (
                    <SeverityGroup
                      label="Shaky"
                      helper="Skim these once — you felt unsure."
                      tone="yellow"
                      pages={yellowPages}
                      onJump={handleJump}
                      onSetConfidence={onSetConfidence}
                      onOpenNote={onOpenNote}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-3 border-t border-border flex items-center justify-between bg-foreground/[0.02]">
              <span className="text-[10px] text-muted-foreground/70">
                100% readiness = every page marked “Got it”
              </span>
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-3 rounded-lg bg-accent text-white font-medium text-xs hover:bg-accent-hover transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function EmptyState({ greenCount }: { greenCount: number }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <Check className="w-5 h-5 text-emerald-500" />
      </div>
      <h4 className="mt-3 text-sm font-semibold text-foreground">
        Nothing flagged as shaky or stuck
      </h4>
      <p className="mt-1 text-[12px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {greenCount > 0
          ? `You've marked ${greenCount} page${greenCount === 1 ? '' : 's'} as "Got it". Keep reading and rate each page to build your focus review list.`
          : 'Rate a page Red or Shaky while you read and it will appear here so you can come back to it.'}
      </p>
    </div>
  );
}

function SeverityGroup({
  label,
  helper,
  tone,
  pages,
  onJump,
  onSetConfidence,
  onOpenNote,
  onAskClara,
}: {
  label: string;
  helper: string;
  tone: 'red' | 'yellow';
  pages: PageSignal[];
  onJump: (page: number) => void;
  onSetConfidence: (page: number, level: PageConfidence | null) => Promise<void> | void;
  onOpenNote: (page: number) => void;
  onAskClara?: (page: number, pagePreview: string, userMessage: string) => void;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              tone === 'red' ? 'bg-red-500' : 'bg-yellow-500'
            }`}
          />
          <h4 className="text-[11px] uppercase tracking-wider text-foreground font-medium">
            {label} · {pages.length}
          </h4>
        </div>
        <p className="text-[10px] text-muted-foreground/80 hidden sm:block">{helper}</p>
      </div>

      <ul className="space-y-2">
        {pages.map((sig) => (
          <FocusRow
            key={sig.page}
            signal={sig}
            tone={tone}
            onJump={onJump}
            onSetConfidence={onSetConfidence}
            onOpenNote={onOpenNote}
            onAskClara={onAskClara}
          />
        ))}
      </ul>
    </section>
  );
}

function FocusRow({
  signal,
  tone,
  onJump,
  onSetConfidence,
  onOpenNote,
  onAskClara,
}: {
  signal: PageSignal;
  tone: 'red' | 'yellow';
  onJump: (page: number) => void;
  onSetConfidence: (page: number, level: PageConfidence | null) => Promise<void> | void;
  onOpenNote: (page: number) => void;
  onAskClara?: (page: number, pagePreview: string, userMessage: string) => void;
}) {
  const preview = signal.content?.trim()
    ? stripMarkdown(signal.content)
    : null;

  const ribbon = tone === 'red' ? 'border-l-red-500' : 'border-l-yellow-500';

  // Inline Ask-Clara composer. Opens when the user hits the button; collapses
  // after send so the row goes back to its compact state.
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (composerOpen) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [composerOpen]);

  const handleAskClaraSubmit = () => {
    if (!onAskClara) return;
    onAskClara(signal.page, preview || '', composerText.trim());
    setComposerOpen(false);
    setComposerText('');
  };

  return (
    <li
      className={`rounded-xl border border-border border-l-2 ${ribbon} bg-background/60 p-3 hover:bg-background transition`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-0.5">
          <span className="inline-flex h-7 min-w-[2.25rem] px-2 items-center justify-center rounded-md bg-foreground/5 text-[11px] font-medium text-foreground tabular-nums">
            p.{signal.page}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {preview ? (
            <p className="text-[12px] leading-snug text-foreground/90 line-clamp-2">
              {preview}
            </p>
          ) : (
            <p className="text-[12px] italic text-muted-foreground/70">
              No note yet — jump in and jot down what&apos;s confusing.
            </p>
          )}

          <div className="mt-2.5 flex items-center flex-wrap gap-1.5">
            {/* Inline re-rate — same pattern as the rail */}
            {CONFIDENCE_OPTIONS.map(({ value, label, Icon, active, idle }) => {
              const isActive = signal.confidence === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onSetConfidence(signal.page, isActive ? null : value)
                  }
                  className={`h-6 px-1.5 inline-flex items-center gap-1 rounded-md border text-[10px] transition cursor-pointer ${
                    isActive ? active : idle
                  }`}
                  title={`Mark as ${label.toLowerCase()}`}
                  aria-pressed={isActive}
                >
                  <Icon className="w-3 h-3" />
                  <span className="font-medium leading-none">{label}</span>
                </button>
              );
            })}

            <div className="h-4 w-px bg-border mx-0.5" />

            <button
              type="button"
              onClick={() => onJump(signal.page)}
              className="h-6 px-2 inline-flex items-center gap-1 rounded-md text-[10px] text-foreground bg-foreground/5 hover:bg-foreground/10 transition cursor-pointer"
              title={`Jump to page ${signal.page}`}
            >
              <ArrowRight className="w-3 h-3" />
              Read page
            </button>

            <button
              type="button"
              onClick={() => onOpenNote(signal.page)}
              className="h-6 px-2 inline-flex items-center gap-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition cursor-pointer"
              title={preview ? 'Edit note' : 'Add note'}
            >
              <PencilLine className="w-3 h-3" />
              {preview ? 'Edit note' : 'Add note'}
            </button>

            {/* Clara nudge — Red pages only, and only if the caller wired it up */}
            {tone === 'red' && onAskClara && (
              <button
                type="button"
                onClick={() => setComposerOpen((v) => !v)}
                className={`h-6 px-2 inline-flex items-center gap-1 rounded-md text-[10px] transition cursor-pointer ${
                  composerOpen
                    ? 'bg-accent/15 text-accent'
                    : 'text-accent hover:bg-accent/10'
                }`}
                title="Ask Clara about this page"
                aria-expanded={composerOpen}
              >
                <Sparkles className="w-3 h-3" />
                Ask Clara
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {tone === 'red' && onAskClara && composerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, ease: [0.2, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2.5 rounded-lg border border-border bg-background p-2">
                  <textarea
                    ref={textareaRef}
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleAskClaraSubmit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setComposerOpen(false);
                      }
                    }}
                    rows={2}
                    placeholder="Anything you want to ask Clara about this page? (optional — leave blank for a general explanation)"
                    className="w-full resize-none bg-transparent text-[12px] leading-snug text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                  />
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground/70">
                      ⌘↵ send · esc cancel
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setComposerOpen(false);
                          setComposerText('');
                        }}
                        className="h-6 px-2 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAskClaraSubmit}
                        className="h-6 px-2 inline-flex items-center gap-1 rounded-md text-[10px] font-medium bg-accent text-white hover:bg-accent-hover transition cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        Ask Clara
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </li>
  );
}
