import mongoose from 'mongoose';
import ActivityLog, { type ActivityType } from '@/lib/models/ActivityLog';

/**
 * Server-side activity logger for use in API routes where
 * the user may not have a JWT yet (e.g., email verification).
 * Best-effort — never throws.
 */
export async function logServerActivity(
  userId: mongoose.Types.ObjectId | string,
  activityType: ActivityType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    await ActivityLog.create({
      userId,
      activityType,
      date: startOfDay,
      timestamp: now,
      metadata,
    });
  } catch (error) {
    console.error(`[SERVER ACTIVITY LOG] Failed to log ${activityType}:`, error);
  }
}
