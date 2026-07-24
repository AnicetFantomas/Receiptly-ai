# Receiptly

Photograph a receipt → a vision model extracts structured data → the app stores
it, flags anything that needs a human look, and summarizes spending by currency
and vendor.

```
receiptly-ai/
  docker-compose.yml     Postgres 16 (host port 5434)
  apps/
    api/                 NestJS — extraction, storage, summary (raw SQL, no ORM)
    web/                 Next.js 15 (App Router) + Tailwind
  src/                   the original CLI (kept for reference; superseded by apps/api)
```

## Prerequisites

- Node 20+
- Docker (for Postgres)
- An OpenAI API key (vision extraction uses `gpt-4o-mini`)

## Setup

### 1. Database

```bash
docker compose up -d          # Postgres 16 on localhost:5434
```

### 2. API (`apps/api`)

```bash
cd apps/api
cp .env.example .env          # then set OPENAI_API_KEY
npm install
npm run db:schema             # apply db/schema.sql
npm run dev                   # http://localhost:3001
```

### 3. Web (`apps/web`)

```bash
cd apps/web
cp .env.example .env          # NEXT_PUBLIC_API_URL defaults to :3001
npm install
npm run dev                   # http://localhost:3000
```

Open http://localhost:3000, upload a receipt photo, and go.

## API

| Method | Route            | Purpose                                             |
| ------ | ---------------- | --------------------------------------------------- |
| POST   | `/receipts`      | multipart image upload → extract → store → return   |
| GET    | `/receipts`      | list, newest first                                  |
| GET    | `/receipts/:id`  | one receipt with line items + review reasons        |
| PATCH  | `/receipts/:id`  | apply human corrections; recomputes the review flag |
| DELETE | `/receipts/:id`  | delete (line items cascade)                         |
| GET    | `/summary`       | totals by currency and by vendor (SQL `GROUP BY`)   |

### Review rules

A receipt is flagged `needs_review` (computed on save, recomputed on every
PATCH) if **any** hold:

- confidence is `low`
- currency is `UNKNOWN`
- `sum(price × quantity)` differs from `total` by more than 1

## Design notes

- **Raw SQL via a DI-provided `pg` Pool** (token `DB_POOL`), same pattern as
  Vidya. No ORM.
- **`ReceiptStore` interface unchanged.** `PostgresReceiptStore` and
  `JsonReceiptStore` both satisfy it (`save`/`list`). The extra HTTP operations
  (get-one, patch, delete) live in `ReceiptsService`, so the storage seam stays
  swappable rather than bloating.
- **Extraction prompt and Zod schema are copied verbatim** from the original CLI
  — they were tuned against real receipts (RWF has no decimals, don't infer an
  unprinted currency, today's date is injected).
- **Summary aggregates in SQL, never JavaScript**, and never sums across
  currencies — that was the point of moving off JSON files.
- **`db:schema`** applies the schema with a tiny `pg`-based Node script instead
  of `psql`, so setup needs only Docker + `npm install` (no local Postgres
  client).
