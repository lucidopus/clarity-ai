import mongoose from 'mongoose';
import { validateEnv } from '@/lib/env';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongoose: MongooseCache | undefined;
}

const globalCache = globalThis as typeof globalThis & { mongoose?: MongooseCache };

const cached: MongooseCache = globalCache.mongoose ?? (globalCache.mongoose = { conn: null, promise: null });

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  // Validate env on first connection (not on import) so the Trigger.dev indexer
  // can load task files without requiring runtime secrets at build time.
  const { MONGODB_URI } = validateEnv();

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
