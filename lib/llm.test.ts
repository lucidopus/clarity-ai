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

import { classifyLLMError } from './utils/error-logic';

describe('LLM Error Classification', () => {
  describe('Authentication Errors', () => {
    test('classifies "api key" error', () => {
      const error = classifyLLMError('Invalid API key provided');
      expect(error).toBeInstanceOf(LLMAuthenticationError);
    });

    test('classifies "unauthorized" error', () => {
      const error = classifyLLMError('Unauthorized request');
      expect(error).toBeInstanceOf(LLMAuthenticationError);
    });

    test('classifies "unauthenticated" error', () => {
      const error = classifyLLMError('Request is unauthenticated');
      expect(error).toBeInstanceOf(LLMAuthenticationError);
    });
  });

  describe('Permission Errors', () => {
    test('classifies "permission" error', () => {
      const error = classifyLLMError('Permission denied for this resource');
      expect(error).toBeInstanceOf(LLMPermissionError);
    });

    test('classifies "forbidden" error', () => {
      const error = classifyLLMError('Forbidden: Access denied');
      expect(error).toBeInstanceOf(LLMPermissionError);
    });
  });

  describe('Rate Limit Errors', () => {
    test('classifies "rate limit" error', () => {
      const error = classifyLLMError('Rate limit exceeded');
      expect(error).toBeInstanceOf(LLMRateLimitError);
    });

    test('classifies "429" error', () => {
      const error = classifyLLMError('Error 429: Too many requests');
      expect(error).toBeInstanceOf(LLMRateLimitError);
    });

    test('classifies "resource_exhausted" error', () => {
      const error = classifyLLMError('RESOURCE_EXHAUSTED: Quota exceeded');
      expect(error).toBeInstanceOf(LLMRateLimitError);
    });

    test('classifies "quota" error', () => {
      const error = classifyLLMError('Quota limit reached');
      expect(error).toBeInstanceOf(LLMRateLimitError);
    });
  });

  describe('Token Limit Errors', () => {
    test('classifies "context length exceeded" error', () => {
      const error = classifyLLMError('context_length_exceeded');
      expect(error).toBeInstanceOf(LLMTokenLimitError);
    });

    test('classifies "maximum context length" error', () => {
      const error = classifyLLMError('This model has a maximum context length of 8192 tokens');
      expect(error).toBeInstanceOf(LLMTokenLimitError);
    });

    test('classifies "context + length" combination', () => {
      const error = classifyLLMError('Context length is too long');
      expect(error).toBeInstanceOf(LLMTokenLimitError);
    });
  });

  describe('Output Limit Errors', () => {
    test('classifies "output limit" error', () => {
      const error = classifyLLMError('Output token limit exceeded');
      expect(error).toBeInstanceOf(LLMOutputLimitError);
    });
  });

  describe('Content Filtered Errors', () => {
    test('classifies "recitation" error', () => {
      const error = classifyLLMError('Output blocked due to recitation');
      expect(error).toBeInstanceOf(LLMContentFilteredError);
      expect((error as LLMContentFilteredError).code).toBe('LLM_CONTENT_FILTERED_RECITATION');
    });

    test('classifies "safety block" error', () => {
      const error = classifyLLMError('Content blocked by safety filter');
      expect(error).toBeInstanceOf(LLMContentFilteredError);
      expect((error as LLMContentFilteredError).code).toBe('LLM_CONTENT_FILTERED_SAFETY');
    });
  });

  describe('Timeout Errors', () => {
    test('classifies "timeout" error', () => {
      const error = classifyLLMError('Request timeout');
      expect(error).toBeInstanceOf(LLMTimeoutError);
    });

    test('classifies "deadline_exceeded" error', () => {
      const error = classifyLLMError('DEADLINE_EXCEEDED');
      expect(error).toBeInstanceOf(LLMTimeoutError);
    });

    test('classifies "504" error', () => {
      const error = classifyLLMError('Error 504: Gateway timeout');
      expect(error).toBeInstanceOf(LLMTimeoutError);
    });
  });

  describe('Service Unavailable Errors', () => {
    test('classifies "503" error', () => {
      const error = classifyLLMError('Error 503: Service temporarily unavailable');
      expect(error).toBeInstanceOf(LLMUnavailableError);
    });

    test('classifies "overload" error', () => {
      const error = classifyLLMError('Service overloaded');
      expect(error).toBeInstanceOf(LLMUnavailableError);
    });
  });

  describe('Invalid Request Errors', () => {
    test('classifies "invalid argument" error', () => {
      const error = classifyLLMError('Invalid argument provided');
      expect(error).toBeInstanceOf(LLMInvalidRequestError);
    });

    test('classifies "malformed" error', () => {
      const error = classifyLLMError('Malformed request body');
      expect(error).toBeInstanceOf(LLMInvalidRequestError);
    });

    test('classifies "failed_precondition" error', () => {
      const error = classifyLLMError('FAILED_PRECONDITION: Model not found');
      expect(error).toBeInstanceOf(LLMInvalidRequestError);
    });
  });

  describe('Default Error Handling', () => {
    test('falls back to LLMServiceError for unknown errors', () => {
      const error = classifyLLMError('Something went wrong');
      expect(error).toBeInstanceOf(LLMServiceError);
    });
  });
});
