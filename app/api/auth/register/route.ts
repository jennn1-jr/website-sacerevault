import { NextRequest } from 'next/server';
import { AuthService } from '@/src/services/auth.service';
import { sendSuccess, sendError } from '@/src/utils/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, vaultPassword } = body;

    if (!name || !email || !password || !vaultPassword) {
      return sendError('Name, email, login password, and vault password are required', null, 400);
    }
    if (password.length < 8 || vaultPassword.length < 8) {
      return sendError('Both login and vault passwords must be at least 8 characters long', null, 400);
    }

    const user = await AuthService.register({ name, email, password, vaultPassword });
    return sendSuccess(user, 'User registered successfully', 201);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Email already registered') {
      return sendError(err.message, null, 409);
    }
    return sendError('Internal server error during registration', error, 500);
  }
}
