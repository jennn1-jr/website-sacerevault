import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { TemporaryShare } from '../models/TemporaryShare';
import { connectDB } from './mongoose';

const KEY_SIZE = 32;
const IV_SIZE = 12;

export interface TemporaryShareEntry {
  token: string;
  documentId: string;
  ownerId: string;
  mimeType: string;
  originalName: string;
  expiresAt: string;
  createdAt: string;
  maxAccess: number;
  accessCount: number;
  isActive: boolean;
  encryptedAesKey: string;
  iv: string;
  authTag: string;
  passcodeHash?: string;
}

function deriveKeyFromToken(token: string): Buffer {
  return crypto.createHash('sha256').update(token).digest().slice(0, KEY_SIZE);
}

export async function cleanupExpiredShares() {
  await connectDB();
  const now = new Date();
  
  await TemporaryShare.updateMany(
    { 
      isActive: true, 
      $or: [
        { expiresAt: { $lte: now } },
        { $expr: { $gte: ['$accessCount', '$maxAccess'] } }
      ]
    },
    { isActive: false }
  );
  
  const activeDocs = await TemporaryShare.find({ isActive: true });
  return activeDocs.map(doc => doc.toObject());
}

export async function createTemporaryShare(
  documentId: string,
  ownerId: string,
  mimeType: string,
  originalName: string,
  aesKey: Buffer,
  expiresInMinutes: number = 60,
  maxAccess: number = 10,
  customToken?: string,
  passcode?: string
) {
  await connectDB();
  await cleanupExpiredShares();

  let token = customToken;
  if (token) {
    const existing = await TemporaryShare.findOne({ token, isActive: true });
    if (existing) {
      throw new Error('Kode share sudah digunakan. Silakan pilih kode lain.');
    }
  } else {
    token = crypto.randomBytes(16).toString('hex');
  }

  const key = deriveKeyFromToken(token);
  const iv = crypto.randomBytes(IV_SIZE);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encryptedKey = Buffer.concat([cipher.update(aesKey), cipher.final()]);
  const authTag = cipher.getAuthTag();

  let passcodeHash = null;
  if (passcode) {
    const salt = await bcrypt.genSalt(10);
    passcodeHash = await bcrypt.hash(passcode, salt);
  }

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const entry = await TemporaryShare.create({
    token,
    documentId,
    ownerId,
    mimeType,
    originalName,
    expiresAt,
    maxAccess,
    accessCount: 0,
    isActive: true,
    encryptedAesKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    passcodeHash
  });

  return {
    ...entry.toObject(),
    expiresAt: expiresAt.toISOString(),
    createdAt: (entry as any).createdAt?.toISOString() || new Date().toISOString()
  } as TemporaryShareEntry;
}

export async function getTemporaryShare(token: string) {
  await connectDB();
  await cleanupExpiredShares();
  const entry = await TemporaryShare.findOne({ token, isActive: true });
  
  if (!entry) {
    return null;
  }

  const expiresAt = new Date(entry.expiresAt);
  if (expiresAt <= new Date() || entry.accessCount >= entry.maxAccess) {
    entry.isActive = false;
    await entry.save();
    return null;
  }

  return {
    ...entry.toObject(),
    expiresAt: expiresAt.toISOString(),
    createdAt: (entry as any).createdAt?.toISOString() || new Date().toISOString()
  } as TemporaryShareEntry;
}

export async function decryptTemporaryShareKey(token: string): Promise<Buffer | null> {
  const entry = await getTemporaryShare(token);
  if (!entry) return null;

  const key = deriveKeyFromToken(token);
  const iv = Buffer.from(entry.iv, 'base64');
  const authTag = Buffer.from(entry.authTag, 'base64');
  const encryptedKey = Buffer.from(entry.encryptedAesKey, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encryptedKey), decipher.final()]);
  return decrypted;
}

export async function incrementTemporaryShareAccess(token: string) {
  await connectDB();
  const entry = await TemporaryShare.findOne({ token });
  if (!entry) {
    return false;
  }

  entry.accessCount += 1;
  if (entry.accessCount >= entry.maxAccess) {
    entry.isActive = false;
  }

  await entry.save();
  return true;
}

export async function getTemporaryShareMetadata(token: string) {
  const entry = await getTemporaryShare(token);
  if (!entry) return null;
  return {
    documentId: entry.documentId,
    originalName: entry.originalName,
    mimeType: entry.mimeType,
    expiresAt: entry.expiresAt,
    accessCount: entry.accessCount,
    maxAccess: entry.maxAccess,
    isActive: entry.isActive,
    requiresPasscode: !!entry.passcodeHash,
  };
}

export async function verifyTemporarySharePasscode(token: string, passcode: string): Promise<boolean> {
  const entry = await getTemporaryShare(token);
  if (!entry || !entry.passcodeHash) {
    return false; 
  }
  return await bcrypt.compare(passcode, entry.passcodeHash);
}
