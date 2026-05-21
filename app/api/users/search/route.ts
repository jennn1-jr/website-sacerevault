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

    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return sendError('Email parameter is required', null, 400);
    }

    // Exclude the current user from search results
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: email,
        },
        id: {
          not: session.userId,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 5,
    });

    return sendSuccess(users);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
