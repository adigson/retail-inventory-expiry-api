# Personal Retail Inventory API

A simple Node.js + Express inventory API for managing retail products.

## Requirements

- Node.js 18+
- npm

## Install

```bash
npm install
```

## Run locally

Create a `.env` file from the example:

```bash
copy .env.example .env
```

Then start the server:

```bash
npm run dev
```

The app will print the local URL in the terminal, for example:

```text
Inventory API is running at http://localhost:3000
```

## Scripts

```bash
npm run dev
npm start
npm test
```

## Endpoints

- `GET /health`
- `GET /`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/low-stock`
- `GET /api/products/expiring-soon`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### Product list options

`GET /api/products` supports:

- `category=Electronics`
- `search=laptop` or `q=laptop` to search name and SKU
- `page=1&limit=10` for pagination
- `sortBy=price` or `sortBy=quantity`
- `order=asc` or `order=desc`

Products include `category` and an automatically calculated `isAvailable` value based on quantity. SKU values are unique case-insensitively and whitespace is ignored during validation.

Successful JSON API responses use `{ "data": ... }`. Product list responses also include pagination metadata in `meta`. Errors use `{ "error": { "message": "..." } }`.

## Browser testing

Open the browser UI at:

```text
http://localhost:3000
```

You can use the page to test the API visually.

## Example

```bash
curl http://localhost:3000/api/products
```

Example filtered request:

```bash
curl "http://localhost:3000/api/products?category=Electronics&sortBy=price&order=desc&page=1&limit=10"
```

## Postman import

Import the file [personal-retail-inventory-api.postman_collection.json](personal-retail-inventory-api.postman_collection.json) into Postman to test the API quickly.

## Contributor tracking

This repository maintains an active contributor list in [CONTRIBUTORS.md](CONTRIBUTORS.md). Only active contributors should be listed there; inactive or archived members are intentionally excluded.
