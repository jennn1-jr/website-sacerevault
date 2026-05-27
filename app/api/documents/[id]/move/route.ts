import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { Document } from '@/src/models/Document';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const { id } = await context.params;
    const body = await request.json();
    const folderId = body.folderId; // can be null (root) or string

    await connectDB();
    
    // Verify ownership
    const doc = await Document.findOne({ _id: id, ownerId: session.userId });
    if (!doc) {
      return sendError('Document not found or access denied', null, 404);
    }

    doc.folderId = folderId || null;
    await doc.save();

    return sendSuccess(null, 'Document moved successfully');
  } catch (error: unknown) {
    return sendError('Failed to move document', error, 500);
  }
}
