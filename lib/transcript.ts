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
      throw new Error('APIFY_API_TOKEN environment variable is not set');
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
      throw new Error(`Apify actor run failed: ${runResponse.status}`);
    }

    const runData = await runResponse.json();
    console.log(`✅ [APIFY] Actor run completed: ${runData.data.id}`);

    // Get dataset ID from run
    const datasetId = runData.data.defaultDatasetId;
    if (!datasetId) {
      throw new Error('No dataset ID returned from Apify actor');
    }

    // Fetch transcript data from dataset
    console.log(`📥 [APIFY] Fetching transcript data from dataset: ${datasetId}`);
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
    );

    if (!datasetResponse.ok) {
      const errorText = await datasetResponse.text();
      console.error(`❌ [APIFY] Dataset fetch failed: ${datasetResponse.status} - ${errorText}`);
      throw new Error(`Failed to fetch transcript dataset: ${datasetResponse.status}`);
    }

    const datasetItems = await datasetResponse.json();

    if (!datasetItems || datasetItems.length === 0) {
      throw new Error('No transcript data returned from Apify');
    }

    // Extract data array from first item
    const transcriptData = datasetItems[0];
    const transcriptSegments = transcriptData.data;

    if (!transcriptSegments || !Array.isArray(transcriptSegments)) {
      throw new Error('Invalid transcript format returned from Apify');
    }

    console.log(`📜 [TRANSCRIPT] Received ${transcriptSegments.length} transcript segments`);

    // Transform Apify format to our TranscriptResult format
    const segments = transcriptSegments.map((segment: any) => ({
      text: segment.text,
      offset: parseFloat(segment.start), // Convert string to number (seconds)
      duration: parseFloat(segment.dur), // Convert string to number (seconds)
    }));

    // Combine into continuous text
    const text = segments.map((segment) => segment.text).join(' ');
    console.log(`📜 [TRANSCRIPT] Combined text length: ${text.length} characters`);

    console.log('✅ [TRANSCRIPT] Transcript extraction completed successfully via Apify');
    return {
      text,
      videoId,
      segments,
    };
  } catch (error) {
    console.error('❌ [TRANSCRIPT] Extraction failed via Apify:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [TRANSCRIPT] Error details: ${errorMessage}`);

    // Throw descriptive error for user
    throw new Error(
      `Failed to extract transcript. The video may not have captions available, or there was an issue with the transcript service. Please try again in a few moments. (${errorMessage})`
    );
  }
}

export function extractVideoId(url: string): string {
  // Extract from: https://youtu.be/ABC123 or https://youtube.com/watch?v=ABC123
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  if (!match) throw new Error('Invalid YouTube URL');
  return match[1];
}

export function isValidYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(url);
}
