'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import Button from './Button';

interface DeleteAccountConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * DeleteAccountConfirmModal - Two-step confirmation for account deletion
 *
 * Step 1: "Are you sure?" with details of what will be deleted
 * Step 2: Input field requiring "delete my account" to confirm
 */
export default function DeleteAccountConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteAccountConfirmModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    if (!isLoading) {
      setStep(1);
      setConfirmText('');
      setError('');
      onClose();
    }
  };

  const handleFirstConfirm = () => {
    setStep(2);
    setError('');
  };

  const handleBack = () => {
    setStep(1);
    setConfirmText('');
    setError('');
  };

  const handleFinalConfirm = () => {
    if (confirmText.trim() === 'delete my account') {
      onConfirm();
      // Reset will happen when modal closes
    } else {
      setError('Please type exactly: delete my account');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      handleClose();
    }
    if (e.key === 'Enter' && step === 2 && !isLoading) {
      handleFinalConfirm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={!isLoading ? handleClose : undefined}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onKeyDown={handleKeyDown}
          >
            <div className="bg-card-bg border border-red-500/20 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="flex items-start gap-4 px-6 py-5 border-b border-red-500/20">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {step === 1 ? 'Delete Account?' : 'Final Confirmation'}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step === 1
                      ? 'This action cannot be undone.'
                      : 'Type the phrase below to confirm deletion.'}
                  </p>
                </div>
                {!isLoading && (
                  <button
                    onClick={handleClose}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-background rounded-lg shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {step === 1 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground">
                      All your data will be permanently deleted, including:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>Learning materials and flashcards</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>Progress tracking and streaks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>Notes, videos, and all saved content</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>Account information and preferences</span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="confirm-text" className="block text-sm font-medium text-foreground mb-2">
                        Type <span className="font-mono font-bold text-red-500">delete my account</span> to confirm:
                      </label>
                      <input
                        id="confirm-text"
                        type="text"
                        value={confirmText}
                        onChange={(e) => {
                          setConfirmText(e.target.value);
                          setError('');
                        }}
                        className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground
                          placeholder-muted-foreground focus:outline-none focus:ring-2
                          focus:ring-offset-2 focus:ring-offset-card-bg transition-colors
                          ${error ? 'border-red-500/50 focus:ring-red-500' : 'border-border focus:ring-accent'}
                        `}
                        placeholder="delete my account"
                        autoFocus
                        disabled={isLoading}
                      />
                      {error && (
                        <p className="mt-2 text-sm text-red-500">{error}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/5 border-t border-border">
                <Button
                  type="button"
                  onClick={step === 1 ? handleClose : handleBack}
                  variant="ghost"
                  disabled={isLoading}
                  className="px-6 py-2 cursor-pointer"
                >
                  {step === 1 ? 'Cancel' : 'Back'}
                </Button>
                <Button
                  type="button"
                  onClick={step === 1 ? handleFirstConfirm : handleFinalConfirm}
                  variant="ghost"
                  disabled={isLoading}
                  className="px-8 cursor-pointer text-red-500 hover:bg-red-500/10 border border-red-500/20"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                      Deleting...
                    </div>
                  ) : step === 1 ? (
                    'Continue'
                  ) : (
                    'Delete Account'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
