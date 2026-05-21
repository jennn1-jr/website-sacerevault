import axios from 'axios';
import { prisma } from './src/prisma';
import { generateAccessToken } from './src/utils/jwt';

async function main() {
  const user1 = await prisma.user.findFirst({ where: { email: 'user1@test.com' } });
  const user2 = await prisma.user.findFirst({ where: { email: 'user2@test.com' } });
  
  if (!user1 || !user2) return console.log("Users not found");

  const doc = await prisma.document.findFirst({ where: { ownerId: user1.id } });
  if (!doc) return console.log("Doc not found");

  const token = generateAccessToken({ userId: user1.id, role: user1.role, email: user1.email });

  try {
    const res = await axios.post(`http://localhost:3000/api/documents/${doc.id}/share`, {
      vaultPassword: 'password123',
      targetEmail: user2.email
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Success:", res.data);
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
