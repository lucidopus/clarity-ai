import { getYouTubeTranscript, extractVideoId, isValidYouTubeUrl } from '@/lib/transcript';
import type { ExtractorInput, ExtractedContent } from './types';

/**
 * YouTube extractor — wraps existing Apify-based transcript extraction.
 *
 * Input: { sourceUrl: "https://youtube.com/watch?v=..." }
 * Output: ExtractedContent with text, segments (timestamped), and YouTube metadata
 */
export async function extractYouTube(input: ExtractorInput): Promise<ExtractedContent> {
  const { sourceUrl } = input;

  if (!sourceUrl) {
    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: 'YouTube URL is required',
        recoverable: false,
      },
    };
  }

  if (!isValidYouTubeUrl(sourceUrl)) {
    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: 'Invalid YouTube URL',
        recoverable: false,
      },
    };
  }

  try {
    const videoId = extractVideoId(sourceUrl);
    const result = await getYouTubeTranscript(sourceUrl);

    // Transform segments: offset/duration → startTime/endTime
    const segments = result.segments.map((seg) => ({
      text: seg.text,
      startTime: seg.offset,
      endTime: seg.offset + seg.duration,
    }));

    const wordCount = result.text.split(/\s+/).filter(Boolean).length;

    // Calculate duration from last segment
    let duration: number | undefined;
    if (segments.length > 0) {
      const lastSeg = segments[segments.length - 1];
      duration = lastSeg.endTime;
    }

    return {
      success: true,
      text: result.text,
      title: `Video ${videoId}`,
      metadata: {
        sourceType: 'youtube',
        sourceId: videoId,
        duration,
        language: 'en',
        wordCount,
      },
      segments,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown extraction error';
    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message,
        recoverable: true,
      },
    };
  }
}
