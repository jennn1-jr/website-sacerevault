import { DocumentService } from './src/services/document.service';
import { prisma } from './src/prisma';
import bcrypt from 'bcryptjs';
import { generateRSAKeyPair, encryptPrivateKey } from './src/crypto';

async function main() {
  const password = "password123";
  const { publicKey: pub1, privateKey: priv1 } = generateRSAKeyPair();
  const { publicKey: pub2, privateKey: priv2 } = generateRSAKeyPair();

  const user1 = await prisma.user.create({
    data: {
      email: 'user1@test.com',
      name: 'User 1',
      passwordHash: await bcrypt.hash(password, 10),
      publicKey: pub1,
      encryptedPrivKey: encryptPrivateKey(priv1, password)
    }
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@test.com',
      name: 'User 2',
      passwordHash: await bcrypt.hash(password, 10),
      publicKey: pub2,
      encryptedPrivKey: encryptPrivateKey(priv2, password)
    }
  });

  const file = new File(["Hello world"], "test.txt", { type: "text/plain" });
  
  const doc = await DocumentService.uploadDocument(user1.id, password, file);
  console.log("Document uploaded:", doc.id);

  try {
    const res = await DocumentService.shareDocument(user1.id, password, doc.id, user2.email);
    console.log("Share result:", res);
  } catch (e) {
    console.error("Error sharing:", e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
