import bcrypt from 'bcryptjs';
import { generateRSAKeyPair, encryptPrivateKey } from '../crypto';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { ActivityLog } from '../models/ActivityLog';
import { connectDB } from '../lib/mongoose';
import speakeasy from 'speakeasy';

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  vaultPassword: string;
}

interface LoginPayload {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export class AuthService {
  static async register(data: RegisterPayload) {
    await connectDB();
    const { name, email, password, vaultPassword } = data;

    const emailLower = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: emailLower });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate RSA Key pair for hybrid cryptography
    const { publicKey, privateKey } = generateRSAKeyPair();
    
    // Encrypt the private key with the user's vault password (PBKDF2 derived)
    const encryptedPrivKey = encryptPrivateKey(privateKey, vaultPassword);

    const user = await User.create({
      name,
      email: emailLower,
      passwordHash,
      publicKey,
      encryptedPrivKey,
    });

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };
  }

  static async login(data: LoginPayload, deviceId?: string) {
    await connectDB();
    const { email, password } = data;

    const emailLower = email.trim().toLowerCase();

    const user = await User.findOne({ email: emailLower });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    if (user.isTwoFactorEnabled) {
      if (!data.twoFactorCode) {
        throw new Error('2FA_REQUIRED');
      }
      
      const isValid = speakeasy.totp.verify({ token: data.twoFactorCode, secret: user.twoFactorSecret, encoding: 'base32' });
      if (!isValid) {
        throw new Error('Invalid 2FA code');
      }
    }

    const accessToken = generateAccessToken({ userId: user._id.toString(), role: user.role, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user._id.toString() });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await Session.create({
      userId: user._id,
      deviceId: deviceId || user._id, // Fallback if device ID not strictly enforced yet
      token: refreshToken,
      expiresAt
    });

    // Save activity log
    await ActivityLog.create({
      userId: user._id,
      action: 'LOGIN',
      status: 'SUCCESS'
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  static async logout(refreshToken: string) {
    await connectDB();
    await Session.deleteMany({ token: refreshToken });
  }

  static async refresh(refreshToken: string) {
    await connectDB();
    const session = await Session.findOne({ token: refreshToken }).populate('userId');

    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    const user: any = session.userId;

    if (!user) {
       throw new Error('User not found');
    }

    const accessToken = generateAccessToken({ 
      userId: user._id.toString(), 
      role: user.role, 
      email: user.email 
    });

    return { accessToken };
  }
}
