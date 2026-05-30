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

    const rawFolderId = formData.get('folderId');
    const folderId = typeof rawFolderId === 'string' && rawFolderId.trim() !== '' && rawFolderId !== 'null' ? rawFolderId.trim() : undefined;

    const docType = formData.get('type') === 'NOTE' ? 'NOTE' : 'FILE';
    
    const rawMode = formData.get('encryptionMode');
    const encryptionMode = typeof rawMode === 'string' && ['AES-GCM', 'AES-CBC', 'AES-CTR'].includes(rawMode) ? rawMode : 'AES-GCM';

    if (!file) {
      return sendError('File is required', null, 400);
    }
    if (!vaultPassword) {
      return sendError('Vault password is required for signing', null, 400);
    }

    const doc = await DocumentService.uploadDocument(session.userId, vaultPassword, file, shareCode, docType, folderId, encryptionMode);
    return sendSuccess(doc, 'File uploaded securely', 201);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('password')) {
      return sendError(err.message, null, 403);
    }
    if (err.message.includes('Kode share sudah digunakan')) {
      return sendError(err.message, null, 400);
    }
    return sendError('Internal server error during upload', error, 500);
  }
}
