import {
  TranscriptUnavailableError,
  TranscriptRateLimitError,
  TranscriptServiceError,
  TranscriptTimeoutError,
  InvalidURLError,
} from './errors/ApiError';

export interface TranscriptResult {
  text: string;
  videoId: string;
  segments: Array<{
    text: string;
    offset: number;
    duration: number;
  }>;
}

/**
 * Extract YouTube transcript using Apify Actor
 *
 * Uses pintostudio/youtube-transcript-scraper actor to bypass YouTube's IP blocking
 * Cost: $7 per 1,000 transcripts (~$0.007 per video)
 * Success rate: >99%
 */
export async function getYouTubeTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  console.log('📜 [TRANSCRIPT] Starting transcript extraction via Apify...');
  console.log(`📜 [TRANSCRIPT] URL: ${youtubeUrl}`);

  try {
    // Extract video ID from URL
    const videoId = extractVideoId(youtubeUrl);
    console.log(`📜 [TRANSCRIPT] Video ID extracted: ${videoId}`);

    // Get Apify API token
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      throw new TranscriptServiceError('APIFY_API_TOKEN environment variable is not set');
    }

    // Start Apify actor run
    console.log('🚀 [APIFY] Starting actor run...');
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/pintostudio~youtube-transcript-scraper/runs?token=${apifyToken}&waitForFinish=45`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: youtubeUrl,
        }),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error(`❌ [APIFY] Actor run failed: ${runResponse.status} - ${errorText}`);

      // Check for rate limit
      if (runResponse.status === 429) {
        throw new TranscriptRateLimitError();
      }

      // Check for timeout
      if (runResponse.status === 408 || runResponse.status === 504) {
        throw new TranscriptTimeoutError();
      }

      throw new TranscriptServiceError(`Apify actor run failed: ${runResponse.status}`);
    }

    const runData = await runResponse.json();
    console.log(`✅ [APIFY] Actor run completed: ${runData.data.id}`);

    // Get dataset ID from run
    const datasetId = runData.data.defaultDatasetId;
    if (!datasetId) {
      throw new TranscriptServiceError('No dataset ID returned from Apify actor');
    }

    // Fetch transcript data from dataset
    console.log(`📥 [APIFY] Fetching transcript data from dataset: ${datasetId}`);
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
    );

    if (!datasetResponse.ok) {
      const errorText = await datasetResponse.text();
      console.error(`❌ [APIFY] Dataset fetch failed: ${datasetResponse.status} - ${errorText}`);

      // Check for rate limit
      if (datasetResponse.status === 429) {
        throw new TranscriptRateLimitError();
      }

      throw new TranscriptServiceError(`Failed to fetch transcript dataset: ${datasetResponse.status}`);
    }

    const datasetItems = await datasetResponse.json();

    if (!datasetItems || datasetItems.length === 0) {
      throw new TranscriptUnavailableError();
    }

    // Extract data array from first item
    const transcriptData = datasetItems[0];
    const transcriptSegments = transcriptData.data;

    if (!transcriptSegments || !Array.isArray(transcriptSegments)) {
      throw new TranscriptServiceError('Invalid transcript format returned from Apify');
    }

    console.log(`📜 [TRANSCRIPT] Received ${transcriptSegments.length} transcript segments`);

    // Check for empty transcript
    if (transcriptSegments.length === 0) {
      throw new TranscriptUnavailableError();
    }

    // Transform Apify format to our TranscriptResult format
    const segments = transcriptSegments.map((segment: { text: string; start: string; dur: string }) => ({
      text: segment.text,
      offset: parseFloat(segment.start), // Convert string to number (seconds)
      duration: parseFloat(segment.dur), // Convert string to number (seconds)
    }));

    // Combine into continuous text
    const text = segments.map((segment) => segment.text).join(' ');
    console.log(`📜 [TRANSCRIPT] Combined text length: ${text.length} characters`);

    // Additional check for empty text
    if (!text || text.trim().length === 0) {
      throw new TranscriptUnavailableError();
    }

    console.log('✅ [TRANSCRIPT] Transcript extraction completed successfully via Apify');
    return {
      text,
      videoId,
      segments,
    };
  } catch (error) {
    console.error('❌ [TRANSCRIPT] Extraction failed via Apify:', error);

    // If it's already one of our custom errors, re-throw it
    if (error instanceof TranscriptUnavailableError ||
        error instanceof TranscriptRateLimitError ||
        error instanceof TranscriptServiceError ||
        error instanceof TranscriptTimeoutError) {
      throw error;
    }

    // Check for network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ [TRANSCRIPT] Network error detected');
      throw new TranscriptServiceError('Network error while connecting to transcript service');
    }

    // For any other unexpected error, wrap in TranscriptServiceError
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [TRANSCRIPT] Unexpected error: ${errorMessage}`);
    throw new TranscriptServiceError(errorMessage);
  }
}

export function extractVideoId(url: string): string {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  if (!match) throw new InvalidURLError();
  return match[1];
}

export function isValidYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(url);
}
