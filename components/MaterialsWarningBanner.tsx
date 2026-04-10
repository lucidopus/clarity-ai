'use client';

import { AlertCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface MaterialsWarningBannerProps {
  incompleteMaterials: string[];
  isVisible: boolean;
  onDismiss: () => void;
}

export default function MaterialsWarningBanner({
  incompleteMaterials,
  isVisible,
  onDismiss
}: MaterialsWarningBannerProps) {
  if (!isVisible || incompleteMaterials.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 px-4 py-3 mb-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30"
    >
      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-0.5">
          We&apos;re finalizing your remaining materials
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Your <span className="font-medium">{incompleteMaterials.join(', ')}</span>{' '}didn&apos;t generate as expected — we are actively resolving this and will update your library as soon as possible.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-200 transition-colors cursor-pointer mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
