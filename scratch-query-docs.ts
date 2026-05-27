import { connectDB } from './src/lib/mongoose';
import { Document } from './src/models/Document';
import User from './src/models/User';

async function run() {
  await connectDB();
  // Force User model to register
  console.log(`Using model: ${User.modelName}`);
  
  const docs = await Document.find({}).populate('ownerId');
  console.log(`Total documents found: ${docs.length}`);
  for (const doc of docs) {
    console.log(`- ID: ${doc._id}`);
    console.log(`  Title: ${doc.title}`);
    console.log(`  Mime: ${doc.mimeType}`);
    console.log(`  Size: ${doc.size} bytes`);
    console.log(`  Path: ${doc.storagePath}`);
    console.log(`  Status: ${doc.status}`);
    console.log(`  Owner: ${doc.ownerId?.email}`);
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
