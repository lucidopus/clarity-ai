'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCw, Check, Edit, Trash2 } from 'lucide-react';
import Button from './Button';
import { logActivity } from '@/lib/activityLogger';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  isMastered: boolean;
  isUserCreated: boolean;
}

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  videoId: string;
  onEdit?: (flashcard: Flashcard) => void;
  onDelete?: (flashcardId: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function FlashcardViewer({
  flashcards,
  videoId,
  onEdit,
  onDelete,
  onShowToast
}: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(
    new Set(flashcards.filter((fc) => fc.isMastered).map((fc) => fc.id))
  );
  const [isUpdatingMastery, setIsUpdatingMastery] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📚</span>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No flashcards yet</h3>
          <p className="text-muted-foreground">
            Flashcards will appear here once generated.
          </p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;
  const masteredCount = masteredCards.size;

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    // Log activity when user views/flips flashcard
    if (!isFlipped) {
      logActivity('flashcard_viewed', videoId, {
        flashcardId: currentCard.id,
      });
    }
  };

  const handleMastered = async () => {
    const newMastered = new Set(masteredCards);
    const wasNotMastered = !masteredCards.has(currentCard.id);
    const isMastered = !masteredCards.has(currentCard.id);

    if (masteredCards.has(currentCard.id)) {
      newMastered.delete(currentCard.id);
    } else {
      newMastered.add(currentCard.id);
    }

    // Optimistically update UI
    setMasteredCards(newMastered);

    // Log activity when user marks card as mastered (not when unmarking)
    if (wasNotMastered) {
      logActivity('flashcard_mastered', videoId, {
        flashcardId: currentCard.id,
      });
    }

    // Persist to backend
    setIsUpdatingMastery(true);
    try {
      const response = await fetch('/api/learning/flashcards/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: videoId,
          flashcardId: currentCard.id,
          isMastered: isMastered,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update mastery status');
      }
    } catch (error) {
      console.error('Error updating mastery:', error);
      // Revert optimistic update on error
      setMasteredCards(masteredCards);
      onShowToast?.('Failed to update mastery status. Please try again.', 'error');
    } finally {
      setIsUpdatingMastery(false);
    }
  };

  const handleEdit = () => {
    if (onEdit && currentCard.isUserCreated) {
      onEdit(currentCard);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !currentCard.isUserCreated) return;

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this flashcard? This action cannot be undone.')) {
      return;
    }

    setIsDeletingCard(true);
    try {
      await onDelete(currentCard.id);

      // Move to next card or previous if this was the last card
      if (currentIndex === flashcards.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      setIsFlipped(false);
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      onShowToast?.('Failed to delete flashcard. Please try again.', 'error');
    } finally {
      setIsDeletingCard(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleFlip();
    }
  };

  return (
    <div className="max-w-4xl mx-auto" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-foreground">
            Card {currentIndex + 1} of {flashcards.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {masteredCount} mastered
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* User-Created Indicator */}
      {currentCard.isUserCreated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center mb-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-xs font-medium text-accent">Your Card</span>
          </div>
        </motion.div>
      )}

      {/* Flashcard */}
      <div className="relative h-[400px] mb-8 perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, rotateY: -90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 90 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <motion.div
              className="relative w-full h-full cursor-pointer"
              onClick={handleFlip}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
               {/* Front of card (Question) */}
               <div
                 className="absolute inset-0 bg-card-bg border-2 border-border rounded-2xl p-8 flex flex-col items-center justify-center backface-hidden cursor-pointer"
                 style={{ backfaceVisibility: 'hidden' }}
               >
                <div className="text-sm font-medium text-accent mb-4">Question</div>
                <p className="text-2xl font-semibold text-foreground text-center">
                  {currentCard.question}
                </p>
                <div className="mt-8 text-sm text-muted-foreground">
                  Click to reveal answer
                </div>
              </div>

               {/* Back of card (Answer) */}
               <div
                 className="absolute inset-0 bg-accent/5 border-2 border-accent rounded-2xl p-8 flex flex-col items-center justify-center backface-hidden cursor-pointer"
                 style={{
                   backfaceVisibility: 'hidden',
                   transform: 'rotateY(180deg)',
                 }}
               >
                <div className="text-sm font-medium text-accent mb-4">Answer</div>
                <p className="text-2xl font-semibold text-foreground text-center">
                  {currentCard.answer}
                </p>
                <div className="mt-8 text-sm text-muted-foreground">
                  Click to see question
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="secondary"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex-1"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Previous
        </Button>

        <Button
          variant={masteredCards.has(currentCard.id) ? 'primary' : 'secondary'}
          onClick={handleMastered}
          disabled={isUpdatingMastery}
          className="px-4 min-w-[120px]"
        >
          <motion.div
            className="flex items-center justify-center"
            animate={{
              scale: masteredCards.has(currentCard.id) ? 1.05 : 1,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Check className={`w-4 h-4 mr-2 ${masteredCards.has(currentCard.id) ? '' : 'opacity-60'}`} />
            <span className="font-medium">{isUpdatingMastery ? 'Saving...' : 'Mastered'}</span>
          </motion.div>
        </Button>

        <Button variant="secondary" onClick={handleFlip} className="px-6">
          <RotateCw className="w-5 h-5" />
        </Button>

        {/* Edit Button (only for user-created cards) */}
        {currentCard.isUserCreated && onEdit && (
          <Button
            variant="secondary"
            onClick={handleEdit}
            className="px-4"
            title="Edit this flashcard"
          >
            <Edit className="w-5 h-5" />
          </Button>
        )}

        {/* Delete Button (only for user-created cards) */}
        {currentCard.isUserCreated && onDelete && (
          <Button
            variant="secondary"
            onClick={handleDelete}
            disabled={isDeletingCard}
            className="px-4 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500"
            title="Delete this flashcard"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        )}

        <Button
          variant="primary"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="flex-1"
        >
          Next
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
