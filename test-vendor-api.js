// Test the vendor API endpoint

async function testVendorAPI() {
  const API_URL = 'http://localhost:4000/api/v1/purchase/vendors';
  
  console.log('Testing vendor API endpoint...');
  console.log(`URL: ${API_URL}\n`);
  
  try {
    const https = require('http');
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/purchase/vendors',
      method: 'GET',
    };
    
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response length: ${data.length} bytes\n`);
        try {
          const json = JSON.parse(data);
          if (Array.isArray(json)) {
            console.log(`✅ Received ${json.length} vendors`);
            if (json.length > 0) {
              console.log('First vendor:', json[0].name);
            }
          } else {
            console.log('Response:', json);
          }
        } catch (e) {
          console.log('Response (not JSON):', data.substring(0, 200));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
    });
    
    req.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testVendorAPI();
