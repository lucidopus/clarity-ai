/**
 * Unit Tests for lib/catalog.ts
 *
 * Tests catalog helper functions and definitions.
 */

import { hasTagOrInitial, CatalogVideo } from './catalog';

describe('hasTagOrInitial', () => {
  const mockVideo: CatalogVideo = {
    id: '1',
    videoId: 'v1',
    title: 'Advanced React Patterns',
    category: 'Cooking', // Deliberately mismatched for testing
    tags: ['hooks', 'frontend', 'javascript'],
    // description removed as it is not in IVideo interface
    duration: 10,
  };

  test('matches valid tag case-insensitive', () => {
    expect(hasTagOrInitial(mockVideo, ['Hooks'])).toBe(true);
    expect(hasTagOrInitial(mockVideo, ['FRONTEND'])).toBe(true);
  });

  test('matches title substring case-insensitive', () => {
    expect(hasTagOrInitial(mockVideo, ['React'])).toBe(true);
    expect(hasTagOrInitial(mockVideo, ['patterns'])).toBe(true);
  });

  test('matches category case-insensitive', () => {
    expect(hasTagOrInitial(mockVideo, ['cooking'])).toBe(true);
  });

  test('returns false when no terms match', () => {
    expect(hasTagOrInitial(mockVideo, ['backend', 'python'])).toBe(false);
  });

  test('handles empty terms array', () => {
    expect(hasTagOrInitial(mockVideo, [])).toBe(false);
  });

  test('handles video with missing fields', () => {
    // @ts-expect-error - Testing missing fields partial object
    const emptyVideo: CatalogVideo = { id: '2' };
    expect(hasTagOrInitial(emptyVideo, ['test'])).toBe(false);
  });

  test('matches one of multiple terms', () => {
    expect(hasTagOrInitial(mockVideo, ['cobol', 'React'])).toBe(true);
  });
});
