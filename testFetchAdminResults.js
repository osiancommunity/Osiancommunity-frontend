const axios = require('axios');

async function testFetchAdminResults() {
  const token = "YOUR_ACTUAL_TOKEN_HERE"; // Replace with valid token
  try {
    const response = await axios.get("http://localhost:5000/api/results/admin", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    console.log("Status:", response.status);
    console.log("Response data:", response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error status:", error.response.status);
      console.error("Error data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

testFetchAdminResults();
