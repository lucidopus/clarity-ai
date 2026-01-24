/**
 * Unit Tests for lib/transcript.ts
 * 
 * Tests URL validation, video ID extraction, and transcript error handling.
 */

import { extractVideoId, isValidYouTubeUrl, getYouTubeTranscript } from './transcript';
import {
  InvalidURLError,
  TranscriptRateLimitError,
  TranscriptTimeoutError,
  TranscriptUnavailableError,
  TranscriptServiceError,
} from './errors/ApiError';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock environment variable
const originalEnv = process.env;

beforeEach(() => {
  jest.resetAllMocks();
  process.env = { ...originalEnv, APIFY_API_TOKEN: 'test-token' };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('extractVideoId', () => {
  test('extracts ID from standard YouTube URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=S9aWBbVypeU')).toBe('S9aWBbVypeU');
  });

  test('extracts ID from short YouTube URL (youtu.be)', () => {
    expect(extractVideoId('https://youtu.be/S9aWBbVypeU')).toBe('S9aWBbVypeU');
  });

  test('extracts ID from URL with timestamp', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=S9aWBbVypeU&t=120')).toBe('S9aWBbVypeU');
  });

  test('extracts ID from URL with playlist parameters', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz')).toBe('dQw4w9WgXcQ');
  });

  test('extracts ID without www prefix', () => {
    expect(extractVideoId('https://youtube.com/watch?v=S9aWBbVypeU')).toBe('S9aWBbVypeU');
  });

  test('throws InvalidURLError for invalid URL', () => {
    expect(() => extractVideoId('https://example.com/video')).toThrow(InvalidURLError);
  });

  test('throws InvalidURLError for malformed YouTube URL', () => {
    expect(() => extractVideoId('https://youtube.com/watch?v=short')).toThrow(InvalidURLError);
  });

  test('throws InvalidURLError for empty string', () => {
    expect(() => extractVideoId('')).toThrow(InvalidURLError);
  });
});

describe('isValidYouTubeUrl', () => {
  test('returns true for standard YouTube URL', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=S9aWBbVypeU')).toBe(true);
  });

  test('returns true for short YouTube URL', () => {
    expect(isValidYouTubeUrl('https://youtu.be/S9aWBbVypeU')).toBe(true);
  });

  test('returns true for URL without https', () => {
    expect(isValidYouTubeUrl('http://www.youtube.com/watch?v=S9aWBbVypeU')).toBe(true);
  });

  test('returns true for URL without www', () => {
    expect(isValidYouTubeUrl('https://youtube.com/watch?v=S9aWBbVypeU')).toBe(true);
  });

  test('returns false for non-YouTube URL', () => {
    expect(isValidYouTubeUrl('https://vimeo.com/123456')).toBe(false);
  });

  test('returns false for invalid video ID length', () => {
    expect(isValidYouTubeUrl('https://youtube.com/watch?v=short')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isValidYouTubeUrl('')).toBe(false);
  });
});

describe('getYouTubeTranscript', () => {
  const validUrl = 'https://www.youtube.com/watch?v=S9aWBbVypeU';

  test('throws TranscriptServiceError when APIFY_API_TOKEN is not set', async () => {
    delete process.env.APIFY_API_TOKEN;
    
    await expect(getYouTubeTranscript(validUrl)).rejects.toThrow(TranscriptServiceError);
  });

  test('throws TranscriptRateLimitError on 429 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    });

    await expect(getYouTubeTranscript(validUrl)).rejects.toThrow(TranscriptRateLimitError);
  });

  test('throws TranscriptTimeoutError on 408 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 408,
      text: async () => 'Request timeout',
    });

    await expect(getYouTubeTranscript(validUrl)).rejects.toThrow(TranscriptTimeoutError);
  });

  test('throws TranscriptTimeoutError on 504 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 504,
      text: async () => 'Gateway timeout',
    });

    await expect(getYouTubeTranscript(validUrl)).rejects.toThrow(TranscriptTimeoutError);
  });

  test('throws TranscriptServiceError on other HTTP errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal server error',
    });

    await expect(getYouTubeTranscript(validUrl)).rejects.toThrow(TranscriptServiceError);
  });

  test('throws TranscriptUnavailableError when dataset is empty', async () => {
    // Mock successful actor run
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'run-123', defaultDatasetId: 'dataset-123' } }),
    });
    // Mock empty dataset
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await expect(getYouTubeTranscript(validUrl)).rejects.toThrow(TranscriptUnavailableError);
  });

  test('returns transcript result on success', async () => {
    // Mock successful actor run
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'run-123', defaultDatasetId: 'dataset-123' } }),
    });
    // Mock transcript data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        data: [
          { text: 'Hello', start: '0', dur: '1' },
          { text: 'World', start: '1', dur: '1' },
        ],
      }],
    });

    const result = await getYouTubeTranscript(validUrl);

    expect(result.videoId).toBe('S9aWBbVypeU');
    expect(result.text).toBe('Hello World');
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({ text: 'Hello', offset: 0, duration: 1 });
  });
});
