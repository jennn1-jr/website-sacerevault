import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendError } from '@/src/utils/response';
import { DocumentService } from '@/src/services/document.service';
import { ActivityService } from '@/src/services/activity.service';
import { connectDB } from '@/src/lib/mongoose';

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
    if (!vaultPassword) {
      return sendError('Vault password is required for decryption', null, 400);
    }

    const { id } = await context.params;

    const file = await DocumentService.downloadDocument(session.userId, vaultPassword, id);

    await connectDB();
    await ActivityService.logActivity({
      userId: session.userId,
      action: 'DOWNLOAD',
      resourceId: id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      details: 'Owner downloaded file',
      status: 'SUCCESS'
    });

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.originalName}"`
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('TAMPERING')) {
      return sendError(err.message, null, 403);
    }
    if (err.message.includes('password')) {
      return sendError(err.message, null, 403);
    }
    return sendError('Internal server error during download', error, 500);
  }
}
