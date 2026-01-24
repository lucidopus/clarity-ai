/**
 * Unit Tests for lib/activityLogger.ts
 *
 * Tests client-side activity logging with mocked fetch.
 */

import { logActivity, ActivityType } from './activityLogger';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window for CustomEvent dispatch
const mockDispatchEvent = jest.fn();
const originalWindow = global.window;

beforeEach(() => {
  jest.resetAllMocks();
  // @ts-expect-error - Mocking window
  global.window = {
    dispatchEvent: mockDispatchEvent,
  };
});

afterAll(() => {
  global.window = originalWindow;
});

describe('logActivity', () => {
  test('returns true and dispatches event on successful log', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await logActivity('flashcard_viewed', 'video-123');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/activity/log', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity:logged',
        detail: { activityType: 'flashcard_viewed', videoId: 'video-123' },
      })
    );
  });

  test('returns false on failed API response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await logActivity('quiz_completed');

    expect(result).toBe(false);
    expect(mockDispatchEvent).not.toHaveBeenCalled();
  });

  test('returns false on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await logActivity('materials_viewed', 'video-456');

    expect(result).toBe(false);
  });

  test('sends correct activity type and metadata', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await logActivity('flashcard_mastered', 'video-789', { flashcardId: 'fc-1' });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.activityType).toBe('flashcard_mastered');
    expect(body.videoId).toBe('video-789');
    expect(body.metadata).toEqual({ flashcardId: 'fc-1' });
    expect(body.clientTimestamp).toBeDefined();
    expect(body.timezoneOffsetMinutes).toBeDefined();
    expect(body.timeZone).toBeDefined();
  });

  test('handles all valid activity types', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const activityTypes: ActivityType[] = [
      'flashcard_viewed',
      'quiz_completed',
      'materials_viewed',
      'flashcard_mastered',
      'flashcard_created',
      'video_generated',
    ];

    for (const type of activityTypes) {
      const result = await logActivity(type);
      expect(result).toBe(true);
    }

    expect(mockFetch).toHaveBeenCalledTimes(activityTypes.length);
  });
});
