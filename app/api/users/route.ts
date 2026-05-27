import { NextRequest } from 'next/server';
import { connectDB } from '@/src/lib/mongoose';
import User from '@/src/models/User';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';

// Handler untuk GET data users (Admin Only)
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'ADMIN') {
      return sendError('Unauthorized - Admin access required', null, 403);
    }

    await connectDB();
    const users = await User.find({}).select('-passwordHash -encryptedPrivKey');
    return sendSuccess(users);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}

// Handler untuk POST data user baru (Admin Only)
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'ADMIN') {
      return sendError('Unauthorized - Admin access required', null, 403);
    }

    await connectDB();
    const body = await request.json();
    
    if (!body.email || !body.name) {
      return sendError('Email and name are required', null, 400);
    }

    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return sendError('Email already registered', null, 409);
    }

    const newUser = await User.create(body);
    return sendSuccess(newUser, 'User created successfully', 201);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}