import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'securevault-super-secret-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'securevault-refresh-super-secret-key-change-this';

export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: Pick<TokenPayload, 'userId'>): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): Pick<TokenPayload, 'userId'> {
  return jwt.verify(token, JWT_REFRESH_SECRET) as Pick<TokenPayload, 'userId'>;
}
