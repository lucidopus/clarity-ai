'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  trigger: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ title, icon, children, trigger, position = 'top' }) => {
  const [isHovered, setIsHovered] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-3',
    bottom: 'top-full mt-3',
    left: 'right-full mr-3',
    right: 'left-full ml-3',
  };

  const initialOffset = {
    top: { y: 8 },
    bottom: { y: -8 },
    left: { x: 8 },
    right: { x: -8 },
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {trigger}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
              ...initialOffset[position]
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              x: 0
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              ...initialOffset[position]
            }}
            transition={{
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`absolute ${positionClasses[position]} w-max max-w-sm z-50`}
          >
            <div className="bg-card-bg border border-border rounded-xl shadow-xl overflow-hidden">
              {title && (
                <div className="px-4 py-3 border-b border-border/50">
                  <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    {icon}
                    {title}
                  </h4>
                </div>
              )}
              <div className="px-4 py-3">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;