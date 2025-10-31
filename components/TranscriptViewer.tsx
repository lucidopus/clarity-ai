'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

interface TranscriptSegment {
  text: string;
  start: number; // in seconds
  duration: number; // in seconds
}

interface TranscriptViewerProps {
  transcript: TranscriptSegment[];
  videoId: string;
}

export default function TranscriptViewer({ transcript, videoId }: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  if (!transcript || transcript.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
    );
  }

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

  const handleTimestampClick = (timestamp: number, index: number) => {
    setSelectedSegment(index);
    // TODO: Implement video seeking functionality
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search Bar */}
      <div className="mb-8">
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
              Found {filteredSegments.length} segment{filteredSegments.length !== 1 ? 's' : ''} containing "{searchQuery}"
            </p>
            <Button onClick={clearSearch} variant="ghost" size="sm">
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="bg-card-bg border-2 border-border rounded-2xl p-6 max-h-[600px] overflow-y-auto">
        <AnimatePresence mode="wait">
          {filteredSegments.length === 0 ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
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
              className="space-y-4"
            >
              {filteredSegments.map((segment, index) => {
                const originalIndex = transcript.indexOf(segment);
                const isSelected = selectedSegment === originalIndex;

                return (
                  <motion.div
                    key={`${segment.start}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-accent bg-accent/5'
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
                        className={`flex-shrink-0 px-3 py-1 text-xs font-mono rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-accent bg-accent text-white'
                            : 'border-border bg-card-bg text-muted-foreground hover:border-accent hover:text-accent'
                        }`}
                      >
                        {formatTimestamp(segment.start)}
                      </button>
                      <div className="flex-1 leading-relaxed text-foreground">
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
        <div className="mt-6 text-sm text-muted-foreground text-center">
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
    </div>
  );
}