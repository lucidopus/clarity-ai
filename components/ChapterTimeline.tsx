'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Play, Clock } from 'lucide-react';

interface Chapter {
  id: string;
  timeSeconds: number;
  topic: string;
  description: string;
}

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(time: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
}

interface ChapterTimelineProps {
  chapters: Chapter[];
  currentTime: number;
  playerRef: React.MutableRefObject<YTPlayer | null>;
}

type ChapterState = 'completed' | 'in-progress' | 'upcoming';

export default function ChapterTimeline({
  chapters,
  currentTime,
  playerRef
}: ChapterTimelineProps) {
  const [hoveredChapter, setHoveredChapter] = useState<string | null>(null);

  // Get video duration from player
  const duration = useMemo(() => {
    if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
      try {
        return playerRef.current.getDuration();
      } catch {
        return 0;
      }
    }
    return 0;
  }, [playerRef]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine chapter states based on current video time
  const chaptersWithStates = useMemo(() => {
    return chapters.map((chapter, index) => {
      const nextChapter = chapters[index + 1];
      const chapterEnd = nextChapter ? nextChapter.timeSeconds : duration;

      let state: ChapterState;
      if (currentTime < chapter.timeSeconds) {
        state = 'upcoming';
      } else if (currentTime >= chapter.timeSeconds && currentTime < chapterEnd) {
        state = 'in-progress';
      } else {
        state = 'completed';
      }

      // Calculate position percentage on the timeline
      const position = duration > 0 ? (chapter.timeSeconds / duration) * 100 : 0;

      return {
        ...chapter,
        state,
        position,
        index: index + 1,
        chapterEnd
      };
    });
  }, [chapters, currentTime, duration]);

  const handleChapterClick = (chapter: Chapter) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(chapter.timeSeconds, true);
        playerRef.current.playVideo();
      } catch (error) {
        console.error('Error seeking to chapter:', error);
      }
    }
  };

  const getStateIcon = (state: ChapterState) => {
    switch (state) {
      case 'completed':
        return <Check className="w-4 h-4" />;
      case 'in-progress':
        return <Play className="w-4 h-4 fill-current" />;
      case 'upcoming':
        return <Clock className="w-4 h-4" />;
    }
  };

  // Calculate current progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Video Chapters</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{Math.round((chaptersWithStates.filter(ch => ch.state === 'completed').length / chapters.length) * 100)}% watched</span>
          <span>•</span>
          <span>{chapters.length} chapters</span>
        </div>
      </div>

      {/* Interactive Timeline */}
      <div className="space-y-3">
        {chaptersWithStates.map((chapter, index) => {
          const isHovered = hoveredChapter === chapter.id;
          const isInProgress = chapter.state === 'in-progress';
          const isCompleted = chapter.state === 'completed';

          return (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => handleChapterClick(chapter)}
                onMouseEnter={() => setHoveredChapter(chapter.id)}
                onMouseLeave={() => setHoveredChapter(null)}
                className={`
                  w-full text-left p-4 rounded-xl border transition-all duration-200
                  ${
                    isInProgress
                      ? 'bg-accent/10 border-accent shadow-lg shadow-accent/10'
                      : isCompleted
                      ? 'bg-accent/5 border-accent/30'
                      : 'bg-card-bg border-border hover:border-accent/50 hover:shadow-md'
                  }
                  ${isHovered ? 'scale-[1.02]' : 'scale-100'}
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Chapter Number & Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className={`
                        w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm
                        ${
                          isInProgress
                            ? 'bg-accent text-white'
                            : isCompleted
                            ? 'bg-accent/50 text-white'
                            : 'bg-background text-muted-foreground'
                        }
                      `}
                    >
                      {isInProgress || isCompleted ? (
                        getStateIcon(chapter.state)
                      ) : (
                        <span>{chapter.index}</span>
                      )}
                    </div>
                  </div>

                  {/* Chapter Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4
                        className={`
                          font-semibold text-sm
                          ${
                            isInProgress || isCompleted
                              ? 'text-accent'
                              : 'text-foreground'
                          }
                        `}
                      >
                        {chapter.topic}
                      </h4>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {formatTime(chapter.timeSeconds)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {chapter.description}
                    </p>

                    {/* Progress bar for current chapter */}
                    {isInProgress && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 pt-3 border-t border-accent/20"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-accent">Playing now</span>
                          <span className="text-xs text-accent font-mono">
                            {formatTime(currentTime - chapter.timeSeconds)} / {formatTime(chapter.chapterEnd - chapter.timeSeconds)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-background rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-accent rounded-full"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${((currentTime - chapter.timeSeconds) / (chapter.chapterEnd - chapter.timeSeconds)) * 100}%`
                            }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Overall Progress */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Overall Progress</span>
          <span className="text-xs font-medium text-accent">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', damping: 30, stiffness: 100 }}
          />
        </div>
      </div>
    </div>
  );
}
