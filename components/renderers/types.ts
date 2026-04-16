/**
 * Content Viewer Props
 *
 * Shared interface for all source-type-specific content viewers.
 * Each renderer receives the full materials and renders the "Learn" tab content.
 */

import type { PageConfidence } from '@/lib/types/notes';

export interface SegmentNote {
  segmentId: string;
  content: string;
  /** Optional per-page confidence signal used by the document viewer. */
  confidence?: PageConfidence;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentViewerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materials: any; // Narrowed per renderer (YouTubeAdaptedMaterials, etc.)
  notes: {
    generalNote: string;
    segmentNotes: SegmentNote[];
  };
  onSaveNotes: (notes: { generalNote: string; segmentNotes: SegmentNote[] }) => Promise<void>;
  autoplayVideos: boolean;
}
