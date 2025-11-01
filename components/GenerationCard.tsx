'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { X, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface GenerationCardProps {
  id: string;
  youtubeUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';
  progress: number;
  title?: string;
  channelName?: string;
  thumbnailUrl?: string;
  duration?: string;
  errorMessage?: string;
  createdAt: Date;
  onCancel?: (id: string) => void;
}

export default function GenerationCard({
  id,
  youtubeUrl,
  status,
  progress,
  title,
  channelName,
  thumbnailUrl,
  duration,
  errorMessage,
  createdAt,
  onCancel
}: GenerationCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'canceled':
        return <X className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'canceled':
        return 'Canceled';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'queued':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'canceled':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const canCancel = status === 'queued' || status === 'processing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card-bg border border-border rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title || 'Video thumbnail'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={status !== 'completed'}
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-accent/20 to-accent/5 flex items-center justify-center">
            <div className="text-center">
              {getStatusIcon()}
              <p className="text-xs text-muted-foreground mt-2">Processing...</p>
            </div>
          </div>
        )}

        {/* Status overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/80 text-white px-2 py-1 rounded-full text-xs">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>

        {/* Cancel button */}
        {canCancel && onCancel && (
          <button
            onClick={() => onCancel(id)}
            className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
            title="Cancel generation"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-foreground mb-1 line-clamp-2 leading-tight">
          {title || 'Processing video...'}
        </h3>

        {/* Channel and URL */}
        <div className="text-sm text-muted-foreground mb-2">
          {channelName ? (
            <p>{channelName}</p>
          ) : (
            <p className="truncate text-xs">
              {youtubeUrl.replace('https://', '').replace('www.', '')}
            </p>
          )}
        </div>

        {/* Generating Animation */}
        {(status === 'processing' || status === 'queued') && (
          <div className="mb-3 space-y-2 text-sm text-accent">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{status === 'processing' ? 'Generating...' : 'Queued for processing'}</span>
            </div>
            {status === 'processing' && (
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {duration && (
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{duration}</span>
          </div>
        )}

        {/* Status and time */}
        <div className="flex items-center justify-between text-xs">
          <span className={getStatusColor()}>
            {getStatusText()}
          </span>
          <span className="text-muted-foreground">
            {formatDate(createdAt)}
          </span>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-600 dark:text-red-400">
            {errorMessage}
          </div>
        )}
      </div>
    </motion.div>
  );
}
