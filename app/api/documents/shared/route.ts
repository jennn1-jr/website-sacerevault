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

    const sharedAccesses = await prisma.sharedAccess.findMany({
      where: { 
        userId: session.userId,
        // Exclude documents that they own themselves (if we want this only for shared BY others)
        document: { ownerId: { not: session.userId } }
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            mimeType: true,
            size: true,
            createdAt: true,
            owner: { select: { name: true, email: true } }
          }
        }
      },
      orderBy: { document: { createdAt: 'desc' } }
    });

    const documents = sharedAccesses.map((access) => ({
      id: access.document.id,
      title: access.document.title,
      mimeType: access.document.mimeType,
      size: access.document.size.toString(),
      createdAt: access.document.createdAt,
      owner: access.document.owner,
      grantedBy: access.grantedBy
    }));

    return sendSuccess(documents);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
