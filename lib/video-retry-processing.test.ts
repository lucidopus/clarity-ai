/**
 * Unit Tests for lib/video-retry-processing.ts
 * 
 * Tests the error classification helper functions.
 */

import { isTokenLimitError, isPermanentError } from './video-retry-processing';

describe('isTokenLimitError', () => {
  test('returns true for LLM_TOKEN_LIMIT', () => {
    expect(isTokenLimitError('LLM_TOKEN_LIMIT')).toBe(true);
  });

  test('returns true for LLM_TIMEOUT', () => {
    expect(isTokenLimitError('LLM_TIMEOUT')).toBe(true);
  });

  test('returns false for LLM_RATE_LIMIT', () => {
    expect(isTokenLimitError('LLM_RATE_LIMIT')).toBe(false);
  });

  test('returns false for API_KEY_ERROR', () => {
    expect(isTokenLimitError('API_KEY_ERROR')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isTokenLimitError('')).toBe(false);
  });

  test('returns false for random string', () => {
    expect(isTokenLimitError('SOME_OTHER_ERROR')).toBe(false);
  });
});

describe('isPermanentError', () => {
  test('returns true for API_KEY_ERROR', () => {
    expect(isPermanentError('API_KEY_ERROR')).toBe(true);
  });

  test('returns true for PERMISSION_DENIED', () => {
    expect(isPermanentError('PERMISSION_DENIED')).toBe(true);
  });

  test('returns true for CONTENT_FILTERED', () => {
    expect(isPermanentError('CONTENT_FILTERED')).toBe(true);
  });

  test('returns true for INVALID_REQUEST', () => {
    expect(isPermanentError('INVALID_REQUEST')).toBe(true);
  });

  test('returns true for RECITATION', () => {
    expect(isPermanentError('RECITATION')).toBe(true);
  });

  test('returns false for LLM_TOKEN_LIMIT', () => {
    expect(isPermanentError('LLM_TOKEN_LIMIT')).toBe(false);
  });

  test('returns false for LLM_TIMEOUT', () => {
    expect(isPermanentError('LLM_TIMEOUT')).toBe(false);
  });

  test('returns false for LLM_RATE_LIMIT', () => {
    expect(isPermanentError('LLM_RATE_LIMIT')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isPermanentError('')).toBe(false);
  });
});
