const https = require('https');

const options = {
  hostname: 'api.circle.com',
  path: '/v1/w3s/config/entity/publicKey',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer TEST_API_KEY:f8c062e8402c065386c9fca404e0e403:8c864dbfa2dc43d9b5455aece12b412d',
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    try {
      const json = JSON.parse(data);
      console.log('Response:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();