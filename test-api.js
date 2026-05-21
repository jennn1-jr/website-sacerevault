const axios = require('axios');
async function run() {
  try {
    console.log('Fetching users...');
    const users = await require('@prisma/client').PrismaClient.prototype.$connect.call(new (require('@prisma/client').PrismaClient)());
    // Not easy to do Next.js api without auth token. Let's just create a notification directly in DB to see if it works!
  } catch (e) {}
}
run();
