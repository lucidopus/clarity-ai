'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Command, ArrowRight, Sparkles, Loader2, PlayCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  _id: string;
  videoId: string;
  title: string;
  channelName?: string;
  thumbnail?: string;
  duration?: number;
  category?: string;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
        return;
      }

      // Close on Cmd+K / Ctrl+K if open (Toggle behavior)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
         if (isOpen) {
             e.preventDefault();
             onClose();
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
        setQuery(''); // Reset on close
        setResults([]);
    }
  }, [isOpen]);

  // Debounced Search Logic
  useEffect(() => {
    if (query.trim() === '') {
        setResults([]);
        setLoading(false);
        return;
    }

    setLoading(true);

    if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.success) {
                setResults(data.results);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    }, 400); // 400ms delay

    return () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);


  if (!mounted) return null;

  const searchContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with strong blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-xl z-[100]"
          />

          {/* Search Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4 pointer-events-none"
          >
            <div className="w-full max-w-3xl bg-card-bg/90 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[60vh] ring-1 ring-black/5">
              
              {/* Header / Input Area */}
              <div className="flex items-center px-8 py-6 border-b border-border/50 gap-5 transition-colors focus-within:bg-accent/5">
                {loading ? (
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                ) : (
                    <Search className="w-6 h-6 text-muted-foreground" strokeWidth={2} />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="What do you want to learn today?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && query.trim() !== '') {
                          onClose();
                          router.push(`/dashboard/discover/search?q=${encodeURIComponent(query)}`);
                      }
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-xl font-medium text-foreground placeholder:text-muted-foreground/40 h-10"
                  autoComplete="off"
                />
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/50 text-[10px] font-mono text-muted-foreground font-medium select-none">
                        <span>ESC</span>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 -mr-2 hover:bg-muted/50 rounded-full transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
              </div>

              {/* Results Area */}
              <div className="overflow-y-auto custom-scrollbar p-3">
                 {query.trim() === '' ? (
                     <div className="py-16 flex flex-col items-center justify-center text-center opacity-60">
                         <p className="text-sm font-medium">Type to search...</p>
                     </div>
                 ) : (
                    <div className="py-2 px-1">
                        {results.length > 0 ? (
                            <div className="space-y-1">
                                <h3 className="text-xs font-bold text-muted-foreground/70 px-4 py-2 uppercase tracking-widest text-[10px]">Suggestions</h3>
                                {results.map((item) => (
                                    <button
                                        key={item._id}
                                        onClick={() => {
                                            onClose();
                                            router.push(`/generations/${item.videoId || item._id}`);
                                        }}
                                        className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl hover:bg-accent/10 hover:text-accent transition-all duration-200 group border border-transparent hover:border-accent/10 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 shrink-0 rounded-lg bg-secondary/20 overflow-hidden relative shadow-sm">
                                                {item.thumbnail ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <PlayCircle className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-base font-medium block text-foreground group-hover:text-accent truncate pr-4">{item.title}</span>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="capitalize text-accent/70 font-medium">{item.category || 'Video'}</span>
                                                    <span>•</span>
                                                    <span>{item.channelName || 'Clarity'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-accent shrink-0" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            !loading && (
                                <button 
                                    onClick={() => {
                                        onClose();
                                        router.push(`/dashboard/discover/search?q=${encodeURIComponent(query)}`);
                                    }}
                                    className="w-full py-12 text-center group cursor-pointer"
                                >
                                    <p className="text-muted-foreground text-sm group-hover:text-foreground transition-colors">
                                        <span className="font-medium text-accent">Press Enter</span> to search.
                                    </p>
                                </button>
                            )
                        )}
                    </div>
                 )}
              </div>
              
              {/* Footer */}
              <div className="bg-muted/20 border-t border-border/50 px-6 py-3 flex justify-between items-center text-xs text-muted-foreground backdrop-blur-sm">
                 <div className="flex items-center gap-4">
                     <span className="flex items-center gap-1.5">
                         <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border/50">↵</kbd>
                         <span className="font-medium">Search</span>
                     </span>
                     <span className="flex items-center gap-1.5">
                         <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border/50">ESC</kbd>
                         <span className="font-medium">Close</span>
                     </span>
                 </div>
                 <div className="flex items-center gap-2 opacity-70">
                     <span>ProTip: Describe what you want to learn, e.g. "How to build a startup".</span>
                 </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(searchContent, document.body);
}
