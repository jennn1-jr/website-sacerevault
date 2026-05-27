import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { Notification } from '@/src/models/Notification';
import { User } from '@/src/models/User';

// GET: Fetch user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    await connectDB();

    const notifications = await Notification.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    const formattedNotifications = notifications.map(n => ({
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      data: n.data,
      isRead: n.isRead,
      createdAt: n.createdAt
    }));

    return sendSuccess(formattedNotifications);
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

    await connectDB();

    let targetId = targetUserId;
    if (!targetId && email) {
      const user = await User.findOne({ email });
      if (!user) {
        return sendError('Pengguna dengan email tersebut tidak ditemukan', null, 404);
      }
      targetId = user._id;
    }

    const notification = await Notification.create({
      userId: targetId,
      title,
      message,
      type,
      data: data || null,
    });

    return sendSuccess(notification, 'Notification sent', 201);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
