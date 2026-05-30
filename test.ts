import { getTemporaryShareMetadata } from './src/lib/temporaryShareStore';

async function test() {
  console.log('Starting...');
  const res = await getTemporaryShareMetadata('6e5a317a235b9e15ee2e1324e9577d4a');
  console.log('Result:', res);
}
test().catch(console.error);
