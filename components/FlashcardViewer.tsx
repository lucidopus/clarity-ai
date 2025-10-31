'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from './Button';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  isMastered: boolean;
  isUserCreated: boolean;
}

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  onMarkMastered?: (flashcardId: string) => void;
  onResetMastery?: (flashcardId: string) => void;
  onCreateNew?: () => void;
}

export default function FlashcardViewer({
  flashcards,
  onMarkMastered,
  onResetMastery,
  onCreateNew
}: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;
  const masteredCount = masteredIds.size;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleMarkMastered = () => {
    if (currentCard && onMarkMastered) {
      setMasteredIds(prev => new Set([...prev, currentCard.id]));
      onMarkMastered(currentCard.id);
    }
  };

  const handleResetMastery = () => {
    if (currentCard && onResetMastery) {
      setMasteredIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentCard.id);
        return newSet;
      });
      onResetMastery(currentCard.id);
    }
  };

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

  const handleShuffle = () => {
    // Simple shuffle - in a real app, you'd want a better algorithm
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    // Find the current card's new index
    const newIndex = shuffled.findIndex(card => card.id === currentCard?.id);
    setCurrentIndex(newIndex !== -1 ? newIndex : 0);
    setIsFlipped(false);
  };

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No flashcards available</p>
        {onCreateNew && (
          <Button onClick={onCreateNew} variant="primary" className="mt-4">
            Create Your First Flashcard
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {flashcards.length}
          </span>
          <span className="text-sm text-muted-foreground">
            Mastered: {masteredCount}
          </span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="relative mb-6">
        <motion.div
          className="w-full h-64 cursor-pointer"
          onClick={handleFlip}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{ perspective: '1000px' }}
        >
          <motion.div
            className="relative w-full h-full"
            initial={false}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front of card */}
            <motion.div
              className="absolute inset-0 w-full h-full bg-card-bg border border-border rounded-2xl shadow-lg flex items-center justify-center p-6 backface-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-accent"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Question</h3>
                <p className="text-foreground text-lg leading-relaxed">
                  {currentCard.question}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Click to reveal answer
                </p>
              </div>
            </motion.div>

            {/* Back of card */}
            <motion.div
              className="absolute inset-0 w-full h-full bg-card-bg border border-border rounded-2xl shadow-lg flex items-center justify-center p-6 backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-green-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Answer</h3>
                <p className="text-foreground text-lg leading-relaxed">
                  {currentCard.answer}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Click to flip back
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Mastery indicator */}
        {masteredIds.has(currentCard.id) && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="white"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <div className="flex gap-2">
          <Button
            onClick={handlePrev}
            variant="ghost"
            disabled={currentIndex === 0}
            className="px-4"
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            variant="ghost"
            disabled={currentIndex === flashcards.length - 1}
            className="px-4"
          >
            Next
          </Button>
        </div>

        <div className="flex gap-2">
          {masteredIds.has(currentCard.id) ? (
            <Button
              onClick={handleResetMastery}
              variant="outline"
              className="px-4"
            >
              Reset
            </Button>
          ) : (
            <Button
              onClick={handleMarkMastered}
              variant="primary"
              className="px-4"
            >
              Mark as Learned
            </Button>
          )}
          <Button
            onClick={handleShuffle}
            variant="ghost"
            className="px-4"
          >
            Shuffle
          </Button>
        </div>
      </div>

      {/* Create new card button */}
      {onCreateNew && (
        <div className="text-center mt-6">
          <Button onClick={onCreateNew} variant="outline">
            + Create New Card
          </Button>
        </div>
      )}
    </div>
  );
}