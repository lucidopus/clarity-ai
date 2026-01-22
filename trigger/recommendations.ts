import { task, schedules, logger, auth } from "@trigger.dev/sdk";

// Explicitly configure authentication to ensure client-side triggering works
auth.configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

import mongoose from "mongoose";
import { Redis } from "ioredis";
import User from "../lib/models/User";
import Video from "../lib/models/Video";
import { RECOMMENDATION_CONSTANTS } from "../lib/config";

/**
 * Scheduled Task: Trigger Recommendation Update for ALL Users
 * Cron: Runs every 6 hours
 */
export const scheduleRecommendationUpdates = schedules.task({
  id: "schedule-recommendation-updates",
  // cron: "0 */6 * * *", // Every 6 hours at minute 0
  run: async (payload) => {
    logger.info("🕒 Starting scheduled recommendation update...", { time: payload.timestamp });

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not set");
    }

    // Connect to MongoDB
    // Note: In Trigger.dev workers, we manage the connection lifecycle explicitly in the run
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // 1. Fetch all active users who have an embedding
    // We only want users who have actually onboarded
    const users = await User.find({ 
      'preferences.embedding': { $exists: true, $ne: [] } 
    }).select('_id username');

    logger.info(`👥 Found ${users.length} users to update.`);

    // 2. Trigger sub-tasks for each user (Fan-out)
    // We batch triggers to avoid overwhelming the system if we have millions of users later
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const triggerPromises = batch.map(user => 
        generateUserRecommendations.trigger({ 
          userId: user._id.toString(),
          username: user.username 
        })
      );

      await Promise.all(triggerPromises);
      logger.info(`   ↳ Triggered batch ${i / batchSize + 1} (${batch.length} users)`);
    }

    return { 
      processedUsers: users.length, 
      status: "Fan-out complete" 
    };
  },
});

/**
 * Worker Task: Generate Recommendations for a Single User (Logic A)
 * - Vector Search
 * - Caching to Redis
 */
export const generateUserRecommendations = task({
  id: "generate-user-recommendations",
  // Set a reasonable timeout for vector search + redis operations
  maxDuration: 300, 
  run: async (payload: { userId: string; username: string }) => {
    const { userId, username } = payload;
    
    logger.info(`🔍 Generating recommendations for ${username} (${userId})`);

    // 1. Setup Connections
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
    if (!process.env.REDIS_URL) throw new Error("REDIS_URL missing");

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const redis = new Redis(process.env.REDIS_URL);

    try {
      // 2. Fetch User Vector
      const user = await User.findById(userId).select('preferences.embedding');
      if (!user || !user.preferences?.embedding) {
        logger.warn("User has no embedding, skipping.", { userId });
        return { status: "skipped" };
      }

      const userVector = user.preferences.embedding;

      // 3. Perform Vector Search (Logic A)
      const pipeline = [
        {
          $vectorSearch: {
            index: RECOMMENDATION_CONSTANTS.VECTOR_INDEX_NAME, // "vector_index"
            path: "embedding",
            queryVector: userVector,
            numCandidates: RECOMMENDATION_CONSTANTS.VECTOR_SEARCH_CANDIDATES, // 1000
            limit: RECOMMENDATION_CONSTANTS.CANDIDATE_LIMIT // 150
          }
        },
        {
            $project: {
                _id: 1,
                videoId: 1,
                title: 1,
                category: 1,
                score: { $meta: "vectorSearchScore" }
            }
        }
      ];

      const candidates = await Video.aggregate(pipeline);
      
      if (candidates.length === 0) {
          logger.warn("No candidates found via vector search. Is the index ready?");
      }

      logger.info(`✅ Found ${candidates.length} candidates for ${username}`);

      // 4. Cache to Redis (TTL: 24 hours)
      // Key: discover_pool:{userId}
      const redisKey = `discover_pool:${userId}`;
      const cachePayload = JSON.stringify({
          updatedAt: new Date().toISOString(),
          candidates: candidates.map(c => ({
              _id: c._id, 
              videoId: c.videoId, 
              score: c.score, 
              category: c.category 
          }))
      });

      await redis.set(redisKey, cachePayload, 'EX', RECOMMENDATION_CONSTANTS.CACHE_TTL_SECONDS);

      return { 
        userId, 
        candidateCount: candidates.length, 
        status: "success" 
      };

    } catch (error) {
      logger.error("Error generating recommendations", { error });
      throw error;
    } finally {
      // Cleanup Redis connection to prevent leaks in shared environment
      redis.disconnect();
    }
  },
});
