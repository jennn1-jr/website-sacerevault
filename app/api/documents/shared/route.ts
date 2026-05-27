import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { SharedAccess } from '@/src/models/SharedAccess';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    await connectDB();

    const sharedAccesses = await SharedAccess.find({ userId: session.userId })
      .populate({
        path: 'documentId',
        match: { ownerId: { $ne: session.userId }, status: 'ACTIVE' },
        select: 'id title mimeType size createdAt ownerId',
        populate: {
          path: 'ownerId',
          select: 'name email'
        }
      });

    // Filter out access records where the document was excluded by the match condition or deleted
    const validAccesses = sharedAccesses.filter((access: any) => access.documentId != null);

    const documents = validAccesses.map((access: any) => ({
      id: access.documentId._id.toString(),
      title: access.documentId.title,
      mimeType: access.documentId.mimeType,
      size: access.documentId.size.toString(),
      createdAt: access.documentId.createdAt,
      owner: {
        name: access.documentId.ownerId.name,
        email: access.documentId.ownerId.email
      },
      grantedBy: access.grantedBy.toString()
    }));

    // Sort by createdAt desc (since we couldn't easily do it at the DB level for nested populations)
    documents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return sendSuccess(documents);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
