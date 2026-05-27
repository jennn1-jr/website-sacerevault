import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { SharedAccess } from '@/src/models/SharedAccess';
import { ActivityLog } from '@/src/models/ActivityLog';
import { decryptPrivateKey, decryptKeyWithRSA } from '@/src/crypto';
import { createTemporaryShare } from '@/src/lib/temporaryShareStore';
import { sendShareEmail } from '@/src/utils/mailer';
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
    const passcode = body.passcode;
    const targetEmail = body.targetEmail;

    if (!vaultPassword) {
      return sendError('Vault password is required', null, 400);
    }

    await connectDB();
    const { id } = await context.params;

    const ownerAccess = await SharedAccess.findOne({ documentId: id, userId: session.userId })
      .populate('userId')
      .populate('documentId');

    if (!ownerAccess) {
      return sendError('Document not found or access denied', null, 403);
    }

    const document: any = ownerAccess.documentId;
    const user: any = ownerAccess.userId;

    if (!document || document.status !== 'ACTIVE') {
      return sendError('Document not found or access denied', null, 403);
    }

    let ownerPrivateKeyPEM: string;
    try {
      ownerPrivateKeyPEM = decryptPrivateKey(user.encryptedPrivKey, vaultPassword);
    } catch (error) {
      return sendError('Invalid vault password provided', null, 403);
    }

    const aesKey = decryptKeyWithRSA(ownerAccess.encryptedFileKey, ownerPrivateKeyPEM);

    const share = await createTemporaryShare(
      id,
      session.userId,
      document.mimeType,
      document.originalName,
      aesKey,
      expiresInMinutes > 0 ? expiresInMinutes : 60,
      maxAccess > 0 ? maxAccess : 10,
      undefined, // customToken
      passcode
    );

    let origin = request.nextUrl.origin;
    if (origin.includes('localhost')) {
      const localIp = getLocalIp();
      origin = origin.replace('localhost', localIp);
    }

    const shareUrl = `${origin}/temporary-share/${share.token}`;

    if (targetEmail) {
      await sendShareEmail(targetEmail, shareUrl, passcode, document.originalName);
    }

    // Log this activity
    await ActivityLog.create({
      userId: session.userId,
      action: 'SHARE_LINK_CREATED',
      resourceId: id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      details: targetEmail ? `Shared via Email to ${targetEmail}` : 'Generated generic share link (QR)',
      status: 'SUCCESS'
    });

    return sendSuccess({ shareUrl, token: share.token, expiresAt: share.expiresAt, maxAccess: share.maxAccess }, 'Temporary share created');
  } catch (error: unknown) {
    return sendError('Failed to create temporary share', error, 500);
  }
}
