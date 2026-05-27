const axios = require('axios');

async function run() {
  try {
    console.log('Checking server status...');
    const response = await axios.get('http://localhost:3000');
    console.log('Server is running on port 3000! Status code:', response.status);
  } catch (error) {
    console.log('Failed to connect to port 3000. Trying port 3001...');
    try {
      const response = await axios.get('http://localhost:3001');
      console.log('Server is running on port 3001! Status code:', response.status);
    } catch (e) {
      console.error('Could not connect to the local server:', e.message);
    }
  }
}
run();
