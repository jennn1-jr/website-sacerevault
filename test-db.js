const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const notifs = await prisma.notification.findMany();
  console.log("Notifications:", notifs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
