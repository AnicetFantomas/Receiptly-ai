<div align="center">

# Receiptly

**Photograph a receipt → a vision model extracts structured line-item data → Postgres stores it and flags anything a human should check.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenAI](https://img.shields.io/badge/GPT--4o--mini-vision-412991?logo=openai&logoColor=white)](https://platform.openai.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## What this project is about

Getting an LLM to *read* a receipt is the easy part. The engineering problem is everything around it: **what happens when the model is wrong, unsure, or handed a photo of a dog** — and how you stop those failures from quietly becoming bad data in your database.

Receiptly is built around that question. The extraction is a few dozen lines; the rest is the machinery that makes its output trustworthy.

---

## Engineering decisions

### 1. Schema-forced extraction — the model cannot return malformed data

Extraction uses **OpenAI structured outputs** with a **Zod** schema (`zodResponseFormat`). The model isn't asked politely for JSON; the response is constrained to the schema at decode time, so `total` is always a number and `currency` is always one of six enum values. No defensive parsing, no `JSON.parse` in a try/catch.

The prompt encodes rules earned from real receipts:

```
- RWF has no decimal subunit. Never return decimal values for RWF amounts.
- If the currency is not printed on the receipt, use "UNKNOWN".
  Do not infer it from the vendor, location, or context.
- Read digit groups carefully: "10,686" is ten thousand six hundred
  eighty-six, not 106.86.
```

Each line exists because of a specific misread. The `"10,686"` rule came from the model confidently returning `106.86` for a utility bill.

### 2. The intake gate — a non-receipt is rejected, not invented

Structured outputs have a sharp edge: **forcing a schema means the model must fill every field.** Hand it a photo of a cat and it will dutifully invent a vendor and a total, because the schema gives it nowhere to say "this isn't a receipt."

The fix is to give it that channel — an `isReceipt` discriminator on the schema:

```
Upload → isReceipt: false → HTTP 422, image deleted from disk, nothing written to Postgres
```

The gate doesn't trust the model to comply with the "zero everything out" instruction either. `isReceipt: false` alone rejects the upload, even if the model filled in a plausible vendor and amount anyway. There's a test for exactly that case.

### 3. Confidence-based review flagging

Extraction quality is a spectrum, so a receipt is flagged `needs_review` when **any** of these hold:

| Rule | Why |
|------|-----|
| `confidence` is `low` | The model told you it was guessing |
| `currency` is `UNKNOWN` | Nothing printed on the receipt — inferring it would be fabrication |
| `\|Σ(price × qty) − total\| > 1` | Arithmetic disagrees with the stated total |

The third is the useful one: it's an **internal-consistency check that catches misreads the model was confident about**. A missed line item or a decimal error shows up as a sum mismatch even when `confidence: high`.

The rules live in one pure module, run on save, and **re-run on every edit** — so correcting a receipt clears the flag automatically, and introducing a new error re-raises it. The API also returns plain-language reasons, so the UI and the server can never disagree about *why* something is flagged.

### 4. Swappable storage behind a stable interface

```ts
export interface ReceiptStore {
  save(receipt: Receipt, imagePath: string): Promise<StoredReceipt>;
  list(): Promise<StoredReceipt[]>;
}
```

The project began as a CLI writing to a JSON file. Moving to Postgres meant writing `PostgresReceiptStore` — **the interface never changed**, and `JsonReceiptStore` still satisfies it.

The interface was deliberately *not* widened when the HTTP API needed `findOne`/`update`/`remove`. Those live in the service layer, so the storage seam stays a narrow, genuinely swappable contract instead of drifting into a catch-all repository.

### 5. Raw SQL, no ORM

Aggregation happens in **Postgres**, not JavaScript:

```sql
SELECT vendor, currency, SUM(total) AS total, COUNT(*) AS count
  FROM receipts
 GROUP BY vendor, currency        -- never sums across currencies
 ORDER BY currency, SUM(total) DESC
```

Grouping by `(vendor, currency)` rather than vendor alone is deliberate. The JSON-file version had a real bug where **10,000 RWF was added to 50 USD and labelled USD** — an ORM wouldn't have prevented it, but expressing the grouping in SQL makes the mistake structurally impossible.

Writes that span both tables run in a transaction; `pg` is injected as a pooled provider under a `DB_POOL` token.

### 6. Data-integrity details

- **Vendor normalization** on write (`trim` + collapse whitespace) so `"  Java   House "` and `"Java House"` group as one vendor.
- **UUID primary keys** — the original `Date.now()` scheme collided under concurrent saves (verified: 5 parallel writes produced **3 unique IDs**).
- **Serialized writes** in the JSON store — the naive read-modify-write silently dropped rows when saves interleaved.
- **Atomic file writes** via temp-file + `rename`, so a crash mid-write can't truncate existing data.
- `ON DELETE CASCADE` on line items.

---

## Architecture

```
┌──────────────┐   multipart    ┌───────────────────────────┐   raw SQL   ┌────────────┐
│  Next.js 15  │ ─────────────► │        NestJS API         │ ──────────► │ Postgres16 │
│  App Router  │ ◄───────────── │                           │ ◄────────── │            │
└──────────────┘   typed JSON   │  ExtractService  ─────────┼──► OpenAI   └────────────┘
                                │  intake gate (422)        │   gpt-4o-mini
                                │  review rules             │   + Zod schema
                                │  PostgresReceiptStore     │
                                └───────────────────────────┘
```

```
apps/
  api/                       NestJS 11
    db/schema.sql            two tables, FK cascade
    src/
      extract/               Zod schema + prompt + intake gate
      receipts/              store interface, both implementations, review rules
      summary/               SQL GROUP BY aggregation
      database/              DB_POOL provider
      common/                exception → HTTP status mapping
  web/                       Next.js 15 · React 19 · Tailwind
    src/app/                 capture · receipts · detail/review · spending
```

---

## API

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/receipts` | Multipart upload → extract → gate → store |
| `GET` | `/receipts` | List, newest first |
| `GET` | `/receipts/:id` | One receipt with line items + review reasons |
| `PATCH` | `/receipts/:id` | Human corrections; **recomputes** the review flag |
| `DELETE` | `/receipts/:id` | Delete (line items cascade) |
| `GET` | `/summary` | Totals by currency and vendor via SQL `GROUP BY` |

Errors map to meaningful statuses rather than a blanket 500: **422** for a non-receipt, **502** for an upstream model failure (with the provider's raw message logged server-side, never returned to the client), **400** for validation, **404** for a missing record.

---

## Testing

**29 tests across 4 suites.**

- **Unit** — review rules: every flag condition, the ±1 rounding tolerance and its boundary, quantity-vs-unit-price, vendor normalization.
- **Integration** — `PostgresReceiptStore` against a real database, in a **throwaway schema created and dropped per run**. Covers numeric-type round-tripping (`pg` returns `NUMERIC` as strings), flag recomputation, and cascade deletes. Skips cleanly when no database is reachable.
- **E2E** — boots the real Nest app with extraction stubbed, then asserts a non-receipt upload returns **422**, leaves the **row count unchanged**, and leaves **no orphaned file** on disk.

```bash
cd apps/api && npm test
```

---

## Running it

**Prerequisites:** Node 20+, Docker, an OpenAI API key.

```bash
# 1 — database
docker compose up -d                   # Postgres 16 on :5434

# 2 — API
cd apps/api
cp .env.example .env                   # add your OPENAI_API_KEY
npm install
npm run db:schema                      # apply db/schema.sql
npm run dev                            # → :3001

# 3 — web
cd apps/web
cp .env.example .env
npm install
npm run dev                            # → :3000
```

Open **http://localhost:3000** and upload a receipt photo.

---

## Stack

**Backend** — NestJS 11 · TypeScript · PostgreSQL 16 · `pg` (raw SQL, no ORM) · Zod · OpenAI SDK · Multer · Jest
**Frontend** — Next.js 15 (App Router) · React 19 · Tailwind CSS 3 · zero component libraries
**Infra** — Docker Compose · dependency injection · environment-based config

---

<div align="center">
<sub>Built to explore what production-grade LLM integration actually requires — beyond the API call.</sub>
</div>
