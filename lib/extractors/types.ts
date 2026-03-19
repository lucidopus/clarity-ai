import type { SourceType } from '@/lib/models/Source';

/**
 * Segment from extracted content.
 * - YouTube/Audio: has startTime + endTime
 * - Documents: has page
 * - Media/Images: no positioning
 */
export interface ExtractedSegment {
  text: string;
  startTime?: number;
  endTime?: number;
  page?: number;
}

/**
 * Error returned when extraction fails.
 */
export interface ExtractionError {
  code: 'EXTRACTION_FAILED' | 'UNSUPPORTED_FORMAT' | 'FILE_TOO_LARGE' | 'EMPTY_CONTENT' | 'NOT_IMPLEMENTED';
  message: string;
  recoverable: boolean;
}

/**
 * Unified output from any extractor.
 * Uses a discriminated union — either success or failure, never ambiguous.
 */
export type ExtractedContent =
  | {
      success: true;
      text: string;
      title?: string;
      metadata: {
        sourceType: SourceType;
        sourceId: string;
        duration?: number;
        pageCount?: number;
        language?: string;
        fileSize?: number;
        fileName?: string;
        mimeType?: string;
        wordCount: number;
        warnings?: string[];
      };
      segments?: ExtractedSegment[];
    }
  | {
      success: false;
      error: ExtractionError;
    };

/**
 * Input to any extractor.
 */
export interface ExtractorInput {
  sourceType: SourceType;
  // YouTube
  sourceUrl?: string;
  // File uploads (document, audio, media)
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType?: string;
}

/**
 * Function signature for all extractors.
 */
export type ExtractorFunction = (input: ExtractorInput) => Promise<ExtractedContent>;
