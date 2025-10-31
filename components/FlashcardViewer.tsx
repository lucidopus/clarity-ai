'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCw, Check } from 'lucide-react';
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
  videoId: string;
}

export default function FlashcardViewer({ flashcards }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(
    new Set(flashcards.filter((fc) => fc.isMastered).map((fc) => fc.id))
  );

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
  };

  const handleMastered = () => {
    const newMastered = new Set(masteredCards);
    if (masteredCards.has(currentCard.id)) {
      newMastered.delete(currentCard.id);
    } else {
      newMastered.add(currentCard.id);
    }
    setMasteredCards(newMastered);
    // TODO: API call to save mastered status
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
            <span className="font-medium">Mastered</span>
          </motion.div>
        </Button>

        <Button variant="secondary" onClick={handleFlip} className="px-6">
          <RotateCw className="w-5 h-5" />
        </Button>

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
