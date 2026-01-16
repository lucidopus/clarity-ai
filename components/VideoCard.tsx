'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Button from './Button';

import { Clock, Layers, HelpCircle, User, Stars, Globe, Share2, Trash2 } from 'lucide-react';

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
  progress?: number;
  visibility?: 'private' | 'public';
  authorUsername?: string;
  onClick?: (id: string) => void;
  onDelete?: () => void;
  onVisibilityChange?: (visibility: 'private' | 'public') => void;
  className?: string;
  variant?: 'standard' | 'compact';
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
  progress = 0,
  visibility = 'private',
  authorUsername,
  onClick,
  onDelete,
  onVisibilityChange,
  className = '',
  variant = 'standard'
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

  // Circular Progress Ring Logic
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`bg-card-bg/70 backdrop-blur-sm border border-border rounded-2xl overflow-hidden shadow-lg cursor-pointer group relative ${variant === 'compact' ? 'min-w-[240px] w-[240px]' : ''} ${className}`}
      onClick={() => onClick?.(id)}
    >
      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="aspect-video w-full bg-muted relative overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={`${title} thumbnail`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Progress Ring Overlay */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md rounded-full p-1 flex items-center justify-center shadow-xl">
             <div className="relative w-12 h-12 flex items-center justify-center">
                {/* Background Circle */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                  <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-white/20"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ease-out ${
                      progress === 100 ? 'text-green-500' : 'text-accent'
                    }`}
                  />
                </svg>
                {/* Percentage Text */}
                <span className={`absolute text-[10px] font-bold ${
                  progress === 100 ? 'text-green-400' : 'text-white'
                }`}>
                  {progress}%
                </span>
             </div>
          </div>
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60" />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground line-clamp-2 leading-snug">{title}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground max-w-full">
              {channelName && (
                <>
                  <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{channelName}</span>
                </>
              )}
              {channelName && authorUsername && (
                <span className="text-border">•</span>
              )}
              {authorUsername && (
                <span className="text-accent font-medium">@{authorUsername}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onVisibilityChange && (
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   onVisibilityChange(visibility === 'public' ? 'private' : 'public');
                 }}
                 className={`
                   flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm cursor-pointer
                   ${visibility === 'public'
                     ? 'bg-accent hover:bg-accent/90 text-white border border-transparent shadow-accent/20'
                     : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300'
                   }
                 `}
                 title={visibility === 'public' ? 'Publicly visible' : 'Private to you'}
               >
                  {visibility === 'public' ? (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </>
                  )}
               </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                aria-label="Delete video"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all duration-200 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {/* Stats, minimal inline items (no pills) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 text-xs text-muted-foreground">
          {duration && (
            <div className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{duration}</span>
            </div>
          )}

          {(flashcardCount || 0) > 0 && (
            <div className="inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{flashcardCount} flashcards</span>
            </div>
          )}

          {(quizCount || 0) > 0 && (
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
              className="font-semibold shadow-md hover:shadow-lg transition-all duration-200 relative overflow-hidden group/btn"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-out" />

              {/* Subtle glow pulse */}
              <div className="absolute inset-0 rounded-md bg-accent/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 animate-pulse" />

              <Stars className="w-4 h-4 mr-2 relative z-10" />
              <span className="relative z-10">Dive In</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}