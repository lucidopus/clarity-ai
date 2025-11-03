import { fetchTranscript } from 'youtube-transcript-plus';
import { HttpsProxyAgent } from 'https-proxy-agent';

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
 * Creates custom fetch functions with optional Webshare proxy support.
 *
 * Proxy Integration:
 * - Uses https-proxy-agent to route requests through Webshare proxy
 * - Maintains browser-like headers (User-Agent, Sec-Fetch-*, etc.) to avoid detection
 * - Supports both HTTPS and HTTP proxies automatically
 * - Enhanced error handling to distinguish proxy vs destination errors
 *
 * @param userAgent - Browser user agent string
 * @param lang - Language code for Accept-Language header
 * @param proxyAgent - Optional HttpsProxyAgent instance (null for direct connection)
 * @returns Custom fetch function compatible with youtube-transcript-plus
 */
const createCustomFetch = (userAgent: string, lang: string, proxyAgent?: any) => {
  return async ({ url, method = 'GET', body, headers: customHeaders }: {
    url: string;
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    lang?: string;
    userAgent?: string;
  }) => {
    // Enhanced headers to better mimic a real browser
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept-Language': `${lang},en-US;q=0.9,en;q=0.8`,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      ...customHeaders,
    };

    const logPrefix = proxyAgent ? '🌐 [PROXY FETCH]' : '📡 [DIRECT FETCH]';
    const connectionType = proxyAgent ? '🌐 PROXY ROUTED' : '📡 DIRECT CONNECTION';
    console.log(`${logPrefix} ${connectionType} - ${method} ${url.substring(0, 80)}...`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        // @ts-ignore - agent is valid for node-fetch and native fetch in Node.js 18+
        agent: proxyAgent,
      });

      if (!response.ok) {
        console.error(`❌ [CUSTOM FETCH] HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error: any) {
      // Distinguish proxy connection errors from destination server errors
      if (error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED') {
        throw new Error(`Proxy connection failed: ${error.message}`);
      }
      if (error.cause?.code === 'ETIMEDOUT' || error.code === 'ETIMEDOUT') {
        throw new Error(`Request timeout (proxy or destination): ${error.message}`);
      }
      throw new Error(`Request to ${url.substring(0, 80)} failed: ${error.message}`);
    }
  };
};

/**
 * Extracts YouTube video transcript using youtube-transcript-plus library.
 *
 * Production Considerations:
 * - YouTube blocks cloud provider IPs (Vercel, AWS, etc.) from accessing transcripts
 * - Webshare residential proxy is used to route requests through residential IPs
 * - Proxy is configured via WEBSHARE_PROXY_URL environment variable
 * - Implements retry logic with exponential backoff (3 attempts: 1s, 2s, 5s delays)
 * - Falls back to direct connection if proxy is not configured (for local dev)
 *
 * @param youtubeUrl - Full YouTube video URL (https://youtu.be/... or https://youtube.com/watch?v=...)
 * @returns Transcript text, video ID, and segmented transcript with timestamps
 * @throws Error if transcript extraction fails after all retries
 *
 * @example
 * const result = await getYouTubeTranscript('https://youtu.be/S9aWBbVypeU');
 * console.log(result.text); // Full transcript text
 * console.log(result.segments); // Array of {text, offset, duration}
 */
export async function getYouTubeTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  console.log('📜 [TRANSCRIPT] Starting transcript extraction...');
  console.log(`📜 [TRANSCRIPT] URL: ${youtubeUrl}`);

  const videoId = extractVideoId(youtubeUrl);
  console.log(`📜 [TRANSCRIPT] Video ID extracted: ${videoId}`);

  // Initialize proxy agent if enabled
  const proxyEnabled = process.env.WEBSHARE_PROXY_ENABLED === 'true';
  const proxyUrl = process.env.WEBSHARE_PROXY_URL;
  const proxyAgent = proxyEnabled && proxyUrl ? new (HttpsProxyAgent as any)(proxyUrl) : null;

  // Log proxy status with explicit confirmation
  if (proxyAgent) {
    console.log('🌐 [PROXY] ✅ PROXY ENABLED - All requests will route through Webshare residential proxy');
    console.log(`🌐 [PROXY] 📍 Proxy endpoint: ${proxyUrl?.replace(/:[^:]+@/, ':***@')} (credentials masked)`);
    console.log('🌐 [PROXY] 🔄 Using rotating residential IPs - automatic IP rotation enabled');
  } else {
    console.log('📡 [DIRECT] ❌ PROXY DISABLED - Using direct connection (no proxy)');
    console.log('📡 [DIRECT] ⚠️  May fail in production environments due to IP blocking');
  }

  // Use a modern Chrome user agent
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const lang = 'en';

  // Create proxy-enabled fetch functions
  const customFetch = createCustomFetch(userAgent, lang, proxyAgent);

  // Retry logic with exponential backoff
  const maxRetries = 3;
  const retryDelays = [1000, 2000, 5000]; // 1s, 2s, 5s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const connectionType = proxyAgent ? '🌐 via Webshare proxy' : '📡 direct connection';
      console.log(`📜 [TRANSCRIPT] Attempt ${attempt + 1}/${maxRetries} ${connectionType}...`);

      const transcriptSegments = await fetchTranscript(youtubeUrl, {
        lang,
        userAgent,
        videoFetch: customFetch,
        playerFetch: customFetch,
        transcriptFetch: customFetch,
      });

      console.log(`✅ [TRANSCRIPT] Successfully extracted ${transcriptSegments.length} segments`);

      const text = transcriptSegments.map((item) => item.text).join(' ');
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
      console.error(`❌ [TRANSCRIPT] Attempt ${attempt + 1} failed:`, error);

      // Check if error is retryable
      const errorMessage = error instanceof Error ? error.message : String(error);
      const retryableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'RequestBlocked'];
      const isRetryable = retryableErrors.some(err => errorMessage.includes(err));

      // If last attempt or non-retryable error, throw
      if (attempt === maxRetries - 1 || !isRetryable) {
        console.error(`❌ [TRANSCRIPT] All ${maxRetries} attempts exhausted`);
        throw new Error(`Failed to extract transcript: ${errorMessage}`);
      }

      // Wait before retrying (exponential backoff)
      const delay = retryDelays[attempt];
      console.log(`⏳ [TRANSCRIPT] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Failed to extract transcript after all retries');
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
