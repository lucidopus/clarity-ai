'use client';

import { useState } from 'react';
import { Clock, Layers, HelpCircle, Eye, EyeOff, Trash2, Youtube, FileText, Headphones, StickyNote, Mic } from 'lucide-react';
import Image from 'next/image';

interface VideoListItemProps {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl?: string;
  transcriptMinutes: number;
  createdAt: Date | string;
  progress?: number;
  flashcardCount?: number;
  quizCount?: number;
  visibility?: 'private' | 'public';
  onVisibilityChange?: (visibility: 'private' | 'public') => void;
  onDelete?: () => void;
  onClick?: (id: string) => void;
  sourceTypes?: string[];
}

export default function VideoListItem({
  id,
  title,
  channelName,
  thumbnailUrl,
  transcriptMinutes,
  createdAt,
  progress = 0,
  flashcardCount = 0,
  quizCount = 0,
  visibility = 'private',
  onVisibilityChange,
  onDelete,
  onClick,
  sourceTypes,
}: VideoListItemProps) {
  const [, setShowMenu] = useState(false); // Keep setter for future use

  const sourceIconMap: Record<string, { icon: typeof Youtube; color: string; bg: string; label: string }> = {
    youtube: { icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/10', label: 'YouTube' },
    document: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Document' },
    audio: { icon: Headphones, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Audio' },
    text: { icon: StickyNote, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Text' },
    live_lecture: { icon: Mic, color: 'text-teal-400', bg: 'bg-teal-500/10', label: 'Live Lecture' },
  };

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
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            {/* Title */}
            <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-accent transition-colors">
              {title}
            </h3>

            {/* Source Types */}
            <div className="flex items-center gap-1.5 mb-3">
              {sourceTypes && sourceTypes.length > 0 ? (
                <div className="flex items-center gap-1">
                  {[...new Set(sourceTypes)].map((type) => {
                    const config = sourceIconMap[type];
                    if (!config) return null;
                    const Icon = config.icon;
                    return (
                      <span
                        key={type}
                        title={config.label}
                        className={`w-5 h-5 rounded-md flex items-center justify-center ${config.color} ${config.bg}`}
                      >
                        <Icon className="w-3 h-3" />
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-red-500" />
                  {channelName}
                </p>
              )}
            </div>

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
