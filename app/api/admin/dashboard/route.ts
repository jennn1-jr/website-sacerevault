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

    const totalUsers = await prisma.user.count();
    const totalDocuments = await prisma.document.count({ where: { status: 'ACTIVE' } });
    
    // Calculate total size using aggregate
    const sizeAggregate = await prisma.document.aggregate({
      _sum: { size: true },
      where: { status: 'ACTIVE' }
    });

    const totalSize = sizeAggregate._sum.size ? Number(sizeAggregate._sum.size) : 0;

    const recentActivity = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    });

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
