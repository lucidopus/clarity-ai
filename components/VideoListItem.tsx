'use client';

import { useState } from 'react';
import { Clock, Layers, HelpCircle, Eye, EyeOff, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface VideoListItemProps {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl?: string;
  duration: string;
  transcriptMinutes: number;
  createdAt: Date | string;
  progress?: number;
  flashcardCount?: number;
  quizCount?: number;
  visibility?: 'private' | 'public';
  onVisibilityChange?: (visibility: 'private' | 'public') => void;
  onDelete?: () => void;
  onClick?: (id: string) => void;
}

export default function VideoListItem({
  id,
  title,
  channelName,
  thumbnailUrl,
  duration,
  transcriptMinutes,
  createdAt,
  progress = 0,
  flashcardCount = 0,
  quizCount = 0,
  visibility = 'private',
  onVisibilityChange,
  onDelete,
  onClick,
}: VideoListItemProps) {
  const [, setShowMenu] = useState(false); // Keep setter for future use

  const handleCardClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  const handleVisibilityToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVisibility = visibility === 'private' ? 'public' : 'private';
    if (onVisibilityChange) {
      onVisibilityChange(newVisibility);
    }
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
    setShowMenu(false);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-card-bg border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-all cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail */}
        <div className="relative w-full sm:w-48 flex-shrink-0">
          <div className="aspect-video bg-secondary/20 relative overflow-hidden">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 192px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No thumbnail
              </div>
            )}
            {/* Duration Badge */}
            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
              {duration}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            {/* Title */}
            <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-accent transition-colors">
              {title}
            </h3>

            {/* Channel */}
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              {channelName}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>{flashcardCount} cards</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>{quizCount} quizzes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{transcriptMinutes} min</span>
              </div>
              <div className="text-xs">
                Added {formatDate(createdAt)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-secondary/30 rounded-full h-1.5">
                <div
                  className="bg-accent rounded-full h-1.5 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex sm:flex-col items-center justify-end gap-2 p-4 border-t sm:border-t-0 sm:border-l border-border min-w-[140px]">
          {/* Visibility Toggle Button */}
          <button
            onClick={handleVisibilityToggle}
            className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              visibility === 'public'
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'
                : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground/40'
            }`}
          >
            {visibility === 'public' ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                Public
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Private
              </>
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 border border-transparent hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
