'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link as LinkIcon, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import Button from './Button';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (url: string) => void;
  isLoading?: boolean;
}

export default function GenerateModal({
  isOpen,
  onClose,
  onGenerate,
  isLoading = false
}: GenerateModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setUrl('');
      setError('');
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const isValidUrl = (() => {
    if (!url) return false;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
    return youtubeRegex.test(url.trim());
  })();

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!isValidUrl) {
      setError('Please enter a valid YouTube URL.');
      return;
    }
    onGenerate(url.trim());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-card-bg border border-border rounded-2xl shadow-xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Generate Materials</h2>
                  <p className="text-sm text-muted-foreground">Paste a YouTube link to get started.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {isValidUrl ? (
                       <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                       <LinkIcon className="w-5 h-5" />
                    )}
                  </div>
                  <input
                    id="youtube-url"
                    type="url"
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={`w-full pl-12 pr-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-bg focus:ring-accent transition-colors ${
                      error ? 'border-red-500/50 ring-red-500/50' : 'border-border'
                    }`}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertTriangle className="w-4 h-4" />
                    <p>{error}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-4 p-6 border-t border-border bg-muted/20">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isValidUrl || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
