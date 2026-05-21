import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { prisma } from '@/src/prisma';

// GET: Fetch user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20, // Limit to recent 20 for now
    });

    return sendSuccess(notifications);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}

// POST: Send a notification (e.g., share code) to a user
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const body = await request.json();
    const { targetUserId, email, title, message, type, data } = body;

    if ((!targetUserId && !email) || !title || !message || !type) {
      return sendError('Missing required fields', null, 400);
    }

    let targetId = targetUserId;
    if (!targetId && email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return sendError('Pengguna dengan email tersebut tidak ditemukan', null, 404);
      }
      targetId = user.id;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: targetId,
        title,
        message,
        type,
        data: data || null,
      },
    });

    return sendSuccess(notification, 'Notification sent', 201);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
