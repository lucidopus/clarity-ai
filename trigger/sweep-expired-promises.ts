import { schedules, logger } from "@trigger.dev/sdk";
import mongoose from "mongoose";
import { sweepExpiredStudyPromises } from "../lib/services/studyPromise";

/**
 * Clarity Mode — scheduled sweep that rolls pending Promises older than
 * `CLARITY_MODE.promise.pendingTtlHours` (default 48h) to `outcome:
 * 'skipped'`.
 *
 * Correctness does NOT depend on this task: `getPendingStudyPromise`
 * filters by the TTL at read time, so a stale pending row is never shown
 * to the user. The sweep is housekeeping — it keeps the collection tidy
 * and frees the `{userId, sessionDate}` uniqueness slot for the next
 * session.
 */
export const sweepExpiredPromisesTask = schedules.task({
  id: "sweep-expired-promises",
  cron: "0 */6 * * *", // every 6h, UTC
  maxDuration: 120,
  run: async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const now = new Date();
    try {
      const modified = await sweepExpiredStudyPromises(now);
      logger.info(`🧹 Promise sweep complete: rolled ${modified} pending row(s) to skipped.`);
      return { modifiedCount: modified, at: now.toISOString() };
    } catch (error) {
      logger.error("💥 Promise sweep failed", {
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  },
});
