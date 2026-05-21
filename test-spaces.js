const crypto = require('crypto');

function deriveKeyFromToken(token) {
  return crypto.createHash('sha256').update(token).digest().slice(0, 32);
}

const token = "RAHASIA 123";
const key = deriveKeyFromToken(token);
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const aesKey = crypto.randomBytes(32);
const encryptedKey = Buffer.concat([cipher.update(aesKey), cipher.final()]);
console.log("Success with space!", encryptedKey.length);
