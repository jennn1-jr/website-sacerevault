import { NextRequest } from 'next/server';
import { addWebRtcSignal, getPendingSignals, getWebRtcSession } from '@/src/lib/webrtcStore';
import { sendError, sendSuccess } from '@/src/utils/response';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const { from, payload } = body;

    if (!from || !payload) {
      return sendError('from and payload are required', null, 400);
    }

    const signal = await addWebRtcSignal(sessionId, from, payload);
    if (!signal) {
      return sendError('WebRTC session not found or expired', null, 404);
    }

    return sendSuccess(signal, 'Signal queued for delivery');
  } catch (error: unknown) {
    return sendError('Failed to queue WebRTC signal', error, 500);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const clientId = request.nextUrl.searchParams.get('clientId');

    if (!clientId) {
      return sendError('clientId is required', null, 400);
    }

    const session = await getWebRtcSession(sessionId);
    if (!session) {
      return sendError('WebRTC session not found or expired', null, 404);
    }

    const pending = await getPendingSignals(sessionId, clientId);
    return sendSuccess({ pending }, 'Pending signals retrieved');
  } catch (error: unknown) {
    return sendError('Failed to retrieve pending signals', error, 500);
  }
}
