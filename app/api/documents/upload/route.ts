import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { DocumentService } from '@/src/services/document.service';

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawVaultPassword = formData.get('vaultPassword');
    const vaultPassword = typeof rawVaultPassword === 'string' ? rawVaultPassword.trim() : null;
    
    const rawShareCode = formData.get('shareCode');
    const shareCode = typeof rawShareCode === 'string' && rawShareCode.trim() !== '' ? rawShareCode.trim() : undefined;

    if (!file) {
      return sendError('File is required', null, 400);
    }
    if (!vaultPassword) {
      return sendError('Vault password is required for signing', null, 400);
    }

    const doc = await DocumentService.uploadDocument(session.userId, vaultPassword, file, shareCode);
    return sendSuccess(doc, 'File uploaded securely', 201);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('password')) {
      return sendError(err.message, null, 403);
    }
    return sendError('Internal server error during upload', error, 500);
  }
}
