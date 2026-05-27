import mongoose from 'mongoose';

const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('mongodb+srv://<username>:<password>@cluster0.xxxxxx.mongodb.net/securevault?retryWrites=true&w=majority');
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
