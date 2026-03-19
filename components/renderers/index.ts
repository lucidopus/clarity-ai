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

const viewers: Partial<Record<SourceType, ComponentType<ContentViewerProps>>> = {
  youtube: YouTubeContentViewer,
  // document: DocumentContentViewer, // future
  // audio: AudioContentViewer,       // future
  // media: MediaContentViewer,       // future
};

export function getContentViewer(sourceType: SourceType): ComponentType<ContentViewerProps> {
  const viewer = viewers[sourceType];
  if (!viewer) {
    // Fallback to YouTube viewer for unknown source types
    return YouTubeContentViewer;
  }
  return viewer;
}

export type { ContentViewerProps } from './types';
