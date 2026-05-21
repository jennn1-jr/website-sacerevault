import { NextRequest, NextResponse } from 'next/server';
import { sendError, sendSuccess } from '@/src/utils/response';
import {
  decryptTemporaryShareKey,
  getTemporaryShare,
  getTemporaryShareMetadata,
  incrementTemporaryShareAccess,
} from '@/src/lib/temporaryShareStore';
import { DocumentService } from '@/src/services/document.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
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

    const aesKey = await decryptTemporaryShareKey(decodedToken);
    if (!aesKey) {
      return sendError('Temporary share key could not be decrypted', null, 404);
    }

    const share = await DocumentService.downloadDocumentWithAesKey(entry.documentId, aesKey);

    await incrementTemporaryShareAccess(decodedToken);

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
