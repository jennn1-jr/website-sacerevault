import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { ActivityLog } from '@/src/models/ActivityLog';
import { SharedAccess } from '@/src/models/SharedAccess';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    await connectDB();
    const { id } = await context.params;

    // Verify ownership
    const ownerAccess = await SharedAccess.findOne({ documentId: id, userId: session.userId });
    if (!ownerAccess) {
      return sendError('Document not found or access denied', null, 403);
    }

    const logs = await ActivityLog.find({ resourceId: id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const serializedLogs = logs.map((log) => ({
      id: log._id.toString(),
      action: log.action,
      userName: log.userId ? (log.userId as any).name : 'Guest',
      userEmail: log.userId ? (log.userId as any).email : 'Unknown',
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      details: log.details || '',
      status: log.status,
      createdAt: log.createdAt
    }));

    return sendSuccess(serializedLogs, 'Activity logs retrieved successfully');
  } catch (error: unknown) {
    return sendError('Failed to retrieve activity logs', error, 500);
  }
}
