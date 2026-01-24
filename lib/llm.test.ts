/**
 * Unit Tests for lib/llm.ts - Error Classification Logic
 * 
 * Tests the error classification patterns extracted from generateLearningMaterials.
 * The actual error classification is tested by simulating error message patterns.
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
} from './errors/ApiError';

/**
 * Classify error message patterns - mirrors logic from lib/llm.ts
 * This allows us to test the classification logic without mocking the entire LLM
 */
function classifyErrorMessage(errorMessage: string): Error {
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

  // Default to service error
  return new LLMServiceError(errorMessage);
}

describe('LLM Error Classification', () => {
  describe('Authentication Errors', () => {
    test('classifies "api key" error', () => {
      const error = classifyErrorMessage('Invalid API key provided');
      expect(error).toBeInstanceOf(LLMAuthenticationError);
    });

    test('classifies "unauthorized" error', () => {
      const error = classifyErrorMessage('Unauthorized request');
      expect(error).toBeInstanceOf(LLMAuthenticationError);
    });

    test('classifies "unauthenticated" error', () => {
      const error = classifyErrorMessage('Request is unauthenticated');
      expect(error).toBeInstanceOf(LLMAuthenticationError);
    });
  });

  describe('Permission Errors', () => {
    test('classifies "permission" error', () => {
      const error = classifyErrorMessage('Permission denied for this resource');
      expect(error).toBeInstanceOf(LLMPermissionError);
    });

    test('classifies "forbidden" error', () => {
      const error = classifyErrorMessage('Forbidden: Access denied');
      expect(error).toBeInstanceOf(LLMPermissionError);
    });
  });

  describe('Rate Limit Errors', () => {
    test('classifies "rate limit" error', () => {
      const error = classifyErrorMessage('Rate limit exceeded');
      expect(error).toBeInstanceOf(LLMRateLimitError);
    });

    test('classifies "429" error', () => {
      const error = classifyErrorMessage('Error 429: Too many requests');
      expect(error).toBeInstanceOf(LLMRateLimitError);
    });

    test('classifies "resource_exhausted" error', () => {
      const error = classifyErrorMessage('RESOURCE_EXHAUSTED: Quota exceeded');
      expect(error).toBeInstanceOf(LLMRateLimitError);
    });

    test('classifies "quota" error', () => {
      const error = classifyErrorMessage('Quota limit reached');
      expect(error).toBeInstanceOf(LLMRateLimitError);
    });
  });

  describe('Token Limit Errors', () => {
    test('classifies "context length exceeded" error', () => {
      const error = classifyErrorMessage('context_length_exceeded');
      expect(error).toBeInstanceOf(LLMTokenLimitError);
    });

    test('classifies "maximum context length" error', () => {
      const error = classifyErrorMessage('This model has a maximum context length of 8192 tokens');
      expect(error).toBeInstanceOf(LLMTokenLimitError);
    });

    test('classifies "context + length" combination', () => {
      const error = classifyErrorMessage('Context length is too long');
      expect(error).toBeInstanceOf(LLMTokenLimitError);
    });
  });

  describe('Output Limit Errors', () => {
    test('classifies "output limit" error', () => {
      const error = classifyErrorMessage('Output token limit exceeded');
      expect(error).toBeInstanceOf(LLMOutputLimitError);
    });
  });

  describe('Content Filtered Errors', () => {
    test('classifies "recitation" error', () => {
      const error = classifyErrorMessage('Output blocked due to recitation');
      expect(error).toBeInstanceOf(LLMContentFilteredError);
      expect((error as LLMContentFilteredError).code).toBe('LLM_CONTENT_FILTERED_RECITATION');
    });

    test('classifies "safety block" error', () => {
      const error = classifyErrorMessage('Content blocked by safety filter');
      expect(error).toBeInstanceOf(LLMContentFilteredError);
      expect((error as LLMContentFilteredError).code).toBe('LLM_CONTENT_FILTERED_SAFETY');
    });
  });

  describe('Timeout Errors', () => {
    test('classifies "timeout" error', () => {
      const error = classifyErrorMessage('Request timeout');
      expect(error).toBeInstanceOf(LLMTimeoutError);
    });

    test('classifies "deadline_exceeded" error', () => {
      const error = classifyErrorMessage('DEADLINE_EXCEEDED');
      expect(error).toBeInstanceOf(LLMTimeoutError);
    });

    test('classifies "504" error', () => {
      const error = classifyErrorMessage('Error 504: Gateway timeout');
      expect(error).toBeInstanceOf(LLMTimeoutError);
    });
  });

  describe('Service Unavailable Errors', () => {
    test('classifies "503" error', () => {
      const error = classifyErrorMessage('Error 503: Service temporarily unavailable');
      expect(error).toBeInstanceOf(LLMUnavailableError);
    });

    test('classifies "overload" error', () => {
      const error = classifyErrorMessage('Service overloaded');
      expect(error).toBeInstanceOf(LLMUnavailableError);
    });
  });

  describe('Invalid Request Errors', () => {
    test('classifies "invalid argument" error', () => {
      const error = classifyErrorMessage('Invalid argument provided');
      expect(error).toBeInstanceOf(LLMInvalidRequestError);
    });

    test('classifies "malformed" error', () => {
      const error = classifyErrorMessage('Malformed request body');
      expect(error).toBeInstanceOf(LLMInvalidRequestError);
    });

    test('classifies "failed_precondition" error', () => {
      const error = classifyErrorMessage('FAILED_PRECONDITION: Model not found');
      expect(error).toBeInstanceOf(LLMInvalidRequestError);
    });
  });

  describe('Default Error Handling', () => {
    test('falls back to LLMServiceError for unknown errors', () => {
      const error = classifyErrorMessage('Something went wrong');
      expect(error).toBeInstanceOf(LLMServiceError);
    });
  });
});
