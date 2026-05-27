import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { User } from '@/src/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    await connectDB();

    const user = await User.findById(session.userId).select('id name email role createdAt');

    if (!user) {
      return sendError('User not found', null, 404);
    }

    return sendSuccess({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
