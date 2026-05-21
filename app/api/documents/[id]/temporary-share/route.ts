import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { prisma } from '@/src/prisma';
import { decryptPrivateKey, decryptKeyWithRSA } from '@/src/crypto';
import { createTemporaryShare } from '@/src/lib/temporaryShareStore';
import os from 'os';

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

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
    const expiresInMinutes = Number(body.expiresInMinutes ?? 60);
    const maxAccess = Number(body.maxAccess ?? 10);

    if (!vaultPassword) {
      return sendError('Vault password is required', null, 400);
    }

    const { id } = await context.params;
    const ownerAccess = await prisma.sharedAccess.findUnique({
      where: { documentId_userId: { documentId: id, userId: session.userId } },
      include: { user: true, document: true }
    });

    if (!ownerAccess || ownerAccess.document.status !== 'ACTIVE') {
      return sendError('Document not found or access denied', null, 403);
    }

    let ownerPrivateKeyPEM: string;
    try {
      ownerPrivateKeyPEM = decryptPrivateKey(ownerAccess.user.encryptedPrivKey, vaultPassword);
    } catch (error) {
      return sendError('Invalid vault password provided', null, 403);
    }

    const aesKey = decryptKeyWithRSA(ownerAccess.encryptedFileKey, ownerPrivateKeyPEM);

    const share = await createTemporaryShare(
      id,
      session.userId,
      ownerAccess.document.mimeType,
      ownerAccess.document.originalName,
      aesKey,
      expiresInMinutes > 0 ? expiresInMinutes : 60,
      maxAccess > 0 ? maxAccess : 10
    );

    let origin = request.nextUrl.origin;
    if (origin.includes('localhost')) {
      const localIp = getLocalIp();
      origin = origin.replace('localhost', localIp);
    }

    const shareUrl = `${origin}/temporary-share/${share.token}`;
    return sendSuccess({ shareUrl, token: share.token, expiresAt: share.expiresAt, maxAccess: share.maxAccess }, 'Temporary share created');
  } catch (error: unknown) {
    return sendError('Failed to create temporary share', error, 500);
  }
}
