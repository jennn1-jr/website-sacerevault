import mongoose from 'mongoose';

const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI or DATABASE_URL is not defined in environment variables. Database connections will fail.');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined. Please define it in Vercel Environment Variables or .env.local');
    }
    
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
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
