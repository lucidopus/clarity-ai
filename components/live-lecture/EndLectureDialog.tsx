'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, FileText, Star, MessageCircle, Loader2, Trash2 } from 'lucide-react';
import Button from '../Button';
import { useLiveLecture } from '@/lib/live-lecture/LiveLectureContext';

interface EndLectureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDiscard: () => void;
  isEnding: boolean;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function EndLectureDialog({ isOpen, onClose, onConfirm, onDiscard, isEnding }: EndLectureDialogProps) {
  const { elapsed, focusNotes, markers, questionCount } = useLiveLecture();

  // Snapshot values when dialog opens so they don't glitch
  const [snapshot, setSnapshot] = useState({ elapsed: 0, wordCount: 0, markerCount: 0, questionCount: 0 });

  useEffect(() => {
    if (isOpen) {
      const wordCount = focusNotes.trim() ? focusNotes.trim().split(/\s+/).length : 0;
      setSnapshot({
        elapsed,
        wordCount,
        markerCount: markers.length,
        questionCount,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const stats = [
    { icon: Clock, label: 'Duration', value: formatDuration(snapshot.elapsed), color: 'text-blue-400' },
    { icon: FileText, label: 'Notes', value: `${snapshot.wordCount} words`, color: 'text-emerald-400' },
    { icon: Star, label: 'Markers', value: `${snapshot.markerCount}`, color: 'text-amber-400' },
    { icon: MessageCircle, label: 'Questions', value: `${snapshot.questionCount}`, color: 'text-purple-400' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-60 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer" onClick={!isEnding ? onClose : undefined} />

          <motion.div
            className="relative w-full max-w-sm mx-4 bg-card-bg border border-border rounded-2xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Close X */}
            <button
              onClick={onClose}
              disabled={isEnding}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-foreground mb-1">End Session?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clara will generate study materials from your session.
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {stats.map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center gap-2.5 px-3 py-2.5 bg-background rounded-xl border border-border/50">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-sm font-medium text-foreground">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={onDiscard}
                disabled={isEnding}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Discard
              </button>
              <div className="flex-1" />
              <Button variant="primary" size="sm" onClick={onConfirm} disabled={isEnding}>
                {isEnding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ending...
                  </>
                ) : (
                  'End & Generate'
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
