'use client';

import VideoAndTranscriptViewer from '@/components/VideoAndTranscriptViewer';
import type { ContentViewerProps } from './types';

/**
 * YouTube Content Viewer
 *
 * Renders the "Learn" tab for YouTube sources:
 * - YouTube embed + interactive transcript + chapters
 * - Summary and chapter buttons rendered inline above the video
 */
export default function YouTubeContentViewer({
  materials,
  notes,
  onSaveNotes,
  autoplayVideos,
}: ContentViewerProps) {
  return (
    <VideoAndTranscriptViewer
      transcript={materials.transcript}
      videoId={materials.video.videoId}
      youtubeUrl={materials.video.youtubeUrl}
      chapters={materials.chapters}
      videoTitle={materials.video.title}
      summary={materials.summary}
      notes={notes}
      onSaveNotes={onSaveNotes}
      autoplayVideos={autoplayVideos}
    />
  );
}
