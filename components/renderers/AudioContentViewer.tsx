'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Search, Loader2, FileText, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import VideoSummaryButton from '@/components/VideoSummaryButton';
import type { ContentViewerProps } from './types';

interface Segment {
  text: string;
  startTime?: number;
  endTime?: number;
  page?: number;
}

/**
 * Audio Content Viewer
 *
 * Renders the "Learn" tab for audio sources:
 * - Custom audio player with playback controls
 * - Interactive synced transcript (click to seek, auto-scroll)
 * - Search with highlighting
 * - Two-column on desktop, stacked on mobile
 */
export default function AudioContentViewer({
  materials,
}: ContentViewerProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);

  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isManualClick = useRef(false);
  const prevActiveRef = useRef(-1);

  const sourceId = materials.video.sourceId || materials.video.videoId;
  const audioUrl = materials.sourceMeta?.fileUrl || materials.sourceMeta?.sourceUrl || '';
  const fileName = materials.sourceMeta?.fileName;

  // Fetch segments
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const res = await fetch(`/api/videos/${sourceId}/segments`);
        if (res.ok) {
          const data = await res.json();
          setSegments(data.segments || []);
          setWordCount(data.wordCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch audio segments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSegments();
  }, [sourceId]);

  // Track audio time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Auto-select segment based on playback time
  useEffect(() => {
    if (isManualClick.current) {
      isManualClick.current = false;
      return;
    }

    const idx = segments.findIndex((seg, i) => {
      const start = seg.startTime ?? 0;
      const end = seg.endTime ?? (segments[i + 1]?.startTime ?? Infinity);
      return currentTime >= start && currentTime < end;
    });

    if (idx !== -1 && idx !== prevActiveRef.current) {
      prevActiveRef.current = idx;
      setActiveSegmentIndex(idx);

      if (autoScrollEnabled && segmentRefs.current[idx]) {
        segmentRefs.current[idx]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentTime, segments, autoScrollEnabled]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (!isPlaying) {
        audioRef.current.play();
      }
    }
  }, [isPlaying]);

  const handleSegmentClick = useCallback((segIndex: number) => {
    const seg = segments[segIndex];
    if (seg.startTime != null) {
      isManualClick.current = true;
      setActiveSegmentIndex(segIndex);
      handleSeek(seg.startTime);
    }
  }, [segments, handleSeek]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
  }, [isPlaying]);

  const skip = useCallback((delta: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
    }
  }, [duration]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    handleSeek(ratio * duration);
  }, [duration, handleSeek]);

  const highlightText = useCallback((text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800/60 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, []);

  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter(seg => seg.text.toLowerCase().includes(q));
  }, [segments, searchQuery]);

  const hasTimestamps = segments.some(s => s.startTime != null);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Button */}
      {materials.summary && (
        <div className="shrink-0">
          <VideoSummaryButton
            summary={materials.summary}
            videoTitle={materials.video.title}
          />
        </div>
      )}

      {/* Hidden audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} muted={isMuted} preload="metadata" />}

      {/* Two-column layout: Audio Player (left) + Transcript (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:items-start">
        {/* Left: Audio Player + Info + Notes */}
        <div className="space-y-4 lg:sticky lg:top-6">
          {/* Audio Info Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{materials.video.title}</h2>
              <p className="text-xs text-muted-foreground">
                {fileName ? `Audio · ${fileName}` : 'Audio'}
                {materials.video.createdAt && (
                  <> &middot; {new Date(materials.video.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}</>
                )}
                {duration > 0 && <> &middot; {formatTime(duration)}</>}
              </p>
            </div>
            {wordCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground bg-card-bg border border-border rounded-lg shrink-0">
                <FileText className="w-3 h-3" />
                {wordCount.toLocaleString()} words
              </span>
            )}
          </motion.div>

          {/* Audio Player Card */}
          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card-bg border border-border rounded-xl p-4"
            >
              {/* Progress Bar */}
              <div
                className="w-full h-2 bg-border rounded-full cursor-pointer mb-4 group"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-purple-500 rounded-full relative transition-all"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground w-12">
                  {formatTime(currentTime)}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => skip(-10)}
                    className="p-2 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Skip back 10s"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="p-3 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-colors cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <button
                    onClick={() => skip(10)}
                    className="p-2 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Skip forward 10s"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Right: Transcript */}
        <div className="space-y-3">
          {/* Search + Auto-scroll */}
          {segments.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex gap-3"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transcript..."
                  className="w-full pl-10 pr-4 py-2.5 bg-card-bg border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 transition-all"
                />
              </div>
              {hasTimestamps && (
                <div className="flex items-center gap-2 px-3 py-2 bg-card-bg border border-border rounded-xl shrink-0">
                  <span className="text-xs font-medium text-muted-foreground">Auto-scroll</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={autoScrollEnabled}
                      onChange={() => setAutoScrollEnabled(!autoScrollEnabled)}
                    />
                    <div className="w-8 h-4.5 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-px after:left-px after:bg-white after:border-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent" />
                  </label>
                </div>
              )}
            </motion.div>
          )}

          {/* Transcript Segments */}
          {segments.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-themed rounded-xl border border-border bg-card-bg"
            >
              <AnimatePresence mode="wait">
                {filteredSegments.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No matches found for &ldquo;{searchQuery}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div>
                    {filteredSegments.map((seg, filteredIdx) => {
                      const originalIdx = segments.indexOf(seg);
                      const isActive = activeSegmentIndex === originalIdx;
                      const hasTs = seg.startTime != null;

                      return (
                        <div
                          key={filteredIdx}
                          ref={(el) => { segmentRefs.current[originalIdx] = el; }}
                          onClick={() => hasTs && handleSegmentClick(originalIdx)}
                          className={`flex gap-3 px-4 py-3 border-b border-border/30 last:border-b-0 transition-colors ${
                            hasTs ? 'cursor-pointer' : ''
                          } ${
                            isActive
                              ? 'bg-purple-500/[0.08]'
                              : hasTs
                              ? 'hover:bg-white/[0.02]'
                              : ''
                          }`}
                        >
                          {hasTs && (
                            <span className={`text-[11px] font-mono w-10 shrink-0 pt-0.5 text-right select-none ${
                              isActive ? 'text-purple-400' : 'text-muted-foreground/50'
                            }`}>
                              {formatTime(seg.startTime!)}
                            </span>
                          )}
                          <p className={`text-[13px] leading-relaxed flex-1 ${
                            isActive ? 'text-foreground/90' : 'text-foreground/60'
                          }`}>
                            {searchQuery ? highlightText(seg.text, searchQuery) : seg.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <Headphones className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">No transcript available</h3>
              <p className="text-sm text-muted-foreground">
                The transcript will appear here after processing.
              </p>
            </div>
          )}

          {/* Stats */}
          {segments.length > 0 && !searchQuery && (
            <p className="text-xs text-muted-foreground text-center">
              {segments.length} segments · {wordCount.toLocaleString()} words
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
