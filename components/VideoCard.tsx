'use client';

import { motion } from 'framer-motion';
import Button from './Button';
import { Clock, Layers, HelpCircle, User, Stars } from 'lucide-react';

interface VideoCardProps {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl?: string;
  duration?: string;
  flashcardCount?: number;
  quizCount?: number;
  transcriptMinutes?: number;
  createdAt: Date | string;
  onClick?: (id: string) => void;
  onDelete?: () => void;
}

export default function VideoCard({
  id,
  title,
  channelName,
  thumbnailUrl,
  duration,
  flashcardCount,
  quizCount,
  createdAt,
  onClick,
  onDelete
}: VideoCardProps) {
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-card-bg/70 backdrop-blur-sm border border-border rounded-2xl overflow-hidden shadow-lg cursor-pointer group relative"
      onClick={() => onClick?.(id)}
    >
      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="aspect-video w-full bg-muted relative overflow-hidden">
          <img
            src={thumbnailUrl}
            alt={`${title} thumbnail`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground line-clamp-2 leading-snug">{title}</h3>
            {channelName && (
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground max-w-full" title={channelName}>
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="truncate">{channelName}</span>
              </div>
            )}
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete video"
              className="px-2.5 h-8 rounded-full bg-red-500/90 hover:bg-red-500 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
            >
              Delete
            </button>
          )}
        </div>
        {/* Stats, minimal inline items (no pills) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 text-xs text-muted-foreground">
          {duration && (
            <div className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{duration}</span>
            </div>
          )}

          {flashcardCount && flashcardCount > 0 && (
            <div className="inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{flashcardCount} flashcards</span>
            </div>
          )}

          {quizCount && quizCount > 0 && (
            <div className="inline-flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{quizCount} quizzes</span>
            </div>
          )}
        </div>

        {/* Footer with date and action */}
        <div className="flex items-center justify-between pt-5 border-t border-border">
          <span className="text-xs text-muted-foreground">{formatDate(createdAt)}</span>
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={() => onClick?.(id)}
              variant="primary"
              size="sm"
              className="font-semibold shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              <Stars className="w-4 h-4 mr-2" />
              Dive In
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}