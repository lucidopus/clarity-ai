import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface VideoSummaryButtonProps {
  summary: string;
  videoTitle?: string;
}

export default function VideoSummaryButton({ summary, videoTitle }: VideoSummaryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [isOpen]);

  return (
    <>
      {/* Inline pill button — elevated secondary style, sits above the video player */}
      <motion.button
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-accent/10 text-accent hover:bg-accent/15 text-sm font-medium transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label="View video summary"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        Summary
      </motion.button>

      {/* Summary Modal - Portaled to body */}
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
                className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm cursor-pointer"
                onClick={() => setIsOpen(false)}
              />

              {/* Modal Content */}
              <div
                className="fixed inset-0 z-70 flex items-center justify-center p-4 pointer-events-none"
                role="dialog"
                aria-modal="true"
                aria-label={videoTitle ? `Summary: ${videoTitle}` : 'Video Summary'}
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
                          <BookOpen className="w-5 h-5 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold text-foreground truncate">Summary</h2>
                          {videoTitle && (
                            <p className="text-xs text-muted-foreground truncate">{videoTitle}</p>
                          )}
                        </div>
                      </div>
                      <button
                        ref={closeButtonRef}
                        onClick={() => setIsOpen(false)}
                        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label="Close summary"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                      <div className="text-foreground">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6 text-foreground border-b border-border pb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold mb-3 mt-5 text-foreground">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-4 text-foreground">{children}</h3>,
                            p: ({ children }) => <p className="text-sm text-foreground/90 mb-4 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-5 mb-4 space-y-2 text-sm text-foreground/90 marker:text-accent/70">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-5 mb-4 space-y-2 text-sm text-foreground/90 marker:text-accent/70">{children}</ol>,
                            li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                            em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-accent pl-4 py-1 my-4 italic text-muted-foreground bg-accent/5 rounded-r">{children}</blockquote>,
                            code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-accent">{children}</code>,
                          }}
                        >
                          {summary}
                        </ReactMarkdown>
                      </div>
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
