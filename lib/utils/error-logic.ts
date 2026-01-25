/**
 * Pure utility functions for error classification.
 * Separated to allow unit testing without loading heavy dependencies.
 */

import {
  LLMAuthenticationError,
  LLMPermissionError,
  LLMRateLimitError,
  LLMTokenLimitError,
  LLMOutputLimitError,
  LLMContentFilteredError,
  LLMTimeoutError,
  LLMUnavailableError,
  LLMInvalidRequestError,
  LLMServiceError,
} from '../errors/ApiError';

/**
 * Determines if an error type indicates a token limit issue
 */
export function isTokenLimitError(errorType: string): boolean {
  return ['LLM_TOKEN_LIMIT', 'LLM_TIMEOUT'].includes(errorType);
}

/**
 * Determines if an error is permanent and should not be retried
 */
export function isPermanentError(errorType: string): boolean {
  return [
    'API_KEY_ERROR',
    'PERMISSION_DENIED',
    'CONTENT_FILTERED',
    'INVALID_REQUEST',
    'RECITATION',
  ].includes(errorType);
}

/**
 * Classifies an error message into a specific API Error type
 */
export function classifyLLMError(errorMessage: string): Error {
  const errorStr = errorMessage.toLowerCase();

  // Authentication errors (401)
  if (errorStr.includes('auth') || errorStr.includes('api key') || 
      errorStr.includes('unauthorized') || errorStr.includes('unauthenticated')) {
    return new LLMAuthenticationError();
  }

  // Permission errors (403)
  if (errorStr.includes('permission') || errorStr.includes('forbidden')) {
    return new LLMPermissionError();
  }

  // Rate limit errors (429)
  if (errorStr.includes('rate limit') || errorStr.includes('429') || 
      errorStr.includes('resource_exhausted') || errorStr.includes('quota')) {
    return new LLMRateLimitError();
  }

  // Token limit errors - INPUT (context length exceeded)
  if ((errorStr.includes('context') && errorStr.includes('length')) ||
      (errorStr.includes('token') && errorStr.includes('limit') && errorStr.includes('input')) ||
      errorStr.includes('context_length_exceeded') ||
      errorStr.includes('maximum context length')) {
    return new LLMTokenLimitError();
  }

  // Token limit errors - OUTPUT
  if (errorStr.includes('output') && errorStr.includes('limit')) {
    return new LLMOutputLimitError();
  }

  // Content safety filtering
  if (errorStr.includes('recitation')) {
    return new LLMContentFilteredError('RECITATION');
  }
  if (errorStr.includes('safety') && (errorStr.includes('block') || errorStr.includes('filter'))) {
    return new LLMContentFilteredError('SAFETY');
  }

  // Timeout errors (504)
  if (errorStr.includes('timeout') || errorStr.includes('deadline') || 
      errorStr.includes('504') || errorStr.includes('deadline_exceeded')) {
    return new LLMTimeoutError();
  }

  // Service unavailable (503)
  if (errorStr.includes('503') || errorStr.includes('unavailable') || 
      errorStr.includes('overload') || errorStr.includes('capacity')) {
    return new LLMUnavailableError();
  }

  // Invalid request format (400)
  if ((errorStr.includes('invalid') && (errorStr.includes('argument') || errorStr.includes('request'))) ||
      errorStr.includes('malformed') || errorStr.includes('failed_precondition')) {
    return new LLMInvalidRequestError(errorMessage);
  }

  // For any other error, return null (caller should wrap in generic ServiceError)
  return new LLMServiceError(errorMessage);
}
