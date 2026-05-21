import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { prisma } from '@/src/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
        // Never return publicKey or encryptedPrivKey to standard user API responses unless strictly needed for client-side crypto
      }
    });

    if (!user) {
      return sendError('User not found', null, 404);
    }

    return sendSuccess(user);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
