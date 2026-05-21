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

    const documents = await prisma.document.findMany({
      where: { ownerId: session.userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        mimeType: true,
        size: true,
        createdAt: true,
        fileHash: true
      }
    });

    const serializedDocuments = documents.map((doc) => ({
      ...doc,
      size: doc.size.toString()
    }));

    return sendSuccess(serializedDocuments);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
