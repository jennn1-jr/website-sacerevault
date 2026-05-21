import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { DocumentService } from '@/src/services/document.service';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const { id } = await context.params;
    const result = await DocumentService.deleteDocument(session.userId, id);
    return sendSuccess(result, 'Document deleted successfully');
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('not found') || err.message.includes('access denied')) {
      return sendError(err.message, null, 404);
    }
    return sendError('Internal server error during delete', error, 500);
  }
}
