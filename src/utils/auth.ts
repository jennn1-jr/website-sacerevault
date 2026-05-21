import { NextRequest } from 'next/server';
import { verifyAccessToken, TokenPayload } from './jwt';

export function getSession(request: NextRequest): TokenPayload | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}
