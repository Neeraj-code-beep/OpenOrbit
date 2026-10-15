import mongoose from 'mongoose';
import { env } from './env.js';

let isConnecting = false;

/**
 * Sanitizes a MongoDB connection URI to avoid logging passwords or user credentials
 * @param {string} uri
 * @returns {string}
 */
export function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

/**
 * Connects to MongoDB with Mongoose
 * Reuses existing connection if already established
 * @param {string} [customUri]
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB(customUri) {
  const uri = customUri || env.MONGODB_URI;

  // 1 = connected, 2 = connecting
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (isConnecting) {
    // Wait for in-flight connection
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', () => resolve(mongoose));
      mongoose.connection.once('error', (err) => reject(err));
    });
  }

  isConnecting = true;
  const sanitizedUri = sanitizeMongoUri(uri);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: env.NODE_ENV !== 'production', // Build indexes in dev, manage in prod
    });

    isConnecting = false;
    console.log(`🍃 [MongoDB] Connected successfully to ${sanitizedUri}`);
    return conn;
  } catch (err) {
    isConnecting = false;
    const safeErrorMsg = err.message.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.error(`❌ [MongoDB] Connection failed (${sanitizedUri}): ${safeErrorMsg}`);
    throw new Error(`MongoDB connection error: ${safeErrorMsg}`);
  }
}

/**
 * Disconnects from MongoDB cleanly
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🍃 [MongoDB] Disconnected cleanly');
  }
}

/**
 * Returns current database connection status
 * @returns {{ readyState: number, status: 'DISCONNECTED'|'CONNECTED'|'CONNECTING'|'DISCONNECTING' }}
 */
export function getDBStatus() {
  const stateMap = {
    0: 'DISCONNECTED',
    1: 'CONNECTED',
    2: 'CONNECTING',
    3: 'DISCONNECTING',
  };
  const state = mongoose.connection.readyState;
  return {
    readyState: state,
    status: stateMap[state] || 'UNKNOWN',
  };
}
