const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./server');

let server;
let baseUrl;

test.before(async () => {
  server = await startServer(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test('GET /health returns ok status', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { data: { status: 'ok' } });
});

test('GET /api/products returns a list of products', async () => {
  const response = await fetch(`${baseUrl}/api/products`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.length > 0);
  assert.equal(body.meta.page, 1);
});

test('POST /api/products creates a new product', async () => {
  const response = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sku: 'MOU-4004',
      name: 'Mouse',
      category: 'Accessories',
      quantity: 20,
      price: 29.99,
      lowStockThreshold: 10,
      expiryDate: '2026-09-30'
    })
  });

  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.name, 'Mouse');
  assert.equal(body.data.category, 'Accessories');
  assert.equal(body.data.quantity, 20);
  assert.equal(body.data.price, 29.99);
  assert.equal(body.data.isAvailable, true);
});

test('GET /api/products/:id returns a single product', async () => {
  const response = await fetch(`${baseUrl}/api/products/1`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.id, 1);
  assert.equal(body.data.name, 'Laptop');
});

test('PUT /api/products/:id updates a product', async () => {
  const response = await fetch(`${baseUrl}/api/products/2`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 12, price: 62.5 })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.quantity, 12);
  assert.equal(body.data.price, 62.5);
  assert.equal(body.data.isAvailable, true);
});

test('GET /api/products/low-stock returns products at or below threshold', async () => {
  const response = await fetch(`${baseUrl}/api/products/low-stock`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((item) => item.quantity <= (item.lowStockThreshold ?? 5)));
  assert.ok(body.data.some((item) => item.sku === 'HDP-3003'));
});

test('GET /api/products/expiring-soon returns products expiring within 30 days', async () => {
  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const createResponse = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: 'EXP-6006', name: 'Expiring Product', quantity: 4, price: 15, expiryDate })
  });
  assert.equal(createResponse.status, 201);

  const response = await fetch(`${baseUrl}/api/products/expiring-soon`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((item) => item.sku === 'EXP-6006' && item.expiryDate === expiryDate));
});

test('POST /api/products rejects invalid payloads', async () => {
  const response = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: '', name: '', quantity: 'invalid', price: 10 })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.message, 'SKU, name, quantity, and price are required');
});

test('POST /api/products rejects a missing name', async () => {
  const response = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: 'NON-8008', quantity: 1, price: 10 })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.message, 'SKU, name, quantity, and price are required');
});

test('POST /api/products rejects a negative price', async () => {
  const response = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: 'NEG-9009', name: 'Negative Price', quantity: 1, price: -10 })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.message, 'Price must be a non-negative number');
});

test('POST /api/products rejects invalid field values', async () => {
  const response = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sku: '   ',
      name: 'Invalid Product',
      quantity: -1,
      price: 10,
      expiryDate: '2026-02-30'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.message, 'SKU must be a non-empty string');
});

test('PUT /api/products/:id rejects invalid field values', async () => {
  const response = await fetch(`${baseUrl}/api/products/1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: -1, price: 0 })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.message, 'Quantity must be a non-negative integer');
});

test('POST /api/products rejects invalid expiry dates', async () => {
  const response = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: 'BAD-7007', name: 'Invalid Date', quantity: 1, price: 10, expiryDate: '2026-02-30' })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.message, 'Expiry date must be a valid YYYY-MM-DD date');
});

test('POST /api/products rejects duplicate SKU values', async () => {
  const response = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: ' lap-1001 ', name: 'Duplicate Laptop', quantity: 8, price: 899.99 })
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.error.message, 'Product SKU already exists');
});

test('DELETE /api/products/:id removes a product', async () => {
  const createResponse = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: 'MON-5005', name: 'Monitor', quantity: 7, price: 199.99, lowStockThreshold: 5, expiryDate: '2026-09-25' })
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/api/products/${created.data.id}`, {
    method: 'DELETE'
  });

  assert.equal(response.status, 200);
  const deletedBody = await response.json();
  assert.equal(deletedBody.data.message, 'Product deleted successfully');

  const getResponse = await fetch(`${baseUrl}/api/products/${created.data.id}`);
  const getBody = await getResponse.json();
  assert.equal(getResponse.status, 404);
  assert.equal(getBody.error.message, 'Product not found');
});

test('GET /api/products supports category filtering and name or SKU search', async () => {
  const categoryResponse = await fetch(`${baseUrl}/api/products?category=electronics`);
  const categoryBody = await categoryResponse.json();
  assert.equal(categoryResponse.status, 200);
  assert.ok(categoryBody.data.every((item) => item.category === 'Electronics'));

  const searchResponse = await fetch(`${baseUrl}/api/products?search=LAP-1001`);
  const searchBody = await searchResponse.json();
  assert.equal(searchResponse.status, 200);
  assert.equal(searchBody.data.length, 1);
  assert.equal(searchBody.data[0].name, 'Laptop');
});

test('GET /api/products supports pagination and sorting', async () => {
  const response = await fetch(`${baseUrl}/api/products?page=1&limit=2&sortBy=price&order=desc`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.length, 2);
  assert.equal(body.meta.limit, 2);
  assert.ok(body.data[0].price >= body.data[1].price);
});

test('PUT /api/products/:id updates automatic availability', async () => {
  const response = await fetch(`${baseUrl}/api/products/1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 0 })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.isAvailable, false);
});

test('GET /api/products rejects invalid query parameters consistently', async () => {
  const response = await fetch(`${baseUrl}/api/products?sortBy=name`);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.message, 'sortBy must be price or quantity');
});

test('GET /api/products returns an empty array when no products match', async () => {
  const response = await fetch(`${baseUrl}/api/products?category=Nonexistent`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, []);
  assert.equal(body.meta.total, 0);
});

test('GET /api/products/:id returns 404 for a missing product', async () => {
  const response = await fetch(`${baseUrl}/api/products/9999`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.message, 'Product not found');
});

test('PUT /api/products/:id returns 404 for a missing product', async () => {
  const response = await fetch(`${baseUrl}/api/products/9998`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 1 })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.message, 'Product not found');
});

test('DELETE /api/products/:id returns 404 for a missing product', async () => {
  const response = await fetch(`${baseUrl}/api/products/9997`, { method: 'DELETE' });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.message, 'Product not found');
});

test('GET unknown route returns a consistent 404 error', async () => {
  const response = await fetch(`${baseUrl}/api/not-a-real-route`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.message, 'Route not found');
});
