'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Command, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  { id: '1', title: 'Introduction to React Hooks', type: 'video' },
  { id: '2', title: 'Advanced Machine Learning Concepts', type: 'video' },
  { id: '3', title: 'History of the Roman Empire', type: 'video' },
  { id: '4', title: 'Calculus I: Limits and Derivatives', type: 'video' },
  { id: '5', title: 'Effective Public Speaking', type: 'video' },
];

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
         // If not open, the parent (Layout/Navbar) handles opening via its own listener
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
    }
  }, [isOpen]);

  if (!mounted) return null;

  const filtered = query.trim() === '' 
    ? [] 
    : SUGGESTIONS.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));

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
                <Search className="w-6 h-6 text-muted-foreground" strokeWidth={2} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="What do you want to learn today?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
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
                     <div className="py-16 flex flex-col items-center justify-center text-center">
                         <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-5 shadow-inner">
                             <Sparkles className="w-8 h-8 text-accent" strokeWidth={1.5} />
                         </div>
                         <h3 className="text-lg font-semibold text-foreground mb-1">Focus Mode</h3>
                         <p className="text-sm text-muted-foreground max-w-xs">
                             Search for videos, topics, or paste a YouTube link to generate new materials immediately.
                         </p>
                     </div>
                 ) : (
                    <div className="py-2 px-1">
                        {filtered.length > 0 ? (
                            <div className="space-y-1">
                                <h3 className="text-xs font-bold text-muted-foreground/70 px-4 py-2 uppercase tracking-widest text-[10px]">Suggestions</h3>
                                {filtered.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onClose();
                                            console.log(`Navigating to ${item.id}`);
                                        }}
                                        className="w-full text-left flex items-center justify-between px-4 py-4 rounded-xl hover:bg-accent/10 hover:text-accent transition-all duration-200 group border border-transparent hover:border-accent/10 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-xs group-hover:shadow-md transition-shadow">
                                                <Search className="w-5 h-5 text-muted-foreground group-hover:text-accent" />
                                            </div>
                                            <div>
                                                <span className="text-base font-medium block text-foreground group-hover:text-accent">{item.title}</span>
                                                <span className="text-xs text-muted-foreground capitalize group-hover:text-accent/70">{item.type}</span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-accent" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-muted-foreground text-sm">No results found for <span className="text-foreground font-medium">"{query}"</span></p>
                            </div>
                        )}
                    </div>
                 )}
              </div>
              
              {/* Footer */}
              <div className="bg-muted/20 border-t border-border/50 px-6 py-3 flex justify-between items-center text-xs text-muted-foreground backdrop-blur-sm">
                 <div className="flex items-center gap-4">
                     <span className="flex items-center gap-1.5">
                         <Command className="w-3.5 h-3.5" />
                         <span className="font-medium">Navigate</span>
                     </span>
                     <span className="flex items-center gap-1.5">
                         <ArrowRight className="w-3.5 h-3.5" />
                         <span className="font-medium">Open</span>
                     </span>
                 </div>
                 <div className="flex items-center gap-2 opacity-70">
                     <span>ProTip: Try typing "Machine Learning" or "LLMs" to get started. </span>
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
