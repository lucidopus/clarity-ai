import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function checkChatbotRateLimit(
  userId: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}> {
  await dbConnect();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected');
  }

  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  const minuteStart = new Date(Date.now() - 60 * 1000); // 1 minute ago

  // Check 24-hour limit
  const dailyMessages = await db.collection('chatlogs').countDocuments({
    userId: userId,
    role: 'user',
    timestamp: { $gte: windowStart }
  });

  // Check 1-minute limit (10 messages per minute)
  const minuteMessages = await db.collection('chatlogs').countDocuments({
    userId: userId,
    role: 'user',
    timestamp: { $gte: minuteStart }
  });

  const allowed = dailyMessages < 20 && minuteMessages < 10;
  const remaining = Math.min(20 - dailyMessages, 10 - minuteMessages);
  const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Next day

  let retryAfter: number | undefined;
  if (!allowed) {
    if (minuteMessages >= 10) {
      retryAfter = 60 - Math.floor((Date.now() - minuteStart.getTime()) / 1000);
    } else {
      retryAfter = Math.floor((24 * 60 * 60 * 1000 - (Date.now() - windowStart.getTime())) / 1000);
    }
  }

  return {
    allowed,
    remaining,
    resetTime,
    retryAfter
  };
}