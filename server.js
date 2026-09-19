require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();

class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendSuccess(res, data, meta) {
  const response = { data };
  if (meta) response.meta = meta;
  return res.json(response);
}

function sendError(res, status, message) {
  return res.status(status).json({ error: { message } });
}

function normalizeSku(sku) {
  return sku.trim().toLowerCase();
}

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const configuredPort = Number(process.env.PORT) || 3000;

let products = [
  { id: 1, sku: 'LAP-1001', name: 'Laptop', category: 'Electronics', quantity: 12, price: 999.99, lowStockThreshold: 5, expiryDate: '2026-10-05' },
  { id: 2, sku: 'PHN-2002', name: 'Smartphone', category: 'Electronics', quantity: 25, price: 699.99, lowStockThreshold: 10, expiryDate: '2026-11-15' },
  { id: 3, sku: 'HDP-3003', name: 'Headphones', category: 'Accessories', quantity: 3, price: 149.99, lowStockThreshold: 5, expiryDate: '2026-09-20' }
];

products.forEach((product) => {
  product.isAvailable = product.quantity > 0;
});

let nextId = 4;

app.get('/health', (req, res) => {
  return sendSuccess(res, { status: 'ok' });
});

app.get('/', (req, res) => {
  res.send('Inventory API is running');
});

app.get('/api/products', (req, res) => {
  const { category, search, q, page = '1', limit = '10', sortBy, order = 'asc' } = req.query;
  const requestedPage = Number(page);
  const requestedLimit = Number(limit);

  if (!Number.isInteger(requestedPage) || requestedPage < 1 || !Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
    throw new AppError(400, 'page must be a positive integer and limit must be between 1 and 100');
  }
  if (sortBy && !['price', 'quantity'].includes(sortBy)) {
    throw new AppError(400, 'sortBy must be price or quantity');
  }
  if (!['asc', 'desc'].includes(order)) {
    throw new AppError(400, 'order must be asc or desc');
  }

  let filteredProducts = products.filter((product) => {
    const matchesCategory = !category || product.category?.toLowerCase() === category.toLowerCase();
    const searchTerm = (search ?? q)?.toLowerCase();
    const matchesSearch = !searchTerm || product.name.toLowerCase().includes(searchTerm) || product.sku.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  if (sortBy) {
    const direction = order === 'desc' ? -1 : 1;
    filteredProducts.sort((first, second) => (first[sortBy] - second[sortBy]) * direction);
  }

  const total = filteredProducts.length;
  const start = (requestedPage - 1) * requestedLimit;
  const paginatedProducts = filteredProducts.slice(start, start + requestedLimit);
  return sendSuccess(res, paginatedProducts, {
    page: requestedPage,
    limit: requestedLimit,
    total,
    totalPages: Math.ceil(total / requestedLimit)
  });
});

app.get('/api/products/low-stock', (req, res) => {
  const lowStockProducts = products.filter((item) => item.quantity <= (item.lowStockThreshold ?? 5));
  return sendSuccess(res, lowStockProducts);
});

app.get('/api/products/expiring-soon', (req, res) => {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringSoonProducts = products.filter((item) => {
    if (!item.expiryDate) return false;

    const expiryDate = new Date(item.expiryDate);
    return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
  });

  return sendSuccess(res, expiringSoonProducts);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find((item) => item.id === Number(req.params.id));

  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  return sendSuccess(res, product);
});

app.post('/api/products', (req, res) => {
  const { sku, name, category, quantity, price, lowStockThreshold, expiryDate } = req.body;

  if (!sku || typeof sku !== 'string' || !name || typeof quantity !== 'number' || typeof price !== 'number') {
    throw new AppError(400, 'SKU, name, quantity, and price are required');
  }

  const duplicateSku = products.some((item) => normalizeSku(item.sku) === normalizeSku(sku));
  if (duplicateSku) {
    throw new AppError(409, 'Product SKU already exists');
  }

  const newProduct = {
    id: nextId++,
    sku: sku.trim(),
    name,
    category: category ?? 'Uncategorized',
    quantity,
    price,
    lowStockThreshold: lowStockThreshold ?? 5,
    expiryDate: expiryDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    isAvailable: quantity > 0
  };

  products.push(newProduct);
  return sendSuccess(res.status(201), newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const product = products.find((item) => item.id === Number(req.params.id));

  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  const { sku, name, category, quantity, price, lowStockThreshold, expiryDate } = req.body;

  if (sku !== undefined) {
    if (typeof sku !== 'string' || !sku.trim()) {
      throw new AppError(400, 'SKU must be a non-empty string');
    }
    const duplicateSku = products.some((item) => item.id !== product.id && normalizeSku(item.sku) === normalizeSku(sku));
    if (duplicateSku) {
      throw new AppError(409, 'Product SKU already exists');
    }
    product.sku = sku.trim();
  }

  if (name !== undefined) product.name = name;
  if (category !== undefined) product.category = category;
  if (quantity !== undefined) product.quantity = quantity;
  if (price !== undefined) product.price = price;
  if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
  if (expiryDate !== undefined) product.expiryDate = expiryDate;
  product.isAvailable = product.quantity > 0;

  return sendSuccess(res, product);
});

app.delete('/api/products/:id', (req, res) => {
  const initialLength = products.length;
  products = products.filter((item) => item.id !== Number(req.params.id));

  if (products.length === initialLength) {
    throw new AppError(404, 'Product not found');
  }

  return sendSuccess(res, { message: 'Product deleted successfully' });
});

app.use((req, res, next) => {
  next(new AppError(404, 'Route not found'));
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error instanceof SyntaxError && error.status === 400 ? 400 : error.status ?? 500;
  const message = status === 500 ? 'Internal server error' : error.message;
  return sendError(res, status, message);
});

function startServer(port = configuredPort) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const actualPort = server.address().port;
      console.log(`Inventory API is running at http://localhost:${actualPort}`);
      resolve(server);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        const fallbackPort = Number(port) + 1;
        console.warn(`Port ${port} is busy. Retrying on ${fallbackPort}...`);
        server.close();
        resolve(startServer(fallbackPort));
        return;
      }

      reject(error);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };