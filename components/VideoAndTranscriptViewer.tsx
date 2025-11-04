'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Trash2 } from 'lucide-react';
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
  notes: {
    generalNote: string;
    segmentNotes: Array<{
      segmentId: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
  onSaveNotes: (notes: {
    generalNote: string;
    segmentNotes: Array<{
      segmentId: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }) => Promise<void>;
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
  youtubeUrl,
  notes,
  onSaveNotes
}: VideoAndTranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [editingSegment, setEditingSegment] = useState<number | null>(null);
  const [activeSegmentNote, setActiveSegmentNote] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isManualClick = useRef(false);
  const prevSelectedRef = useRef<number | null>(null);

  const getActiveSegmentNote = useCallback((segmentIndex: number) => {
    const segmentId = `segment-${segmentIndex}`;
    const segmentNote = notes.segmentNotes.find(note => note.segmentId === segmentId);
    return segmentNote?.content || '';
  }, [notes.segmentNotes]);

  const deleteActiveSegmentNote = useCallback(async () => {
    if (selectedSegment === null) return;

    setIsDeleting(true);
    try {
      const segmentId = `segment-${selectedSegment}`;
      const updatedNotes = {
        ...notes,
        segmentNotes: notes.segmentNotes.filter(note => note.segmentId !== segmentId)
      };

      await onSaveNotes(updatedNotes);
      setActiveSegmentNote('');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting segment note:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedSegment, notes, onSaveNotes]);

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
      setSelectedSegment(activeIndex);

      // Scroll to active segment with smooth animation
      if (segmentRefs.current[activeIndex]) {
        segmentRefs.current[activeIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }

      // Get note for active segment
      setActiveSegmentNote(getActiveSegmentNote(activeIndex));
    }
  }, [currentTime, transcript, getActiveSegmentNote]);

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
          <NotesEditor
            videoId={videoId}
            notes={notes}
            onSaveNotes={onSaveNotes}
          />
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
                        const isEditing = editingSegment === originalIndex;

                        return (
                          <motion.div
                            key={`${segment.start}-${index}`}
                            ref={(el) => { segmentRefs.current[originalIndex] = el; }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`transition-all duration-200 ${
                              isEditing
                                ? 'border-accent bg-accent/5 shadow-lg shadow-accent/10'
                                : isSelected
                                ? 'border-accent bg-accent/5 shadow-lg shadow-accent/10'
                                : 'border-border hover:border-accent/50 bg-background/50'
                            }`}
                          >
                            <div className="p-3 rounded-xl border-2 cursor-pointer" onClick={() => handleTimestampClick(segment.start, originalIndex)}>
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSegment(isEditing ? null : originalIndex);
                                  }}
                                  className={`shrink-0 p-2 cursor-pointer rounded-lg transition-colors ${
                                    isEditing
                                      ? 'bg-accent text-white'
                                      : 'hover:bg-background border border-border text-muted-foreground hover:text-accent'
                                  }`}
                                  title="Add notes for this segment"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {/* Inline Notes Editor */}
                            <AnimatePresence>
                              {isEditing && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3">
                                     <NotesEditor
                                       videoId={videoId}
                                       segmentId={`segment-${originalIndex}`}
                                       notes={notes}
                                       onSaveNotes={onSaveNotes}
                                     />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
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

           {/* Active Segment Note Card */}
           <AnimatePresence>
             {selectedSegment !== null && activeSegmentNote.trim() && (
               <motion.div
                 initial={{ opacity: 0, x: 300 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 300 }}
                 transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                 className="fixed top-1/2 right-6 transform -translate-y-1/2 z-50"
               >
                 <div className="bg-card-bg border-2 border-accent rounded-2xl p-4 max-w-sm shadow-xl">
                   <div className="flex items-center justify-between gap-2 mb-3">
                     <div className="flex items-center gap-2">
                       <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                       </svg>
                       <h4 className="text-sm font-semibold text-foreground">Segment Notes</h4>
                     </div>
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         setShowDeleteConfirm(true);
                       }}
                       disabled={isDeleting}
                       className="p-1.5 cursor-pointer rounded-lg text-red-500 hover:bg-red-500/10 border border-border hover:border-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                       title="Delete this segment note"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Custom styling for markdown elements
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
                          u: ({ children }) => <span className="underline">{children}</span>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="ml-2">{children}</li>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-2 first:mt-0">{children}</h3>,
                          code: ({ children }) => (
                            <code className="bg-muted/30 px-1 py-0.5 rounded text-xs font-mono text-accent">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-muted/30 p-2 rounded-lg overflow-x-auto mb-2 text-xs">
                              {children}
                            </pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-accent pl-3 italic text-muted-foreground mb-2">
                              {children}
                            </blockquote>
                          ),
                          hr: () => <hr className="border-border my-2" />,
                          a: ({ children, href }) => (
                            <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {activeSegmentNote}
                      </ReactMarkdown>
                    </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
         </div>
       </div>

       {/* Delete Confirmation Modal */}
       <AnimatePresence>
         {showDeleteConfirm && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
             onClick={() => setShowDeleteConfirm(false)}
           >
             <motion.div
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               onClick={(e) => e.stopPropagation()}
               className="bg-card-bg border-2 border-border rounded-2xl p-6 max-w-md mx-4"
             >
               <div className="flex items-start gap-3 mb-4">
                 <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                   <Trash2 className="w-5 h-5 text-red-500" />
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold text-foreground mb-1">
                     Delete Segment Note?
                   </h3>
                   <p className="text-sm text-muted-foreground">
                     This will permanently delete this note. This action cannot be undone.
                   </p>
                 </div>
               </div>

               <div className="flex gap-3 justify-end">
                 <button
                   onClick={() => setShowDeleteConfirm(false)}
                   disabled={isDeleting}
                   className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={deleteActiveSegmentNote}
                   disabled={isDeleting}
                   className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                 >
                   {isDeleting ? (
                     <>
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                       Deleting...
                     </>
                   ) : (
                     <>
                       <Trash2 className="w-4 h-4" />
                       Delete
                     </>
                   )}
                 </button>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   );
 }
