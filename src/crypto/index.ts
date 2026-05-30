import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives an AES-256 key from a password using PBKDF2.
 */
export function deriveKeyFromPassword(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts a user's RSA private key using their password.
 */
export function encryptPrivateKey(privateKeyPEM: string, password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKeyFromPassword(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKeyPEM, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts a user's RSA private key using their password.
 */
export function decryptPrivateKey(encryptedDataB64: string, password: string): string {
  const data = Buffer.from(encryptedDataB64, 'base64');
  
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encryptedText = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKeyFromPassword(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generates an RSA-4096 key pair for a new user.
 */
export function generateRSAKeyPair(): { publicKey: string; privateKey: string } {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
}

/**
 * Encrypts an AES-256 key using an RSA public key.
 */
export function encryptKeyWithRSA(aesKey: Buffer, publicKeyPEM: string): string {
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPEM,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    aesKey
  );
  return encrypted.toString('base64');
}

/**
 * Decrypts an AES-256 key using an RSA private key.
 */
export function decryptKeyWithRSA(encryptedAesKeyB64: string, privateKeyPEM: string): Buffer {
  const encryptedKey = Buffer.from(encryptedAesKeyB64, 'base64');
  return crypto.privateDecrypt(
    {
      key: privateKeyPEM,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    encryptedKey
  );
}

/**
 * Generates a random AES-256 key for file encryption.
 */
export function generateFileKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Encrypts file data using dynamically selected algorithm.
 */
export function encryptFileData(fileBuffer: Buffer, aesKey: Buffer, mode: string = 'AES-GCM'): { encryptedBuffer: Buffer; iv: Buffer; tag: Buffer | null } {
  if (mode === 'AES-CBC') {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    return { encryptedBuffer: encrypted, iv, tag: null };
  } else if (mode === 'AES-CTR') {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-ctr', aesKey, iv);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    return { encryptedBuffer: encrypted, iv, tag: null };
  } else {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, aesKey, iv);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { encryptedBuffer: encrypted, iv, tag };
  }
}

/**
 * Decrypts file data using dynamically selected algorithm.
 */
export function decryptFileData(encryptedBuffer: Buffer, aesKey: Buffer, iv: Buffer, tag: Buffer | null, mode: string = 'AES-GCM'): Buffer {
  if (mode === 'AES-CBC') {
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  } else if (mode === 'AES-CTR') {
    const decipher = crypto.createDecipheriv('aes-256-ctr', aesKey, iv);
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  } else {
    const decipher = crypto.createDecipheriv(ALGORITHM, aesKey, iv);
    if (tag) decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  }
}

/**
 * Generates a SHA-256 hash of a file.
 */
export function hashFile(fileBuffer: Buffer): string {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Creates a digital signature for a file hash using the sender's RSA private key.
 */
export function signHash(hashHex: string, privateKeyPEM: string): string {
  const sign = crypto.createSign('SHA256');
  sign.update(hashHex);
  sign.end();
  return sign.sign(privateKeyPEM, 'base64');
}

/**
 * Verifies a digital signature using the sender's RSA public key.
 */
export function verifySignature(hashHex: string, signatureB64: string, publicKeyPEM: string): boolean {
  const verify = crypto.createVerify('SHA256');
  verify.update(hashHex);
  verify.end();
  return verify.verify(publicKeyPEM, Buffer.from(signatureB64, 'base64'));
}
