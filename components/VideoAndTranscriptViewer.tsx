'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import NotesEditor from './NotesEditor';

interface TranscriptSegment {
  text: string;
  start: number; // in seconds
  duration: number; // in seconds
}

interface VideoAndTranscriptViewerProps {
  transcript: TranscriptSegment[];
  videoId: string;
  youtubeUrl: string;
}

// Extend Window interface for YouTube IFrame API
interface YTPlayer {
  getCurrentTime(): number;
  seekTo(time: number, allowSeekAhead: boolean): void;
  playVideo(): void;
}

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement, options: {
        events?: {
          onReady?: () => void;
        };
      }) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function VideoAndTranscriptViewer({
  transcript,
  videoId,
  youtubeUrl
}: VideoAndTranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isManualClick = useRef(false);
  const prevSelectedRef = useRef<number | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    // Only load if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize YouTube player and track current time
  useEffect(() => {
    const initPlayer = () => {
      if (window.YT && window.YT.Player && iframeRef.current) {
        playerRef.current = new window.YT.Player(iframeRef.current, {
          events: {
            onReady: () => {
              // Start tracking video time
              const interval = setInterval(() => {
                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                   try {
                     const time = playerRef.current.getCurrentTime();
                     setCurrentTime(time);
                   } catch {
                     // Ignore errors when player is not ready
                   }
                }
              }, 500); // Update every 500ms

              return () => clearInterval(interval);
            }
          }
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, []);

  // Auto-select segment based on current playback time
  useEffect(() => {
    if (isManualClick.current) {
      // Don't auto-select if user just clicked
      isManualClick.current = false;
      return;
    }

    // Find the segment that corresponds to current time
    const activeIndex = transcript.findIndex((segment, index) => {
      const nextSegment = transcript[index + 1];
      const segmentEnd = nextSegment ? nextSegment.start : segment.start + segment.duration;
      return currentTime >= segment.start && currentTime < segmentEnd;
    });

    if (activeIndex !== -1 && activeIndex !== prevSelectedRef.current) {
      prevSelectedRef.current = activeIndex;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedSegment(activeIndex);

      // Scroll to active segment with smooth animation
      if (segmentRefs.current[activeIndex]) {
        segmentRefs.current[activeIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [currentTime, transcript]);

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return transcript;

    return transcript.filter(segment =>
      segment.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transcript, searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Convert YouTube URL to embed URL
  const getEmbedUrl = (url: string): string => {
    try {
      // Extract video ID from various YouTube URL formats
      const urlObj = new URL(url);
      let videoId = '';

      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v') || '';
      }

      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    } catch {
      return '';
    }
  };

  const handleTimestampClick = (timestamp: number, index: number) => {
    isManualClick.current = true; // Prevent auto-selection from overriding user click
    setSelectedSegment(index);

    // Use YouTube Player API to seek if available
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(timestamp, true);
        playerRef.current.playVideo();
      } catch (e) {
        console.error('Error seeking video:', e);
      }
    }
  };

  const transcriptEmpty = !transcript || transcript.length === 0;
  const embedUrl = getEmbedUrl(youtubeUrl);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Video and Transcript Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
        {/* Video Player */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <div className="bg-card-bg border-2 border-border rounded-2xl p-4">
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              {embedUrl ? (
                <iframe
                  ref={iframeRef}
                  id="youtube-player"
                  src={embedUrl}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <p>Unable to load video</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <NotesEditor videoId={videoId} />
        </div>

        {/* Transcript Section */}
        <div className="space-y-4">
          {transcriptEmpty ? (
            <div className="bg-card-bg border-2 border-border rounded-2xl p-8 h-[500px] lg:h-[600px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📝</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No transcript yet</h3>
                <p className="text-muted-foreground">
                  Transcript will appear here once generated.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in transcript..."
                    className="w-full px-4 py-3 pl-12 bg-card-bg border-2 border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                  </div>
                </div>
                {searchQuery && (
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm text-muted-foreground">
                      Found {filteredSegments.length} segment{filteredSegments.length !== 1 ? 's' : ''} containing &quot;{searchQuery}&quot;
                    </p>
                    <Button onClick={clearSearch} variant="ghost" size="sm">
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="bg-card-bg border-2 border-border rounded-2xl p-4 h-[500px] lg:h-[600px] overflow-y-auto scroll-smooth">
                <AnimatePresence mode="wait">
                  {filteredSegments.length === 0 ? (
                    <motion.div
                      key="no-results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center h-full"
                    >
                      <p className="text-muted-foreground text-lg">
                        {searchQuery ? 'No segments found matching your search.' : 'No transcript available.'}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="transcript"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      {filteredSegments.map((segment, index) => {
                        const originalIndex = transcript.indexOf(segment);
                        const isSelected = selectedSegment === originalIndex;

                        return (
                          <motion.div
                            key={`${segment.start}-${index}`}
                            ref={(el) => { segmentRefs.current[originalIndex] = el; }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'border-accent bg-accent/5 shadow-lg shadow-accent/10'
                                : 'border-border hover:border-accent/50 bg-background/50'
                            }`}
                            onClick={() => handleTimestampClick(segment.start, originalIndex)}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTimestampClick(segment.start, originalIndex);
                                }}
                                className={`shrink-0 px-2.5 py-1 text-xs font-mono rounded-lg border transition-colors ${
                                  isSelected
                                    ? 'border-accent bg-accent text-white'
                                    : 'border-border bg-card-bg text-muted-foreground hover:border-accent hover:text-accent'
                                }`}
                              >
                                {formatTimestamp(segment.start)}
                              </button>
                              <div className="flex-1 leading-relaxed text-sm text-foreground">
                                {highlightText(segment.text, searchQuery)}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Stats */}
              {transcript.length > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                  {filteredSegments.length === transcript.length ? (
                    <>
                      Showing all {transcript.length} segments
                      {transcript.length > 0 && (
                        <span className="ml-2">
                          • Total duration: {formatTimestamp(
                            transcript.reduce((total, seg) => total + seg.duration, 0)
                          )}
                        </span>
                      )}
                    </>
                  ) : (
                    `Showing ${filteredSegments.length} of ${transcript.length} segments`
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
