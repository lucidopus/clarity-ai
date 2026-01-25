/**
 * Unit Tests for lib/content-validator.ts
 * 
 * Tests the pure utility function extractTranscriptSnippet.
 * Note: validateEducationalContent requires LLM mocking and is not tested here.
 * 
 * We inline-test the pure function logic to avoid importing the module
 * which has LangChain dependencies with ESM issues in Jest.
 */

import { extractTranscriptSnippet } from './utils/transcript-logic';
import type { ITranscriptSegment } from './models/Video';

describe('extractTranscriptSnippet', () => {
  test('returns empty string for empty segments array', () => {
    expect(extractTranscriptSnippet([])).toBe('');
  });

  test('returns empty string for undefined segments', () => {
    // @ts-expect-error - Testing undefined input
    expect(extractTranscriptSnippet(undefined)).toBe('');
  });

  test('returns all segments for short video (<120s)', () => {
    const segments: ITranscriptSegment[] = [
      { text: 'Hello', offset: 0, duration: 5, lang: 'en' },
      { text: 'World', offset: 5, duration: 5, lang: 'en' },
      { text: 'Test', offset: 10, duration: 5, lang: 'en' },
    ];
    
    expect(extractTranscriptSnippet(segments)).toBe('Hello World Test');
  });

  test('returns only first 120 seconds of segments', () => {
    const segments: ITranscriptSegment[] = [
      { text: 'Part 1', offset: 0, duration: 60, lang: 'en' },
      { text: 'Part 2', offset: 60, duration: 60, lang: 'en' },
      { text: 'Part 3', offset: 120, duration: 60, lang: 'en' }, // Should be excluded
      { text: 'Part 4', offset: 180, duration: 60, lang: 'en' }, // Should be excluded
    ];
    
    const result = extractTranscriptSnippet(segments);
    
    expect(result).toBe('Part 1 Part 2');
    expect(result).not.toContain('Part 3');
    expect(result).not.toContain('Part 4');
  });

  test('respects custom maxDurationSeconds parameter', () => {
    const segments: ITranscriptSegment[] = [
      { text: 'Intro', offset: 0, duration: 30, lang: 'en' },
      { text: 'Content', offset: 30, duration: 30, lang: 'en' },
      { text: 'More', offset: 60, duration: 30, lang: 'en' },
    ];
    
    // Only get first 30 seconds
    expect(extractTranscriptSnippet(segments, 30)).toBe('Intro');
    
    // Get first 60 seconds  
    expect(extractTranscriptSnippet(segments, 60)).toBe('Intro Content');
  });

  test('handles segments with offset at exactly the boundary', () => {
    const segments: ITranscriptSegment[] = [
      { text: 'Before', offset: 119, duration: 5, lang: 'en' },
      { text: 'At', offset: 120, duration: 5, lang: 'en' }, // Exactly at boundary - should be excluded
      { text: 'After', offset: 125, duration: 5, lang: 'en' },
    ];
    
    const result = extractTranscriptSnippet(segments);
    
    expect(result).toBe('Before');
    expect(result).not.toContain('At');
  });
});
