'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCw, Lightbulb, Edit3 } from 'lucide-react';
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
  const [isPreviewFlipped, setIsPreviewFlipped] = useState(false);

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setQuestion(initialData.question);
      setAnswer(initialData.answer);
      setIsPreviewFlipped(false);
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
    setIsPreviewFlipped(false);
    onClose();
  };

  const questionLength = question.length;
  const answerLength = answer.length;
  const hasContent = question.trim() || answer.trim();
  const hasChanges = initialData && (
    question.trim() !== initialData.question.trim() ||
    answer.trim() !== initialData.answer.trim()
  );

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
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card-bg border border-border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-gradient-to-r from-accent/5 to-transparent">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Edit3 className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Edit Your Flashcard
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Update your custom flashcard
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-background rounded-lg"
                  disabled={isLoading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 max-h-[calc(90vh-180px)] overflow-y-auto">
                {/* Left Side: Form */}
                <div className="space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Question Input */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label
                          htmlFor="edit-question"
                          className="text-sm font-semibold text-foreground flex items-center gap-2"
                        >
                          <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
                            Q
                          </span>
                          Question
                        </label>
                        <span className={`text-xs ${questionLength > 200 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {questionLength}/200
                        </span>
                      </div>
                      <textarea
                        id="edit-question"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="What do you want to remember?"
                        className="w-full px-4 py-4 bg-background border-2 border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 resize-none"
                        rows={4}
                        maxLength={200}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    {/* Answer Input */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label
                          htmlFor="edit-answer"
                          className="text-sm font-semibold text-foreground flex items-center gap-2"
                        >
                          <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
                            A
                          </span>
                          Answer
                        </label>
                        <span className={`text-xs ${answerLength > 300 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {answerLength}/300
                        </span>
                      </div>
                      <textarea
                        id="edit-answer"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="The correct answer to your question..."
                        className="w-full px-4 py-4 bg-background border-2 border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 resize-none"
                        rows={5}
                        maxLength={300}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    {/* Tips */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-accent/5 border border-accent/20 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">Editing tips:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Refine for clarity and precision</li>
                            <li>• Ensure the answer fully addresses the question</li>
                            <li>• Keep it concise and memorable</li>
                          </ul>
                        </div>
                      </div>
                    </motion.div>

                    {/* Change Indicator */}
                    {hasChanges && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-sm text-accent"
                      >
                        <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                        Unsaved changes
                      </motion.div>
                    )}
                  </form>
                </div>

                {/* Right Side: Live Preview */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Live Preview
                    </h3>
                    {hasContent && (
                      <button
                        onClick={() => setIsPreviewFlipped(!isPreviewFlipped)}
                        className="text-xs text-accent hover:text-accent/80 flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 rounded-lg transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Flip Preview
                      </button>
                    )}
                  </div>

                  {/* Preview Card */}
                  <div className="relative h-[400px] perspective-1000 flex-1">
                    {hasContent ? (
                      <motion.div
                        className="relative w-full h-full cursor-pointer"
                        onClick={() => setIsPreviewFlipped(!isPreviewFlipped)}
                        animate={{ rotateY: isPreviewFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        {/* Front of card (Question) */}
                        <div
                          className="absolute inset-0 bg-card-bg border-2 border-border rounded-2xl p-8 flex flex-col items-center justify-center backface-hidden"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div className="text-xs font-semibold text-accent mb-4 px-3 py-1 bg-accent/10 rounded-full">
                            Question
                          </div>
                          <p className="text-xl font-semibold text-foreground text-center leading-relaxed">
                            {question}
                          </p>
                          <div className="mt-6 text-xs text-muted-foreground">
                            Click to flip
                          </div>
                        </div>

                        {/* Back of card (Answer) */}
                        <div
                          className="absolute inset-0 bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent rounded-2xl p-8 flex flex-col items-center justify-center backface-hidden"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                        >
                          <div className="text-xs font-semibold text-accent mb-4 px-3 py-1 bg-accent/20 rounded-full">
                            Answer
                          </div>
                          <p className="text-xl font-semibold text-foreground text-center leading-relaxed">
                            {answer}
                          </p>
                          <div className="mt-6 text-xs text-muted-foreground">
                            Click to see question
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full h-full border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                          <span className="text-3xl">✏️</span>
                        </div>
                        <h4 className="text-lg font-semibold text-foreground mb-2">
                          Preview your edits
                        </h4>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Changes will appear here as you edit
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-4 px-8 py-6 border-t border-border bg-muted/5">
                <div className="text-sm text-muted-foreground">
                  {hasChanges ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      Ready to save changes
                    </span>
                  ) : (
                    <span>No changes made</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handleClose}
                    variant="ghost"
                    disabled={isLoading}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!question.trim() || !answer.trim() || !hasChanges || isLoading}
                    className="px-8"
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
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
