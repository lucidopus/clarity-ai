'use client';

import { useState, useEffect } from 'react';

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
 * Lightweight thinking indicator with rotating phrases and CSS-only dots.
 * No framer-motion — uses pure CSS keyframes for minimal CPU usage.
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
    <div className={`flex items-center gap-1.5 text-sm text-secondary ${className}`}>
      <span className="transition-opacity duration-300">{PHRASES[index]}</span>
      <span className="flex gap-0.5" aria-hidden="true">
        <span className="thinking-dot" />
        <span className="thinking-dot [animation-delay:200ms]" />
        <span className="thinking-dot [animation-delay:400ms]" />
      </span>

      {/* CSS-only animation — no JS animation frames */}
      <style jsx>{`
        .thinking-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse-dot 1s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
