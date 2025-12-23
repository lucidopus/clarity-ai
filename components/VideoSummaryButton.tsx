import { useState, useEffect } from 'react';
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

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Corner Button - Top Right */}
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        transition={{ duration: 0.2 }}
        onClick={() => setIsOpen(true)}
        className="fixed right-6 z-[60] group cursor-pointer relative flex items-center justify-center w-10 h-10 bg-white dark:bg-card-bg border border-accent/40 dark:border-border rounded-lg shadow-lg dark:shadow-md transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-accent text-accent dark:text-secondary hover:text-accent animate-pulse-subtle"
        aria-label="View video summary"
      >
        <BookOpen className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />

        {/* Tooltip on Hover */}
        <div className="absolute top-full mt-2 px-3 py-2 bg-card-bg border border-border rounded-lg text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-50">
          View Summary
        </div>
      </motion.button>

      {/* Summary Modal - Portaled to body to correctly overlay sidebar/navbar */}
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
                          <BookOpen className="w-5 h-5 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold text-foreground truncate">
                            Summary
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
                        aria-label="Close summary"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 pr-4">
                      <div className="text-foreground [&>:first-child]:mt-0">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6 text-foreground border-b border-border pb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold mb-3 mt-5 text-foreground">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-4 text-foreground">{children}</h3>,
                            p: ({ children }) => <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-sm text-muted-foreground">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-sm text-muted-foreground">{children}</ol>,
                            li: ({ children }) => <li className="pl-1">{children}</li>,
                            strong: ({ children }) => <span className="font-semibold text-foreground">{children}</span>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-accent pl-4 py-1 my-4 italic text-muted-foreground bg-accent/5 rounded-r">{children}</blockquote>,
                            code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>,
                          }}
                        >
                          {summary}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-card-bg">
                      <button
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors cursor-pointer"
                      >
                        Got it
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
