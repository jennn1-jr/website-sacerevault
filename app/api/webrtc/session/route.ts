import { NextRequest } from 'next/server';
import { createWebRtcSession, getWebRtcSession, getPendingSignals } from '@/src/lib/webrtcStore';
import { sendError, sendSuccess } from '@/src/utils/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const createdBy = body?.createdBy ?? 'anonymous';
    const session = await createWebRtcSession(createdBy);
    return sendSuccess(
      { sessionId: session.sessionId, expiresAt: session.expiresAt },
      'WebRTC session created',
    );
  } catch (error: unknown) {
    return sendError('Failed to create WebRTC session', error, 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const clientId = request.nextUrl.searchParams.get('clientId');

    if (!sessionId || !clientId) {
      return sendError('sessionId and clientId are required', null, 400);
    }

    const session = await getWebRtcSession(sessionId);
    if (!session) {
      return sendError('WebRTC session not found or expired', null, 404);
    }

    const pending = await getPendingSignals(sessionId, clientId);
    return sendSuccess(
      { sessionId, pending, expiresAt: session.expiresAt },
      'Pending WebRTC signals',
    );
  } catch (error: unknown) {
    return sendError('Failed to read WebRTC session', error, 500);
  }
}
