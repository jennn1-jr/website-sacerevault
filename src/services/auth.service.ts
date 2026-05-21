import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { generateRSAKeyPair, encryptPrivateKey } from '../crypto';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  vaultPassword: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

export class AuthService {
  static async register(data: RegisterPayload) {
    const { name, email, password, vaultPassword } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate RSA Key pair for hybrid cryptography
    const { publicKey, privateKey } = generateRSAKeyPair();
    
    // Encrypt the private key with the user's vault password (PBKDF2 derived)
    const encryptedPrivKey = encryptPrivateKey(privateKey, vaultPassword);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        publicKey,
        encryptedPrivKey,
      }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
  }

  static async login(data: LoginPayload) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const accessToken = generateAccessToken({ userId: user.id, role: user.role, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt
      }
    });

    // Save activity log in Prisma
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        status: 'SUCCESS'
      }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  static async logout(refreshToken: string) {
    await prisma.session.deleteMany({
      where: { refreshToken }
    });
  }

  static async refresh(refreshToken: string) {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true }
    });

    if (!session || !session.isValid || session.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    const accessToken = generateAccessToken({ 
      userId: session.user.id, 
      role: session.user.role, 
      email: session.user.email 
    });

    return { accessToken };
  }
}
