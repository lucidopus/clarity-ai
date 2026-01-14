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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-6"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
            Some Learning Materials Unavailable
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
            We were unable to generate the following materials for this video: <span className="font-medium">{incompleteMaterials.join(', ')}</span>. This can sometimes happen with longer videos or during high-traffic periods.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            We are actively working on improving our generation process. You can still learn from the video transcript and any other available materials. This banner will disappear once all materials are ready.
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-200 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
