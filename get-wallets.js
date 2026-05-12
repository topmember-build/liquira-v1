const https = require('https');

const options = {
  hostname: 'api.circle.com',
  path: '/v1/w3s/wallets',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer f8c062e8402c065386c9fca404e0e403:8c864dbfa2dc43d9b5455aece12b412d',
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('Wallets:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();