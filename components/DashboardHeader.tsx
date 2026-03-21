'use client';

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import Button from './Button';
import { Sparkles, FileText, Mic } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onGenerateClick?: () => void;
  onLiveLectureClick?: () => void;
  isGenerateModalOpen?: boolean;
}

export default function DashboardHeader({ title, subtitle, onGenerateClick, onLiveLectureClick, isGenerateModalOpen }: DashboardHeaderProps) {
  useAuth(); // Keep hook for potential future usage
  const [pickerOpen, setPickerOpen] = useState(false);

  // Keyboard shortcut for generate button (Cmd+K)
  useEffect(() => {
    if (!onGenerateClick) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setPickerOpen(prev => !prev);
      }
      if (event.key === 'Escape' && pickerOpen) {
        setPickerOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onGenerateClick, pickerOpen]);

  const hasLiveLecture = !!onLiveLectureClick;

  return (
    <>
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">{title}</h1>
          {subtitle && subtitle !== 'undefined' && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-4">
          {onGenerateClick && (
            hasLiveLecture ? (
              <Button
                onClick={() => setPickerOpen(true)}
                variant="primary"
                size="sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
                <span className="ml-2 text-xs opacity-70">⌘K</span>
              </Button>
            ) : (
              <div title={`${isGenerateModalOpen ? 'Close' : 'Open'} generate modal (⌘K)`}>
                <Button onClick={onGenerateClick} variant="primary" size="sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                  <span className="ml-2 text-xs opacity-70">⌘K</span>
                </Button>
              </div>
            )
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Generate Picker Modal */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
            <motion.div
              className="relative w-full max-w-lg mx-4 bg-card-bg border border-border rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="px-6 pt-6 pb-3">
                <h3 className="text-lg font-semibold text-foreground">What would you like to create?</h3>
                <p className="text-sm text-muted-foreground mt-1">Choose how you want to generate study materials.</p>
              </div>
              <div className="px-4 pb-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPickerOpen(false);
                    onGenerateClick?.();
                  }}
                  className="group flex flex-col items-center gap-3 px-5 py-6 rounded-xl border border-border/50 text-foreground hover:border-blue-400/50 hover:bg-blue-500/5 transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 group-hover:bg-blue-500/15 flex items-center justify-center transition-colors">
                    <FileText className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold">Study Materials</div>
                    <div className="text-xs text-muted-foreground mt-0.5">YouTube, PDF, text, audio</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setPickerOpen(false);
                    onLiveLectureClick?.();
                  }}
                  className="group flex flex-col items-center gap-3 px-5 py-6 rounded-xl border border-border/50 text-foreground hover:border-teal-400/50 hover:bg-teal-500/5 transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/10 group-hover:bg-teal-500/15 flex items-center justify-center transition-colors">
                    <Mic className="w-7 h-7 text-teal-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold">Live Session</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Real-time capture with Clara</div>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
