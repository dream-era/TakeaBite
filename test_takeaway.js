const http = require('http');

const data = JSON.stringify({
  restaurantId: '11111111-1111-1111-1111-111111111111',
  items: [{ menuItemId: '11111111-1111-1111-1111-111111111111', quantity: 1, price: 10, station: 'food' }],
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
