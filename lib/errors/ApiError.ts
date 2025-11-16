/**
 * Custom Error Classes for API Error Handling
 *
 * This module provides structured error classes for better error classification
 * and user-friendly error messaging throughout the application.
 */

/**
 * Base API Error class
 * All custom API errors extend from this class
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Transcript-related errors (Apify service)
 */
export class TranscriptError extends ApiError {
  constructor(code: string, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'TranscriptError';
  }
}

/**
 * LLM-related errors (Groq service)
 */
export class LLMError extends ApiError {
  constructor(code: string, message: string, statusCode: number = 500) {
    super(code, message, statusCode);
    this.name = 'LLMError';
  }
}

/**
 * Specific Transcript Error Types
 */

export class TranscriptUnavailableError extends TranscriptError {
  constructor() {
    super(
      'TRANSCRIPT_UNAVAILABLE',
      'Video has no captions available',
      400
    );
  }
}

export class TranscriptRateLimitError extends TranscriptError {
  constructor() {
    super(
      'TRANSCRIPT_RATE_LIMIT',
      'Apify rate limit exceeded. Please try again in a few minutes.',
      429
    );
  }
}

export class TranscriptServiceError extends TranscriptError {
  constructor(originalMessage?: string) {
    super(
      'TRANSCRIPT_SERVICE_ERROR',
      originalMessage || 'Transcript service experienced an unexpected error',
      503
    );
  }
}

export class TranscriptTimeoutError extends TranscriptError {
  constructor() {
    super(
      'TRANSCRIPT_TIMEOUT',
      'Transcript extraction timed out. Please try again.',
      408
    );
  }
}

/**
 * Specific LLM Error Types
 */

export class LLMTokenLimitError extends LLMError {
  constructor() {
    super(
      'LLM_TOKEN_LIMIT',
      'Transcript exceeds token limit. Please try a shorter video.',
      400
    );
  }
}

export class LLMRateLimitError extends LLMError {
  constructor() {
    super(
      'LLM_RATE_LIMIT',
      'Rate limit exceeded. Please try again in a few minutes.',
      429
    );
  }
}

export class LLMServiceError extends LLMError {
  constructor(originalMessage?: string) {
    super(
      'LLM_SERVICE_ERROR',
      originalMessage || 'LLM service experienced an unexpected error',
      503
    );
  }
}

export class LLMPartialFailureError extends LLMError {
  constructor() {
    super(
      'LLM_PARTIAL_FAILURE',
      'Some materials could not be generated, but transcript is available',
      200
    );
  }
}

/**
 * General Error Types
 */

export class NetworkError extends ApiError {
  constructor() {
    super(
      'NETWORK_ERROR',
      'Unable to connect to our servers. Please check your internet connection.',
      0
    );
  }
}

export class InvalidURLError extends ApiError {
  constructor() {
    super(
      'INVALID_URL',
      'Invalid YouTube URL format',
      400
    );
  }
}

export class DuplicateVideoError extends ApiError {
  constructor() {
    super(
      'DUPLICATE_VIDEO',
      'Video already processed',
      409
    );
  }
}

export class UnknownError extends ApiError {
  constructor(originalMessage?: string) {
    super(
      'UNKNOWN_ERROR',
      originalMessage || 'An unexpected error occurred',
      500
    );
  }
}
