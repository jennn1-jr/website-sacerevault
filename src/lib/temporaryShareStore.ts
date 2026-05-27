import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const STORE_PATH = path.join(process.cwd(), 'storage', 'temporary-shares.json');
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

async function ensureStoreFile() {
  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify([]), 'utf8');
  }
}

async function readStore(): Promise<TemporaryShareEntry[]> {
  await ensureStoreFile();
  const file = await fs.readFile(STORE_PATH, 'utf8');
  try {
    return JSON.parse(file) as TemporaryShareEntry[];
  } catch {
    return [];
  }
}

async function writeStore(entries: TemporaryShareEntry[]) {
  await ensureStoreFile();
  await fs.writeFile(STORE_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

function deriveKeyFromToken(token: string): Buffer {
  return crypto.createHash('sha256').update(token).digest().slice(0, KEY_SIZE);
}

export async function cleanupExpiredShares() {
  const entries = await readStore();
  const now = new Date();
  const activeEntries = entries.filter((entry) => {
    if (!entry.isActive) return false;
    const expiresAt = new Date(entry.expiresAt);
    return expiresAt > now && entry.accessCount < entry.maxAccess;
  });
  if (activeEntries.length !== entries.length) {
    await writeStore(activeEntries);
  }
  return activeEntries;
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
  await cleanupExpiredShares();
  
  const entries = await readStore();

  let token = customToken;
  if (token) {
    const existing = entries.find(e => e.token === token && e.isActive);
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

  const entry: TemporaryShareEntry = {
    token,
    documentId,
    ownerId,
    mimeType,
    originalName,
    expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    maxAccess,
    accessCount: 0,
    isActive: true,
    encryptedAesKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };

  if (passcode) {
    const salt = await bcrypt.genSalt(10);
    entry.passcodeHash = await bcrypt.hash(passcode, salt);
  }

  entries.push(entry);
  await writeStore(entries);
  return entry;
}

export async function getTemporaryShare(token: string) {
  await cleanupExpiredShares();
  const entries = await readStore();
  const entry = entries.find((item) => item.token === token && item.isActive);
  if (!entry) {
    return null;
  }

  const expiresAt = new Date(entry.expiresAt);
  if (expiresAt <= new Date() || entry.accessCount >= entry.maxAccess) {
    entry.isActive = false;
    await writeStore(entries);
    return null;
  }

  return entry;
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
  const entries = await readStore();
  const entry = entries.find((item) => item.token === token);
  if (!entry) {
    return false;
  }

  entry.accessCount += 1;
  if (entry.accessCount >= entry.maxAccess) {
    entry.isActive = false;
  }

  await writeStore(entries);
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
    return false; // If no entry or no passcode required, this function shouldn't be relied on for success if passcode wasn't set. 
    // Actually, if it requires no passcode, it doesn't need verification. Let's return false if passcodeHash is missing but we're trying to verify.
  }
  return await bcrypt.compare(passcode, entry.passcodeHash);
}
