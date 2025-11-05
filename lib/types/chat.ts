/**
 * Chat message stored in MongoDB
 * Following the pattern from portfolio project
 */
export interface ChatMessage {
  _id?: string;
  sessionId: string; // Combination of userId + videoId for session tracking
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userId: string; // For user tracking and analytics
  videoId: string; // For video-specific context
  ipHash?: string; // SHA256 hash of IP address for analytics/rate limiting
}

/**
 * Session identifier format: userId_videoId
 * This ensures each user has separate chat histories per video
 */
export function generateSessionId(userId: string, videoId: string): string {
  return `${userId}_${videoId}`;
}

/**
 * Generate unique message ID
 */
export function generateMessageId(role: 'user' | 'assistant'): string {
  return `${Date.now()}_${role}`;
}
