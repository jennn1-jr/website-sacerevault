import { prisma } from './src/prisma';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'user2@test.com' } });
  if (!user) return console.log("User not found");

  const sharedAccesses = await prisma.sharedAccess.findMany({
    where: { 
      userId: user.id,
      document: { ownerId: { not: user.id } }
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          mimeType: true,
          size: true,
          createdAt: true,
          owner: { select: { name: true, email: true } }
        }
      }
    },
    orderBy: { document: { createdAt: 'desc' } }
  });

  console.log("Shared accesses for user2:", JSON.stringify(sharedAccesses, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
