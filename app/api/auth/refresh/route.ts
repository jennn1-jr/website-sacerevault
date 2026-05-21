import { NextRequest } from 'next/server';
import { AuthService } from '@/src/services/auth.service';
import { sendSuccess, sendError } from '@/src/utils/response';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      return sendError('Refresh token is required', null, 401);
    }

    const result = await AuthService.refresh(refreshToken);
    return sendSuccess(result, 'Token refreshed successfully');
  } catch (error: unknown) {
    return sendError('Invalid or expired refresh token', error, 401);
  }
}
