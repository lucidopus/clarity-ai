import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ListOrdered, X } from 'lucide-react';
import ChapterTimeline from './ChapterTimeline';

interface Chapter {
  id: string;
  timeSeconds: number;
  topic: string;
  description: string;
}

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(time: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
}

interface ChapterButtonProps {
  chapters: Chapter[];
  currentTime: number;
  playerRef: React.MutableRefObject<YTPlayer | null>;
  videoTitle?: string;
}

export default function ChapterButton({
  chapters,
  currentTime,
  playerRef,
  videoTitle
}: ChapterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  return (
    <>
      {/* Corner Button - Top Right (below summary button) */}
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        transition={{ duration: 0.2 }}
        onClick={() => setIsOpen(true)}
        className="fixed top-45 right-6 z-20 group cursor-pointer relative flex items-center justify-center w-10 h-10 bg-white dark:bg-card-bg border border-accent/40 dark:border-border rounded-lg shadow-lg dark:shadow-md transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-accent text-accent dark:text-secondary hover:text-accent"
        aria-label="View video chapters"
      >
        <ListOrdered className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />

        {/* Badge showing chapter count */}
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-accent text-white text-[10px] font-semibold rounded-full">
          {chapters.length}
        </span>

        {/* Tooltip on Hover */}
        <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 px-3 py-2 bg-card-bg border border-border rounded-lg text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-50">
          View Chapters
        </div>
      </motion.button>

      {/* Chapter Modal - Portaled to body */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm cursor-pointer"
                onClick={() => setIsOpen(false)}
              />

              {/* Modal Content */}
              <div
                className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
              >
                <div 
                  className="w-full h-full flex items-center justify-center" 
                  onClick={() => setIsOpen(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-card-bg border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto"
                  >
                    {/* Header */}
                    <div className="sticky top-0 flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-card-bg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <ListOrdered className="w-5 h-5 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold text-foreground truncate">
                            Chapters
                          </h2>
                          {videoTitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {videoTitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Close chapters"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content - Chapter Timeline */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 pr-4">
                      <ChapterTimeline
                        chapters={chapters}
                        currentTime={currentTime}
                        playerRef={playerRef}
                      />
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-card-bg">
                      <button
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
