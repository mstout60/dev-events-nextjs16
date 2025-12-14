import mongoose from "mongoose";

// Extend the global namespace to include the mongoose cache
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global cache to store the MongoDB connection.
 * In development, Next.js hot reloading can create multiple connections.
 * This cache ensures we reuse the same connection across hot reloads.
 */
let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

/**
 * Establishes a connection to MongoDB using Mongoose.
 * Reuses existing connections when available to prevent connection pool exhaustion.
 *
 * @returns Promise that resolves to the MongoDB connection
 */
async function connectDB(): Promise<mongoose.Connection> {
  // Return cached connection if it exists
  if (cached.conn) {
    return cached.conn;
  }

  // If no promise exists, create a new connection
  if (!cached.promise) {
    if (!MONGODB_URI) {
      throw new Error("Please define the MONGODB_URI environment variable .env ");
    }
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false, // Disable Mongoose buffering to fail fast on connection issues
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose.connection;
    });
  }

  // Wait for the connection promise to resolve
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset promise on error to allow retry
    throw e;
  }

  return cached.conn;
}

export default connectDB;
