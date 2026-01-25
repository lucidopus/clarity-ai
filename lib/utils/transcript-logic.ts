/**
 * Pure utility functions for transcript processing.
 * Separated to allow unit testing without loading heavy dependencies.
 */

import type { ITranscriptSegment } from '../models/Video';

/**
 * Extract transcript snippet (first N seconds)
 * 
 * @param segments - Transcript segments with offset and duration
 * @param maxDurationSeconds - Maximum duration to extract (default: 120 seconds = 2 minutes)
 * @returns Concatenated text from first N seconds
 */
export function extractTranscriptSnippet(
  segments: ITranscriptSegment[],
  maxDurationSeconds: number = 120
): string {
  if (!segments || segments.length === 0) {
    return '';
  }

  const snippetSegments = segments.filter(seg => seg.offset < maxDurationSeconds);
  return snippetSegments.map(seg => seg.text).join(' ');
}
