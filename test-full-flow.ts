import { createTemporaryShare, getTemporaryShare, decryptTemporaryShareKey } from './src/lib/temporaryShareStore';
import crypto from 'crypto';

async function test() {
  try {
    const aesKey = crypto.randomBytes(32);
    const customToken = "BUKU2024";
    const res = await createTemporaryShare("doc1", "user1", "text/plain", "file.txt", aesKey, 60, 10, customToken);
    console.log("Created:", res.token);

    const share = await getTemporaryShare(customToken);
    console.log("Retrieved:", share ? share.token : "NOT FOUND");

    const decryptedKey = await decryptTemporaryShareKey(customToken);
    console.log("Keys Match:", decryptedKey && decryptedKey.equals(aesKey));
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
