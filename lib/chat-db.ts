import { MongoClient, Db, Collection } from 'mongodb';
import dbConnect from './mongodb';
import crypto from 'crypto';
import { ChatMessage } from './types/chat';

let cachedDb: Db | null = null;

/**
 * Get MongoDB database instance
 */
async function getDb(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  await dbConnect();

  const client = await MongoClient.connect(process.env.MONGODB_URI!);
  cachedDb = client.db('clarity-ai');

  return cachedDb;
}

/**
 * Get chats collection
 */
async function getChatsCollection(): Promise<Collection<ChatMessage>> {
  const db = await getDb();
  return db.collection<ChatMessage>('chats');
}

/**
 * Hash IP address for privacy (SHA256)
 */
export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Save a single chat message to MongoDB
 *
 * @param sessionId - Unique session identifier (userId_videoId)
 * @param messageId - Unique message identifier
 * @param role - 'user' or 'assistant'
 * @param content - Message content
 * @param userId - User ID
 * @param videoId - Video ID
 * @param ip - Optional IP address (will be hashed)
 */
export async function saveChatMessage(
  sessionId: string,
  messageId: string,
  role: 'user' | 'assistant',
  content: string,
  userId: string,
  videoId: string,
  ip?: string
): Promise<void> {
  try {
    const chats = await getChatsCollection();

    const message: ChatMessage = {
      sessionId,
      messageId,
      role,
      content,
      timestamp: new Date(),
      userId,
      videoId,
      ...(ip && { ipHash: hashIP(ip) })
    };

    await chats.insertOne(message);
  } catch (error) {
    console.error('Failed to save chat message:', error);
    throw error;
  }
}

/**
 * Load chat history for a session
 *
 * @param sessionId - Session identifier (userId_videoId)
 * @param limit - Maximum number of messages to retrieve (default: 50)
 * @returns Array of chat messages sorted by timestamp (oldest first)
 */
export async function loadChatHistory(
  sessionId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  try {
    const chats = await getChatsCollection();

    const messages = await chats
      .find({ sessionId })
      .sort({ timestamp: 1 }) // Oldest first
      .limit(limit)
      .toArray();

    return messages;
  } catch (error) {
    console.error('Failed to load chat history:', error);
    throw error;
  }
}

/**
 * Delete all messages for a session (clear conversation)
 *
 * @param sessionId - Session identifier (userId_videoId)
 */
export async function deleteChatHistory(sessionId: string): Promise<void> {
  try {
    const chats = await getChatsCollection();
    await chats.deleteMany({ sessionId });
  } catch (error) {
    console.error('Failed to delete chat history:', error);
    throw error;
  }
}

/**
 * Create indexes for the chats collection
 * Should be called once during app initialization
 *
 * Indexes:
 * 1. Compound index: sessionId + role + timestamp (for rate limiting queries)
 * 2. TTL index: timestamp (auto-delete after 30 days)
 */
export async function createChatIndexes(): Promise<void> {
  try {
    const chats = await getChatsCollection();

    // Compound index for efficient session queries
    await chats.createIndex(
      { sessionId: 1, role: 1, timestamp: 1 },
      { name: 'session_role_timestamp_idx' }
    );

    // TTL index - auto-delete messages after 30 days
    await chats.createIndex(
      { timestamp: 1 },
      {
        name: 'timestamp_ttl_idx',
        expireAfterSeconds: 30 * 24 * 60 * 60 // 30 days in seconds
      }
    );

    console.log('Chat indexes created successfully');
  } catch (error) {
    console.error('Failed to create chat indexes:', error);
    throw error;
  }
}

/**
 * Get chat statistics for a user
 *
 * @param userId - User ID
 * @returns Total messages sent by user
 */
export async function getChatStats(userId: string): Promise<{
  totalMessages: number;
  totalSessions: number;
}> {
  try {
    const chats = await getChatsCollection();

    const totalMessages = await chats.countDocuments({
      userId,
      role: 'user'
    });

    const sessions = await chats.distinct('sessionId', { userId });

    return {
      totalMessages,
      totalSessions: sessions.length
    };
  } catch (error) {
    console.error('Failed to get chat stats:', error);
    throw error;
  }
}
