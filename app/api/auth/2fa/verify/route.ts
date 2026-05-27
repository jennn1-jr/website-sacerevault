import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { User } from '@/src/models/User';
import speakeasy from 'speakeasy';

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return sendError('Token is required', null, 400);
    }

    await connectDB();
    const user = await User.findById(session.userId);
    
    if (!user) {
      return sendError('User not found', null, 404);
    }

    if (!user.twoFactorSecret) {
      return sendError('2FA setup not initiated', null, 400);
    }

    // Verify token
    const isValid = speakeasy.totp.verify({ token, secret: user.twoFactorSecret, encoding: 'base32' });

    if (!isValid) {
      return sendError('Invalid 2FA code', null, 400);
    }

    // Enable 2FA
    user.isTwoFactorEnabled = true;
    await user.save();

    return sendSuccess(null, '2FA has been successfully enabled');
  } catch (error: unknown) {
    return sendError('Failed to verify 2FA', error, 500);
  }
}
