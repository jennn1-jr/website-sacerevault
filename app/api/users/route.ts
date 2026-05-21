import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { prisma } from '@/src/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'ADMIN') {
      return sendError('Unauthorized - Admin access required', null, 403);
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(users);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
