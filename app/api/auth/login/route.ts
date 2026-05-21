import { NextRequest } from 'next/server';
import { AuthService } from '@/src/services/auth.service';
import { sendSuccess, sendError } from '@/src/utils/response';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return sendError('Email and password are required', null, 400);
    }

    const result = await AuthService.login({ email, password });

    // Set refresh token in HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return sendSuccess({
      accessToken: result.accessToken,
      user: result.user
    }, 'Login successful');
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Invalid credentials') {
      return sendError(err.message, null, 401);
    }
    return sendError('Internal server error during login', error, 500);
  }
}
