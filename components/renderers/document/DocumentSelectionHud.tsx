'use client';

import { motion } from 'framer-motion';
import { Copy, StickyNote } from 'lucide-react';

interface DocumentSelectionHudProps {
  /** Rect of the selection in stage-local coordinates. */
  rect: { left: number; top: number; width: number; height: number };
  onAction: (action: 'note' | 'copy') => void;
  onDismiss: () => void;
}

export default function DocumentSelectionHud({
  rect,
  onAction,
}: DocumentSelectionHudProps) {
  // Place the HUD just above the selection. If the selection sits too close
  // to the top of the stage, flip it below so it stays in view.
  const preferAbove = rect.top > 48;
  const top = preferAbove ? rect.top - 44 : rect.top + rect.height + 8;
  const left = Math.max(8, rect.left + rect.width / 2 - 90);

  return (
    <motion.div
      initial={{ opacity: 0, y: preferAbove ? 6 : -6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: preferAbove ? 6 : -6, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className="absolute z-30 pointer-events-auto"
      style={{ top, left }}
    >
      <div className="flex items-center gap-0.5 p-1 rounded-xl bg-card-bg border border-border shadow-xl shadow-black/10 dark:shadow-black/40">
        <button
          onClick={() => onAction('note')}
          className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-foreground hover:bg-foreground/5 transition text-xs cursor-pointer"
          title="Save as a note on this page"
        >
          <StickyNote className="w-3.5 h-3.5 text-yellow-500" />
          <span>Add Note</span>
        </button>
        <div className="h-5 w-px bg-border mx-0.5" />
        <button
          onClick={() => onAction('copy')}
          className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition text-xs cursor-pointer"
          title="Copy to clipboard"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </button>
      </div>
    </motion.div>
  );
}
