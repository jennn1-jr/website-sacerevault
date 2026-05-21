import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate a random 32-byte key for AES-256
 */
export function generateKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Encrypt a buffer (file content) using AES-256-GCM.
 * The returned buffer contains: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
 */
export function encryptBuffer(buffer: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a buffer that was encrypted using encryptBuffer.
 * Expects the buffer to be in format: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
 */
export function decryptBuffer(encryptedBuffer: Buffer, key: Buffer): Buffer {
  if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted;
}

/**
 * Encrypt a key using a master key and return as hex string.
 * This is useful to encrypt the file-specific keys before storing in DB.
 */
export function encryptKeyWithMaster(keyToEncrypt: Buffer, masterKeyHex: string): string {
  const masterKey = Buffer.from(masterKeyHex, 'hex');
  if (masterKey.length !== 32) {
    throw new Error('Master key must be 32 bytes (64 hex characters)');
  }
  return encryptBuffer(keyToEncrypt, masterKey).toString('hex');
}

/**
 * Decrypt a key using a master key from a hex string.
 */
export function decryptKeyWithMaster(encryptedKeyHex: string, masterKeyHex: string): Buffer {
  const masterKey = Buffer.from(masterKeyHex, 'hex');
  if (masterKey.length !== 32) {
    throw new Error('Master key must be 32 bytes (64 hex characters)');
  }
  const encryptedBuffer = Buffer.from(encryptedKeyHex, 'hex');
  return decryptBuffer(encryptedBuffer, masterKey);
}
