const http = require('http');

const data = JSON.stringify({
  restaurantId: 'aec3503d-e07f-4fb7-bda4-91a8b4875162',
  items: [{ menuItemId: 'fcbd4d79-2470-4cc8-af28-5da7d262eb40', quantity: 1, price: 10, station: 'food' }],
  paymentMethod: 'cash',
  orderType: 'takeaway',
  totalAmount: 10
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
