import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { DocumentService } from '@/src/services/document.service';

export async function POST(
  request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const body = await request.json();
    const vaultPassword = body.vaultPassword ?? body.password;
    const { targetEmail } = body;
    if (!vaultPassword || !targetEmail) {
      return sendError('Vault password and targetEmail are required', null, 400);
    }

    const { id } = await context.params;

    const result = await DocumentService.shareDocument(session.userId, vaultPassword, id, targetEmail);
    return sendSuccess(result, 'Document shared successfully');
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('not found')) {
      return sendError(err.message, null, 404);
    }
    if (err.message.includes('already shared') || err.message.includes('access')) {
      return sendError(err.message, null, 403);
    }
    return sendError('Internal server error during sharing', error, 500);
  }
}
