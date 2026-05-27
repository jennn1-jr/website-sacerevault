import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { Document } from '@/src/models/Document';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const folderIdParam = request.nextUrl.searchParams.get('folderId');
    let query: any = { ownerId: session.userId, status: 'ACTIVE' };
    
    await connectDB();

    // Default to root folder if not specified, unless they explicitly want all
    if (folderIdParam !== 'all') {
      query.folderId = folderIdParam && folderIdParam !== 'null' ? folderIdParam : null;
    }

    const documents = await Document.find(query)
      .select('id title mimeType size createdAt fileHash type folderId')
      .sort({ createdAt: -1 });

    const serializedDocuments = documents.map((doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      mimeType: doc.mimeType,
      size: doc.size.toString(),
      createdAt: doc.createdAt,
      fileHash: doc.fileHash,
      type: doc.type || 'FILE',
      folderId: doc.folderId ? doc.folderId.toString() : null
    }));

    return sendSuccess(serializedDocuments);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
