# Retail Inventory and Expiry Management API

A Node.js and Express API for managing retail products, stock levels, and expiry alerts.

## Requirements

- Node.js 18 or newer
- npm

## Installation

Install the project dependencies from the repository root:

```bash
npm install
```

The server loads environment variables from `.env` when present. To create one from the example file on Windows:

```powershell
copy .env.example .env
```

The optional `PORT` variable selects the server port. It defaults to `3000`.

## Startup

Start with automatic restart during development:

```bash
npm run dev
```

Start normally:

```bash
npm start
```

The server prints its actual URL when it starts. For the default configuration, use `http://localhost:3000`.

## Data storage

The API currently uses in-memory product data. Changes made through the API are available while the process is running, but are lost when the server restarts. There is no database or persistence layer.

## Response formats

Successful responses use a `data` property:

```json
{
	"data": {
		"id": 1,
		"sku": "LAP-1001",
		"name": "Laptop",
		"category": "Electronics",
		"quantity": 12,
		"price": 999.99,
		"lowStockThreshold": 5,
		"expiryDate": "2026-10-05",
		"isAvailable": true
	}
}
```

Product list responses include pagination metadata:

```json
{
	"data": [],
	"meta": {
		"page": 1,
		"limit": 10,
		"total": 0,
		"totalPages": 0
	}
}
```

Errors use the same shape for validation, conflicts, missing products, and unknown routes:

```json
{
	"error": {
		"message": "Product not found"
	}
}
```

## Endpoints

All API paths use the `http://localhost:3000` base URL below. Replace the host or port if `PORT` is configured differently.

### Health check

`GET /health`

Returns the service status.

```bash
curl http://localhost:3000/health
```

Response:

```json
{ "data": { "status": "ok" } }
```

### Browser landing page

`GET /`

Returns a plain-text status message. Static browser files are also served from `public/`.

### List products

`GET /api/products`

Supported query parameters:

- `category`: exact, case-insensitive category filter, such as `Electronics`
- `search`: case-insensitive search in product name and SKU
- `q`: alias for `search`
- `page`: positive integer page number; defaults to `1`
- `limit`: integer from `1` to `100`; defaults to `10`
- `sortBy`: `price` or `quantity`
- `order`: `asc` or `desc`; defaults to `asc`

Example:

```bash
curl "http://localhost:3000/api/products?category=Electronics&search=phone&page=1&limit=10&sortBy=price&order=desc"
```

An unmatched filter returns `200` with an empty `data` array.

### Get one product

`GET /api/products/:id`

Example:

```bash
curl http://localhost:3000/api/products/1
```

Returns `404` if the product does not exist.

### Low-stock products

`GET /api/products/low-stock`

Returns products where `quantity` is less than or equal to `lowStockThreshold`. The default threshold is `5` when a product does not define one.

```bash
curl http://localhost:3000/api/products/low-stock
```

### Products expiring soon

`GET /api/products/expiring-soon`

Returns products with an expiry date from now through the next 30 days.

```bash
curl http://localhost:3000/api/products/expiring-soon
```

### Create a product

`POST /api/products`

Required JSON fields:

- `sku`: non-empty string
- `name`: non-empty string
- `quantity`: non-negative integer
- `price`: non-negative number

Optional JSON fields:

- `category`: non-empty string; defaults to `Uncategorized`
- `lowStockThreshold`: non-negative integer; defaults to `5`
- `expiryDate`: valid `YYYY-MM-DD` date; defaults to 30 days from creation

SKU comparison is case-insensitive and ignores leading/trailing whitespace. Duplicate SKUs return `409`.

Example:

```bash
curl -X POST http://localhost:3000/api/products `
	-H "Content-Type: application/json" `
	-d '{"sku":"MOU-4004","name":"Mouse","category":"Accessories","quantity":20,"price":29.99,"lowStockThreshold":10,"expiryDate":"2026-09-30"}'
```

Returns `201` with the created product.

### Update a product

`PUT /api/products/:id`

Accepts a partial JSON object containing any product fields. The same field validation rules as creation apply to supplied values. `isAvailable` is recalculated from `quantity`.

Example:

```bash
curl -X PUT http://localhost:3000/api/products/1 `
	-H "Content-Type: application/json" `
	-d '{"quantity":8,"price":899.99}'
```

Returns `404` for a missing product and `409` for a duplicate SKU.

### Delete a product

`DELETE /api/products/:id`

Example:

```bash
curl -X DELETE http://localhost:3000/api/products/1
```

Successful response:

```json
{ "data": { "message": "Product deleted successfully" } }
```

Returns `404` if the product does not exist.

## Error responses

- `400 Bad Request`: invalid JSON, invalid request body, invalid product fields, or invalid list query parameters
- `404 Not Found`: missing product or unknown route
- `409 Conflict`: SKU already exists
- `500 Internal Server Error`: unexpected server failure

All JSON errors have the form `{ "error": { "message": "..." } }`.

## Testing

Run the automated Node.js test suite:

```bash
npm test
```

The tests cover CRUD operations, validation, duplicate SKUs, missing products, low-stock and expiry alerts, filtering, empty results, and invalid routes.

## Postman

Import [retail-inventory-expiry-api.postman_collection.json](retail-inventory-expiry-api.postman_collection.json) into Postman. Its `baseUrl` variable defaults to `http://localhost:3000`.

## Browser testing

After starting the server, open [http://localhost:3000](http://localhost:3000) to use the browser UI served from `public/`.

## Contributor tracking

This repository maintains an active contributor list in [CONTRIBUTORS.md](CONTRIBUTORS.md). Only active contributors should be listed there; inactive or archived members are intentionally excluded.
