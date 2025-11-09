'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Loader2, AlertTriangle } from 'lucide-react';
import Button from './Button';

interface PasswordVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export default function PasswordVerificationModal({
  isOpen,
  onClose,
  onVerify,
  isLoading = false,
  error: externalError = null,
}: PasswordVerificationModalProps) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [shouldShake, setShouldShake] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setPassword('');
      setLocalError('');
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Trigger shake animation when external error changes
  useEffect(() => {
    if (externalError) {
      setTimeout(() => {
        if (!shouldShake) {
          setShouldShake(true);
        }
      }, 0);
      const timer = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [externalError, shouldShake]);

  const displayError = externalError || localError;

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (localError) setLocalError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!password) {
      setLocalError('Password is required');
      return;
    }

    try {
      await onVerify(password);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Password verification failed:', error);
    }
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
            animate={
              shouldShake
                ? {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    x: [0, -10, 10, -10, 10, -5, 5, 0],
                  }
                : { opacity: 1, scale: 1, y: 0, x: 0 }
            }
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={
              shouldShake
                ? { duration: 0.5, ease: 'easeOut' }
                : { duration: 0.2, ease: 'easeOut' }
            }
            className="bg-card-bg border border-border rounded-2xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Verify Password</h2>
                  <p className="text-sm text-muted-foreground">
                    Please enter your password to confirm this change.
                  </p>
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
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Enter your password"
                    className={`w-full pl-12 pr-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-bg focus:ring-accent transition-colors ${
                      displayError ? 'border-red-500/50 ring-red-500/50' : 'border-border'
                    }`}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {displayError && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertTriangle className="w-4 h-4" />
                    <p>{displayError}</p>
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
                  disabled={!password || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
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
