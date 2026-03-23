'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function AnimationLoading() {
  return (
    <div className="my-3 rounded-lg border border-border/50 bg-muted/20 p-6 flex flex-col items-center justify-center min-h-[200px] gap-3">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-accent"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
      <p className="text-xs text-secondary">Generating animation...</p>
    </div>
  );
}
