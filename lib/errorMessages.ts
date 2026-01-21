/**
 * Error Messages Utility
 *
 * Maps error codes to user-friendly UI content (title, message, variant, actions).
 * Frontend uses this to display appropriate dialogs based on backend error classification.
 */

export type ErrorVariant = 'error' | 'warning' | 'info';

export interface ErrorAction {
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
  onClick: 'retry' | 'chooseDifferentVideo' | 'close' | 'viewExisting';
}

export interface ErrorMessageConfig {
  title: string;
  message: string;
  variant: ErrorVariant;
  shouldRedirect: boolean;
  actions?: ErrorAction[];
}

/**
 * Error message configurations
 * Keys match the error codes from ApiError classes
 */
export const ERROR_MESSAGES: Record<string, ErrorMessageConfig> = {
  // Transcript Errors
  TRANSCRIPT_UNAVAILABLE: {
    title: 'Video Has No Captions',
    message: 'This video doesn\'t have captions or subtitles available. Clarity AI requires transcripts to generate learning materials. Please try a different video with captions enabled.',
    variant: 'warning',
    shouldRedirect: false,
    actions: [
      { label: 'Choose Different Video', variant: 'primary', onClick: 'chooseDifferentVideo' },
      { label: 'Cancel', variant: 'ghost', onClick: 'close' }
    ]
  },

  TRANSCRIPT_SERVICE_ERROR: {
    title: 'Oops, Something Went Wrong',
    message: 'We experienced an unexpected error while processing your video. Your request is received and we\'re working on it. Please try another video or try again in a few minutes.',
    variant: 'error',
    shouldRedirect: false,
    actions: [
      { label: 'Try Again', variant: 'primary', onClick: 'retry' },
      { label: 'Cancel', variant: 'ghost', onClick: 'close' }
    ]
  },

  TRANSCRIPT_RATE_LIMIT: {
    title: 'Too Many Requests',
    message: 'We\'re experiencing high demand right now. Please wait a few minutes before trying again.',
    variant: 'warning',
    shouldRedirect: false,
    actions: [
      { label: 'OK', variant: 'primary', onClick: 'close' }
    ]
  },

  TRANSCRIPT_TIMEOUT: {
    title: 'Request Timed Out',
    message: 'The transcript extraction took longer than expected. This might happen with very long videos or during high server load. Please try again.',
    variant: 'warning',
    shouldRedirect: false,
    actions: [
      { label: 'Try Again', variant: 'primary', onClick: 'retry' },
      { label: 'Cancel', variant: 'ghost', onClick: 'close' }
    ]
  },

  // LLM Errors
  LLM_PARTIAL_FAILURE: {
    title: 'Some Materials Couldn\'t Be Generated',
    message: 'Good news! We\'ve processed your video and transcript. While we experienced an issue generating some materials, you can still access your transcript, take notes, and use all Learn tab features.',
    variant: 'warning',
    shouldRedirect: true,
    actions: [
      { label: 'I Understand', variant: 'primary', onClick: 'close' }
    ]
  },

  LLM_TOKEN_LIMIT: {
    title: 'Video Too Long',
    message: 'This video\'s transcript is too long to process. Our AI can handle videos up to a certain length. Please try a shorter video.',
    variant: 'error',
    shouldRedirect: false,
    actions: [
      { label: 'Choose Different Video', variant: 'primary', onClick: 'chooseDifferentVideo' },
      { label: 'Cancel', variant: 'ghost', onClick: 'close' }
    ]
  },

  LLM_RATE_LIMIT: {
    title: 'Too Many Requests',
    message: 'We\'re experiencing high demand right now. Your video and transcript have been saved! Please wait a few minutes before trying again.',
    variant: 'warning',
    shouldRedirect: true,
    actions: [
      { label: 'OK', variant: 'primary', onClick: 'close' }
    ]
  },

  LLM_SERVICE_ERROR: {
    title: 'Generation Service Unavailable',
    message: 'Our AI service experienced an unexpected error. Your video and transcript are safely saved. Please try generating materials again in a few moments.',
    variant: 'error',
    shouldRedirect: true,
    actions: [
      { label: 'OK', variant: 'primary', onClick: 'close' }
    ]
  },

  LLM_AUTHENTICATION: {
    title: 'API Configuration Error',
    message: 'There\'s an issue with our AI service configuration. Our team has been notified. Please contact support if this persists.',
    variant: 'error',
    shouldRedirect: false,
    actions: [
      { label: 'OK', variant: 'primary', onClick: 'close' }
    ]
  },

  LLM_PERMISSION_DENIED: {
    title: 'Permission Error',
    message: 'Our AI service lacks the required permissions. Our team has been notified. Please contact support.',
    variant: 'error',
    shouldRedirect: false,
    actions: [
      { label: 'OK', variant: 'primary', onClick: 'close' }
    ]
  },

  LLM_INVALID_REQUEST: {
    title: 'Invalid Request',
    message: 'There was an issue with the request format. This is a bug on our end. Our team has been notified.',
    variant: 'error',
    shouldRedirect: false,
    actions: [
      { label: 'OK', variant: 'primary', onClick: 'close' }
    ]
  },

  LLM_CONTENT_FILTERED_SAFETY: {
    title: 'Content Blocked',
    message: 'This video\'s content was blocked by our safety filters. Please try a different video.',
    variant: 'warning',
    shouldRedirect: false,
    actions: [
      { label: 'Choose Different Video', variant: 'primary', onClick: 'chooseDifferentVideo' },
      { label: 'Cancel', variant: 'ghost', onClick: 'close' }
    ]
  },

  LLM_CONTENT_FILTERED_RECITATION: {
    title: 'Content Similarity Issue',
    message: 'This video\'s content is too similar to existing training data and cannot be processed. Please try a different video.',
    variant: 'warning',
    shouldRedirect: false,
    actions: [
      { label: 'Choose Different Video', variant: 'primary', onClick: 'chooseDifferentVideo' },
      { label: 'Cancel', variant: 'ghost', onClick: 'close' }
    ]
  },

  LLM_TIMEOUT: {
    title: 'Request Timed Out',
    message: 'The AI processing took longer than expected. This might be due to high server load. Your video and transcript are saved. Please try again in a few moments.',
    variant: 'warning',
    shouldRedirect: true,
    actions: [
      { label: 'OK', variant: 'primary', onClick: 'close' }
    ]
  },

  LLM_UNAVAILABLE: {
    title: 'Service Temporarily Unavailable',
    message: 'Our AI service is temporarily overloaded or undergoing maintenance. Your video and transcript are safely saved. Please try again in a few minutes.',
    variant: 'warning',
    shouldRedirect: true,
    actions: [
      { label: 'OK', variant: 'primary', onClick: 'close' }
    ]
  },

  LLM_OUTPUT_LIMIT: {
    title: 'Output Too Large',
    message: 'The AI generated too much content for this video. We\'re working on optimizing this. Your video and transcript are saved.',
    variant: 'warning',
    shouldRedirect: true,
    actions: [
      { label: 'OK', variant: 'primary', onClick: 'close' }
    ]
  },

  // General Errors
  NETWORK_ERROR: {
    title: 'Connection Failed',
    message: 'Unable to connect to our servers. Please check your internet connection and try again.',
    variant: 'error',
    shouldRedirect: false,
    actions: [
      { label: 'Try Again', variant: 'primary', onClick: 'retry' },
      { label: 'Cancel', variant: 'ghost', onClick: 'close' }
    ]
  },

  INVALID_URL: {
    title: 'Invalid YouTube URL',
    message: 'The URL you entered doesn\'t appear to be a valid YouTube video link. Please check the URL and try again.',
    variant: 'warning',
    shouldRedirect: false,
    actions: [
      { label: 'OK', variant: 'primary', onClick: 'close' }
    ]
  },

  DUPLICATE_VIDEO: {
    title: 'Video Already Processed',
    message: 'You\'ve already processed this video! Your learning materials are ready to access in your gallery.',
    variant: 'info',
    shouldRedirect: false,
    actions: [
      { label: 'View Existing', variant: 'primary', onClick: 'viewExisting' },
      { label: 'Cancel', variant: 'ghost', onClick: 'close' }
    ]
  },

  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'We encountered an unexpected error. Our team has been notified. Please try again or contact support if the issue persists.',
    variant: 'error',
    shouldRedirect: false,
    actions: [
      { label: 'Try Again', variant: 'primary', onClick: 'retry' },
      { label: 'Cancel', variant: 'ghost', onClick: 'close' }
    ]
  }
};

/**
 * Helper function to get error message configuration
 * Falls back to UNKNOWN_ERROR if error type not found
 */
export function getErrorConfig(errorType: string): ErrorMessageConfig {
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES['UNKNOWN_ERROR'];
}

/**
 * Helper function to check if error should redirect to generations page
 */
export function shouldRedirectOnError(errorType: string): boolean {
  const config = getErrorConfig(errorType);
  return config.shouldRedirect;
}
