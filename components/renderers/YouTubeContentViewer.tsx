'use client';

import VideoAndTranscriptViewer from '@/components/VideoAndTranscriptViewer';
import VideoSummaryButton from '@/components/VideoSummaryButton';
import type { ContentViewerProps } from './types';

/**
 * YouTube Content Viewer
 *
 * Renders the "Learn" tab for YouTube sources:
 * - Video summary button
 * - YouTube embed + interactive transcript + chapters
 */
export default function YouTubeContentViewer({
  materials,
  notes,
  onSaveNotes,
  autoplayVideos,
}: ContentViewerProps) {
  return (
    <div className="flex flex-col gap-6">
      {materials.summary && (
        <div className="shrink-0">
          <VideoSummaryButton
            summary={materials.summary}
            videoTitle={materials.video.title}
          />
        </div>
      )}
      <div className="flex-1 min-h-0">
        <VideoAndTranscriptViewer
          transcript={materials.transcript}
          videoId={materials.video.videoId}
          youtubeUrl={materials.video.youtubeUrl}
          chapters={materials.chapters}
          videoTitle={materials.video.title}
          notes={notes}
          onSaveNotes={onSaveNotes}
          autoplayVideos={autoplayVideos}
        />
      </div>
    </div>
  );
}
