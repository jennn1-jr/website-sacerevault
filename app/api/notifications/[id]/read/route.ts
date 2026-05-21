import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { prisma } from '@/src/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const { id } = params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return sendError('Notification not found', null, 404);
    }

    if (notification.userId !== session.userId) {
      return sendError('Forbidden', null, 403);
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return sendSuccess(updatedNotification);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
