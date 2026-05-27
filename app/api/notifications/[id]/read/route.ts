import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { Notification } from '@/src/models/Notification';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const { id } = await context.params;

    await connectDB();

    const notification = await Notification.findById(id);

    if (!notification) {
      return sendError('Notification not found', null, 404);
    }

    if (notification.userId.toString() !== session.userId) {
      return sendError('Forbidden', null, 403);
    }

    notification.isRead = true;
    await notification.save();

    return sendSuccess(notification);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
