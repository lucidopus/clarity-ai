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
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!isOpen) {
             // We need to trigger open from parent if strictly controlled, 
             // but here we just handle Esc. Parent handles Cmd+K usually.
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] transition-all duration-300"
          />

          {/* Search Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4 pointer-events-none"
          >
            <div className="w-full max-w-2xl bg-card-bg border border-border rounded-xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[60vh]">
              
              {/* Search Bar */}
              <div className="flex items-center px-4 py-4 border-b border-border gap-3">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search for topics, videos, concepts..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-lg text-foreground placeholder:text-muted-foreground/50 h-8"
                />
                <div className="flex items-center gap-2">
                    <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">ESC</span>
                    </kbd>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
              </div>

              {/* Results Area */}
              <div className="overflow-y-auto custom-scrollbar p-2">
                 {query.trim() === '' ? (
                     <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground">
                         <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                             <Command className="w-6 h-6 text-accent" />
                         </div>
                         <p className="text-sm font-medium text-foreground">Focus Mode Search</p>
                         <p className="text-xs mt-1">Type to find what you need instantly.</p>
                     </div>
                 ) : (
                    <>
                        {filtered.length > 0 ? (
                            <div className="space-y-1">
                                <h3 className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">Suggestions</h3>
                                {filtered.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            // Ensure we close and nav
                                            onClose();
                                            // Mock nav
                                            console.log(`Navigating to ${item.id}`);
                                        }}
                                        className="w-full text-left flex items-center justify-between px-3 py-3 rounded-md hover:bg-accent/10 hover:text-accent transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Sparkles className="w-4 h-4 text-muted-foreground group-hover:text-accent" />
                                            <span className="text-sm font-medium">{item.title}</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-muted-foreground text-sm">
                                No results found for &quot;{query}&quot;
                            </div>
                        )}
                    </>
                 )}
              </div>
              
              {/* Footer */}
              <div className="bg-muted/30 border-t border-border px-4 py-2 text-[10px] text-muted-foreground flex justify-between items-center">
                 <span>ProTip: Search isn't fully hooked up to DB yet.</span>
                 <div className="flex gap-2">
                     <span className="flex items-center gap-1">
                         <Command className="w-3 h-3" />
                         K to open
                     </span>
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
