const axios = require('axios');

async function testFetch() {
  const token = 'YOUR_TOKEN_HERE'; // Replace with a valid Bearer token

  try {
    const response = await axios.get('http://localhost:5000/api/quizzes/admin', {
      headers: {
        Authorization: \`Bearer \${token}\`
      }
    });
    console.log('Status:', response.status);
    console.log('Data:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testFetch();
