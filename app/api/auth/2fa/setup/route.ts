import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { User } from '@/src/models/User';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
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

    if (user.isTwoFactorEnabled) {
      return sendError('2FA is already enabled', null, 400);
    }

    // Generate a new secret
    const secret = speakeasy.generateSecret({ name: `lockArchive (${user.email})` });
    
    // Generate QR Code data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Save secret temporarily in user doc (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    return sendSuccess({
      secret: secret.base32,
      qrCodeUrl
    }, '2FA setup data generated');
  } catch (error: unknown) {
    return sendError('Failed to setup 2FA', error, 500);
  }
}
