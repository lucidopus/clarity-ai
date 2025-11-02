'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

interface FlashcardEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (flashcardId: string, question: string, answer: string) => void;
  initialData: {
    id: string;
    question: string;
    answer: string;
  } | null;
  isLoading?: boolean;
}

export default function FlashcardEditor({
  isOpen,
  onClose,
  onEdit,
  initialData,
  isLoading = false
}: FlashcardEditorProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setQuestion(initialData.question);
      setAnswer(initialData.answer);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData && question.trim() && answer.trim()) {
      onEdit(initialData.id, question.trim(), answer.trim());
    }
  };

  const handleClose = () => {
    setQuestion('');
    setAnswer('');
    onClose();
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
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card-bg border border-border rounded-2xl shadow-xl max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">
                  Edit Flashcard
                </h2>
                <button
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  {/* Question */}
                  <div>
                    <label
                      htmlFor="edit-question"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Question *
                    </label>
                    <textarea
                      id="edit-question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Enter your question here..."
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 resize-none"
                      rows={3}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  {/* Answer */}
                  <div>
                    <label
                      htmlFor="edit-answer"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Answer *
                    </label>
                    <textarea
                      id="edit-answer"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Enter the answer here..."
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 resize-none"
                      rows={4}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    onClick={handleClose}
                    variant="ghost"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={!question.trim() || !answer.trim() || isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
