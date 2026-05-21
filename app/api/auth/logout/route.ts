import { NextRequest } from 'next/server';
import { AuthService } from '@/src/services/auth.service';
import { sendSuccess, sendError } from '@/src/utils/response';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    // Delete refresh token cookie
    cookieStore.delete('refreshToken');

    return sendSuccess(null, 'Logged out successfully');
  } catch (error: unknown) {
    return sendError('Internal server error during logout', error, 500);
  }
}
