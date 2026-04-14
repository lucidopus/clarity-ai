'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShiningText } from '@/components/ui/shining-text';

const PHRASES = [
  'Absorbing',
  'Sparking',
  'Marinating',
  'Percolating',
  'Clicking',
  'Crystallizing',
  'Noodling',
  'Grokking',
  'Ruminating',
  'Simmering',
  'Synthesizing',
  'Decoding',
];

const ROTATE_INTERVAL_MS = 3000;

/**
 * Clara's thinking indicator — a shimmering rotating verb. The shine sweeps
 * left→right on a 2s loop to communicate "actively working" without the
 * visual noise of a spinner.
 */
export default function ThinkingIndicator({ className = '' }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(prev => (prev + 1) % PHRASES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`flex items-center ${className}`} aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <ShiningText text={`${PHRASES[index]}…`} />
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
