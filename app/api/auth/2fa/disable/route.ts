import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { User } from '@/src/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    await connectDB();
    const user = await User.findById(session.userId);
    
    if (!user) {
      return sendError('User not found', null, 404);
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    return sendSuccess(null, '2FA has been disabled');
  } catch (error: unknown) {
    return sendError('Failed to disable 2FA', error, 500);
  }
}
