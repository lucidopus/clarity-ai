'use client';

import { motion } from 'framer-motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function Switch({ checked, onChange, disabled = false, className = '' }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        // If controlled by parent wrapping click, we might want to stop propagation here or let parent handle it.
        // But here we just want basic switch behavior. 
        if (!disabled) {
           onChange(!checked);
        }
      }}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
        ${checked ? 'bg-accent' : 'bg-muted'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <span className="sr-only">Toggle visibility</span>
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        animate={{ x: checked ? 20 : 0 }}
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow-lg pointer-events-none mx-0.5
        `}
      />
    </button>
  );
}
