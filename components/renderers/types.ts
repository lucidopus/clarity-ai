/**
 * Content Viewer Props
 *
 * Shared interface for all source-type-specific content viewers.
 * Each renderer receives the full materials and renders the "Learn" tab content.
 */

export interface ContentViewerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materials: any; // Narrowed per renderer (YouTubeAdaptedMaterials, etc.)
  notes: {
    generalNote: string;
    segmentNotes: Array<{
      segmentId: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
  onSaveNotes: (notes: { generalNote: string; segmentNotes: Array<{ segmentId: string; content: string; createdAt: Date; updatedAt: Date }> }) => void;
  autoplayVideos: boolean;
}
