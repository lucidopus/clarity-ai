/**
 * Content Viewer Registry
 *
 * Maps source types to their content viewer components.
 * The generations page uses this to render the correct "Learn" tab.
 */

import type { ComponentType } from 'react';
import type { SourceType } from '@/lib/models/Source';
import type { ContentViewerProps } from './types';
import YouTubeContentViewer from './YouTubeContentViewer';
import LiveLectureContentViewer from './LiveLectureContentViewer';
import DocumentContentViewer from './DocumentContentViewer';
import TextContentViewer from './TextContentViewer';
import AudioContentViewer from './AudioContentViewer';

const viewers: Partial<Record<SourceType, ComponentType<ContentViewerProps>>> = {
  youtube: YouTubeContentViewer,
  live_lecture: LiveLectureContentViewer,
  document: DocumentContentViewer,
  text: TextContentViewer,
  audio: AudioContentViewer,
};

export function getContentViewer(sourceType: SourceType): ComponentType<ContentViewerProps> {
  const viewer = viewers[sourceType];
  if (!viewer) {
    // Fallback to text viewer for unknown source types (avoids broken YouTube embed)
    return TextContentViewer;
  }
  return viewer;
}

export type { ContentViewerProps } from './types';
