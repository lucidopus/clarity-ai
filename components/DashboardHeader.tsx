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
  claraGreeting?: string;
  onGenerateClick?: () => void;
  onLiveLectureClick?: () => void;
  isGenerateModalOpen?: boolean;
}

export default function DashboardHeader({ title, subtitle, claraGreeting, onGenerateClick, onLiveLectureClick, isGenerateModalOpen }: DashboardHeaderProps) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-border">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{title}</h1>
          {subtitle && subtitle !== 'undefined' && <p className="text-sm sm:text-base text-muted-foreground">{subtitle}</p>}
          {claraGreeting && (
            <p className="text-sm text-muted-foreground/80 mt-1.5 italic">{claraGreeting}</p>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {onGenerateClick && (
            hasLiveLecture ? (
              <Button
                onClick={() => setPickerOpen(true)}
                variant="primary"
                size="sm"
                className="flex-1 sm:flex-none min-h-11 sm:min-h-0"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
                <span className="ml-2 text-xs opacity-70 hidden sm:inline">⌘K</span>
              </Button>
            ) : (
              <div title={`${isGenerateModalOpen ? 'Close' : 'Open'} generate modal (⌘K)`} className="flex-1 sm:flex-none">
                <Button onClick={onGenerateClick} variant="primary" size="sm" className="w-full sm:w-auto min-h-11 sm:min-h-0">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                  <span className="ml-2 text-xs opacity-70 hidden sm:inline">⌘K</span>
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
            className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
            <motion.div
              className="relative w-full sm:max-w-lg bg-card-bg border-t sm:border border-border rounded-t-2xl sm:rounded-2xl landscape-phone-fill shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)] sm:pb-0"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
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
