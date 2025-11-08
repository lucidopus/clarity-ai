/**
 * Chat message stored in MongoDB
 * Following the pattern from portfolio project
 *
 * Updated to support multiple conversation channels (chatbot, guide)
 */
export interface ChatMessage {
  _id?: string;
  sessionId: string; // LEGACY: Combination of userId + videoId (deprecated, use channel + contextId)
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userId: string; // For user tracking and analytics
  videoId: string; // For video-specific context
  ipHash?: string; // SHA256 hash of IP address for analytics/rate limiting

  // NEW FIELDS (Issue #39)
  channel?: 'chatbot' | 'guide'; // Conversation channel
  contextId?: string; // Context identifier (videoId for chatbot, problemId for guide)
  problemId?: string; // Problem ID (only for guide channel)
}

/**
 * Session identifier format: userId_videoId
 * This ensures each user has separate chat histories per video
 *
 * @deprecated Use generateContextId with channel parameter instead
 */
export function generateSessionId(userId: string, videoId: string): string {
  return `${userId}_${videoId}`;
}

/**
 * Generate context identifier based on channel
 * - For 'chatbot' channel: uses videoId
 * - For 'guide' channel: uses problemId
 */
export function generateContextId(
  channel: 'chatbot' | 'guide',
  videoId: string,
  problemId?: string
): string {
  if (channel === 'chatbot') {
    return videoId;
  } else if (channel === 'guide') {
    if (!problemId) {
      throw new Error('problemId is required for guide channel');
    }
    return problemId;
  }
  throw new Error(`Unknown channel: ${channel}`);
}

/**
 * Generate unique message ID
 */
export function generateMessageId(role: 'user' | 'assistant'): string {
  return `${Date.now()}_${role}`;
}
