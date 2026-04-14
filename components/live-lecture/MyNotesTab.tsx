'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, FileText, Clock, Loader2 } from 'lucide-react';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';

interface Marker {
  offsetSeconds: number;
  notePosition?: number;
  createdAt: string;
}

interface Segment {
  text: string;
  startOffset: number;
  endOffset: number;
}

interface NotesData {
  focusNotes: string;
  markers: Marker[];
  transcriptText: string;
  segments: Segment[];
  durationSeconds?: number;
}

interface MyNotesTabProps {
  sessionId: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function MyNotesTab({ sessionId }: MyNotesTabProps) {
  const [data, setData] = useState<NotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/live-lecture/${sessionId}/notes`);
        if (!res.ok) throw new Error('Failed to load notes');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(getUserFriendlyMessage(err, 'We couldn\'t load your notes. Please try again shortly.'));
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">{error || 'No notes found'}</p>
      </div>
    );
  }

  const hasNotes = data.focusNotes.trim().length > 0;
  const hasTranscript = data.transcriptText.trim().length > 0;

  // Build enhanced notes: merge student notes with AI transcript
  // Student notes shown in bright text, transcript additions in muted
  const markerPositions = new Set(
    data.markers
      .filter((m) => m.notePosition !== undefined)
      .map((m) => m.notePosition!)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-4xl mx-auto w-full"
    >
      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-foreground" />
          <span>Your notes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted-foreground/40" />
          <span>Lecture transcript</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-3 h-3 text-teal-400 fill-teal-400" />
          <span>Important markers</span>
        </div>
      </div>

      {/* Student Focus Notes */}
      {hasNotes && (
        <div className="bg-card-bg border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">Your Focus Notes</h3>
          </div>
          <div className="prose prose-sm max-w-none">
            {data.focusNotes.split('\n').map((line, i) => {
              // Check if this line position roughly matches a marker
              const charPosition = data.focusNotes
                .split('\n')
                .slice(0, i)
                .join('\n').length;
              const isMarked = markerPositions.has(charPosition) ||
                Array.from(markerPositions).some(
                  (pos) => Math.abs(pos - charPosition) < 5
                );

              return (
                <div
                  key={i}
                  className={`py-1 ${
                    isMarked
                      ? 'border-l-2 border-teal-400 pl-3 bg-teal-500/5 rounded-r'
                      : ''
                  }`}
                >
                  {isMarked && (
                    <Star className="w-3 h-3 text-teal-400 fill-teal-400 inline mr-1.5" />
                  )}
                  <span className="text-foreground">{line || '\u00A0'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Importance Markers Timeline */}
      {data.markers.length > 0 && (
        <div className="bg-card-bg border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-teal-400" />
            <h3 className="text-lg font-semibold text-foreground">
              Important Moments ({data.markers.length})
            </h3>
          </div>
          <div className="space-y-2">
            {data.markers.map((marker, i) => {
              // Find the transcript segment closest to this marker
              const segment = data.segments.find(
                (s) =>
                  marker.offsetSeconds >= s.startOffset &&
                  marker.offsetSeconds <= s.endOffset
              );

              return (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span className="text-xs font-mono text-teal-400">
                      {formatTime(marker.offsetSeconds)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {segment?.text || 'Marked as important'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Transcript */}
      {hasTranscript && (
        <div className="bg-card-bg border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Lecture Transcript</h3>
            {data.durationSeconds && (
              <span className="text-xs text-muted-foreground ml-auto">
                {formatTime(data.durationSeconds)} duration
              </span>
            )}
          </div>
          <div className="space-y-3">
            {data.segments.map((segment, i) => {
              const isMarked = data.markers.some(
                (m) =>
                  m.offsetSeconds >= segment.startOffset &&
                  m.offsetSeconds <= segment.endOffset
              );

              return (
                <div
                  key={i}
                  className={`flex gap-3 py-1.5 ${
                    isMarked
                      ? 'border-l-2 border-teal-400 pl-3 bg-teal-500/5 rounded-r'
                      : ''
                  }`}
                >
                  <span className="text-xs font-mono text-muted-foreground/60 shrink-0 mt-0.5 w-10">
                    {formatTime(segment.startOffset)}
                  </span>
                  <p className="text-sm text-muted-foreground/70">{segment.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasNotes && !hasTranscript && (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No notes yet</h3>
          <p className="text-muted-foreground text-sm">
            Notes and transcript will appear here after the lecture.
          </p>
        </div>
      )}
    </motion.div>
  );
}
