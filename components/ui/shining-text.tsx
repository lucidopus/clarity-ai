"use client";

import * as React from "react";
import { motion } from "framer-motion";

interface ShiningTextProps {
  text: string;
  className?: string;
}

/**
 * A shimmering single-line of text — the bright band sweeps across the glyphs
 * to signal an in-flight "thinking" state without the visual noise of a spinner.
 * Adapts to light and dark modes via Tailwind variants on the gradient stops.
 */
export function ShiningText({ text, className = "" }: ShiningTextProps) {
  return (
    <motion.span
      className={
        // Light mode: light-gray base with a dark sweep.
        // Dark mode: dark-gray base with a light sweep.
        "bg-[linear-gradient(110deg,#9CA3AF,35%,#1F2937,50%,#9CA3AF,75%,#9CA3AF)] " +
        "dark:bg-[linear-gradient(110deg,#4B5563,35%,#F9FAFB,50%,#4B5563,75%,#4B5563)] " +
        "bg-[length:200%_100%] bg-clip-text text-transparent " +
        "text-sm font-medium " +
        className
      }
      initial={{ backgroundPosition: "200% 0" }}
      animate={{ backgroundPosition: "-200% 0" }}
      transition={{
        repeat: Infinity,
        duration: 2,
        ease: "linear",
      }}
    >
      {text}
    </motion.span>
  );
}

export default ShiningText;
