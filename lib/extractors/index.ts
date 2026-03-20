import type { SourceType } from '@/lib/models/Source';
import type { ExtractorFunction } from './types';
import { extractYouTube } from './youtube';
import { extractDocument } from './document';
import { extractAudio } from './audio';
import { extractMedia } from './media';
import { extractText } from './text';

export type { ExtractedContent, ExtractorInput, ExtractedSegment, ExtractionError, ExtractorFunction } from './types';

const extractors: Record<SourceType, ExtractorFunction> = {
  youtube: extractYouTube,
  document: extractDocument,
  audio: extractAudio,
  media: extractMedia,
  text: extractText,
};

/**
 * Factory: returns the correct extractor function for a given source type.
 *
 * Usage:
 *   const extractor = getExtractor('youtube');
 *   const result = await extractor({ sourceType: 'youtube', sourceUrl: '...' });
 */
export function getExtractor(sourceType: SourceType): ExtractorFunction {
  const extractor = extractors[sourceType];
  if (!extractor) {
    throw new Error(`Unknown source type: ${sourceType}. Supported types: ${Object.keys(extractors).join(', ')}`);
  }
  return extractor;
}
