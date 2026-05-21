import { PrismaClient } from '@prisma/client';
import { DocumentService } from './src/services/document.service';

const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  // We know test@example.com has password "password123" because we registered it via curl earlier
  const user = users.find(u => u.email === 'test@example.com');
  if (!user) return console.log('No user');
  
  const file = new File(["test data for upload API directly"], "test_upload.txt", { type: "text/plain" });
  
  try {
    const res = await DocumentService.uploadDocument(user.id, "password123", file);
    console.log("Upload Success:", res);
  } catch (err: any) {
    console.error("Upload Failed:", err.message);
  }
}
main();
