const http = require('http');

const data = JSON.stringify({
  restaurantId: 'aec3503d-e07f-4fb7-bda4-91a8b4875162',
  items: [{ menuItemId: '2b0bf255-a6a9-4623-acb1-3e42f9e42135', quantity: 1, price: 100, station: 'food', name: 'Test' }],
  paymentMethod: 'cash',
  specialInstructions: "",
  orderType: 'takeaway',
  deviceCookie: 'some-cookie',
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/create-order',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
