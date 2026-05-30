import { NextRequest, NextResponse } from 'next/server';
import { sendError, sendSuccess } from '@/src/utils/response';
import {
  decryptTemporaryShareKey,
  getTemporaryShare,
  getTemporaryShareMetadata,
  incrementTemporaryShareAccess,
  verifyTemporarySharePasscode
} from '@/src/lib/temporaryShareStore';
import { DocumentService } from '@/src/services/document.service';
import { ActivityService } from '@/src/services/activity.service';
import { connectDB } from '@/src/lib/mongoose';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  console.log('>>> TEMPORARY SHARE API HIT:', request.url);
  try {
    const { token } = await context.params;
    const decodedToken = decodeURIComponent(token);
    const infoMode = request.nextUrl.searchParams.get('info') === '1';

    if (infoMode) {
      const metadata = await getTemporaryShareMetadata(decodedToken);
      if (!metadata) {
        return sendError('Temporary share not found or expired', null, 404);
      }
      return sendSuccess(metadata, 'Temporary share metadata');
    }

    const entry = await getTemporaryShare(decodedToken);
    if (!entry) {
      return sendError('Temporary share not found or expired', null, 404);
    }

    if (entry.passcodeHash) {
      return sendError('This share requires a passcode. Please use POST to download.', null, 403);
    }

    const aesKey = await decryptTemporaryShareKey(decodedToken);
    if (!aesKey) {
      return sendError('Temporary share key could not be decrypted', null, 404);
    }

    const share = await DocumentService.downloadDocumentWithAesKey(entry.documentId, aesKey);

    await incrementTemporaryShareAccess(decodedToken);
    await connectDB();
    await ActivityService.logActivity({
      action: 'DOWNLOAD_GUEST_LINK',
      resourceId: entry.documentId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      details: 'Downloaded via open share link',
      status: 'SUCCESS'
    });

    return new NextResponse(new Uint8Array(share.buffer), {
      status: 200,
      headers: {
        'Content-Type': share.mimeType,
        'Content-Disposition': `attachment; filename="${share.originalName}"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Temporary share not found')) {
      return sendError(err.message, null, 404);
    }
    return sendError('Failed to retrieve temporary share', error, 500);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const decodedToken = decodeURIComponent(token);
    const body = await request.json().catch(() => ({}));
    const passcode = body.passcode || '';

    const entry = await getTemporaryShare(decodedToken);
    if (!entry) {
      return sendError('Temporary share not found or expired', null, 404);
    }

    if (entry.passcodeHash) {
      const isValid = await verifyTemporarySharePasscode(decodedToken, passcode);
      if (!isValid) {
        return sendError('Passcode salah / tidak valid', null, 403);
      }
    }

    const aesKey = await decryptTemporaryShareKey(decodedToken);
    if (!aesKey) {
      return sendError('Temporary share key could not be decrypted', null, 404);
    }

    const share = await DocumentService.downloadDocumentWithAesKey(entry.documentId, aesKey);

    await incrementTemporaryShareAccess(decodedToken);
    await connectDB();
    await ActivityService.logActivity({
      action: 'DOWNLOAD_GUEST_PASSCODE',
      resourceId: entry.documentId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      details: 'Downloaded via passcode-protected share link',
      status: 'SUCCESS'
    });

    return new NextResponse(new Uint8Array(share.buffer), {
      status: 200,
      headers: {
        'Content-Type': share.mimeType,
        'Content-Disposition': `attachment; filename="${share.originalName}"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Temporary share not found')) {
      return sendError(err.message, null, 404);
    }
    return sendError('Failed to retrieve temporary share', error, 500);
  }
}
