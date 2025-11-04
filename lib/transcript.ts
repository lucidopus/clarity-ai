import { fetchTranscript } from 'youtube-transcript-plus';
import { SocksProxyAgent } from 'socks-proxy-agent';

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
 * Creates a custom fetch function that routes requests through Tor proxy
 * to bypass YouTube's cloud provider IP blocking.
 *
 * Uses SOCKS5 proxy (Tor) to make requests appear from residential IPs.
 */
const createTorProxyFetch = () => {
  // Use environment variable or default to localhost Tor proxy
  const proxyUrl = process.env.TOR_PROXY_URL || 'socks5://127.0.0.1:9050';

  console.log(`🔐 [TOR] Configuring Tor proxy: ${proxyUrl}`);

  // Create SOCKS proxy agent for Tor
  const agent = new SocksProxyAgent(proxyUrl);

  return async ({ url, method = 'GET', body, headers: customHeaders }: {
    url: string;
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }) => {
    // Use standard browser headers
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...customHeaders,
    };

    console.log(`🌐 [TOR FETCH] ${method} request via Tor: ${url.substring(0, 80)}...`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        // @ts-ignore - agent works with Node.js fetch but not in types
        agent,
      });

      if (!response.ok) {
        console.error(`❌ [TOR FETCH] HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`✅ [TOR FETCH] Request successful (${response.status})`);
      return response;
    } catch (error) {
      console.error(`❌ [TOR FETCH] Request failed:`, error);
      throw error;
    }
  };
};

export async function getYouTubeTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  console.log('📜 [TRANSCRIPT] Starting transcript extraction via Tor proxy...');
  console.log(`📜 [TRANSCRIPT] URL: ${youtubeUrl}`);

  try {
    // Extract video ID from URL
    const videoId = extractVideoId(youtubeUrl);
    console.log(`📜 [TRANSCRIPT] Video ID extracted: ${videoId}`);

    // Create Tor proxy fetch function
    const torProxyFetch = createTorProxyFetch();

    // Fetch transcript using youtube-transcript-plus with Tor proxy
    console.log('📜 [TRANSCRIPT] Fetching transcript from YouTube via Tor network...');
    const transcriptSegments = await fetchTranscript(youtubeUrl, {
      lang: 'en',
      // Route all requests through Tor proxy
      videoFetch: torProxyFetch,
      playerFetch: torProxyFetch,
      transcriptFetch: torProxyFetch,
    });
    console.log(`📜 [TRANSCRIPT] Received ${transcriptSegments.length} transcript segments`);

    // Combine into continuous text
    const text = transcriptSegments.map((item) => item.text).join(' ');
    console.log(`📜 [TRANSCRIPT] Combined text length: ${text.length} characters`);

    console.log('✅ [TRANSCRIPT] Transcript extraction completed successfully via Tor');
    return {
      text,
      videoId,
      segments: transcriptSegments.map((segment) => ({
        text: segment.text,
        offset: segment.offset,
        duration: segment.duration,
      })),
    };
  } catch (error) {
    console.error('❌ [TRANSCRIPT] Extraction failed via Tor proxy:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [TRANSCRIPT] Error details: ${errorMessage}`);

    // Throw descriptive error for user
    throw new Error(
      `Failed to extract transcript. The video may not have captions available, or the Tor network is experiencing issues. Please try again in a few moments. (${errorMessage})`
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
