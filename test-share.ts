import { createTemporaryShare } from './src/lib/temporaryShareStore';
import crypto from 'crypto';

async function test() {
  try {
    const aesKey = crypto.randomBytes(32);
    const res = await createTemporaryShare("doc1", "user1", "text/plain", "file.txt", aesKey, 60, 10, "MANTAP");
    console.log("Created:", res.token);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
