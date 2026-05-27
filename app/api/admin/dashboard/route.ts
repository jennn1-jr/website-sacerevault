import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { User } from '@/src/models/User';
import { Document as DocumentModel } from '@/src/models/Document';
import { ActivityLog } from '@/src/models/ActivityLog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'ADMIN') {
      return sendError('Unauthorized - Admin access required', null, 403);
    }

    await connectDB();

    const totalUsers = await User.countDocuments();
    const totalDocuments = await DocumentModel.countDocuments({ status: 'ACTIVE' });
    
    // Calculate total size using aggregate
    const sizeAggregate = await DocumentModel.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: null, totalSize: { $sum: "$size" } } }
    ]);

    const totalSize = sizeAggregate.length > 0 ? sizeAggregate[0].totalSize : 0;

    const recentActivity = await ActivityLog.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email');

    return sendSuccess({
      stats: {
        totalUsers,
        totalDocuments,
        totalSizeBytes: totalSize
      },
      recentActivity
    });
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
