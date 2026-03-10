// MongoDB connection helper

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

// Note: we avoid throwing at import time so builds without a real database
// will still succeed. The check is performed when attempting to connect.


let cached: any = globalThis;

if (!cached.mongoose) {
  cached.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (cached.mongoose.conn) {
    return cached.mongoose.conn;
  }
  if (!cached.mongoose.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.mongoose.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.mongoose.conn = await cached.mongoose.promise;
  return cached.mongoose.conn;
}
