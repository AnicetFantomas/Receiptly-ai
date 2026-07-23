-- Receiptly schema. Raw SQL, applied via `npm run db:schema` (see apps/api).
-- Idempotent so it can be re-run safely during development.

CREATE TABLE IF NOT EXISTS receipts (
  -- Text id (e.g. rcpt_<uuid>) so the Postgres and JSON stores produce
  -- interchangeable records — the ReceiptStore interface stays swappable.
  id           TEXT PRIMARY KEY,
  vendor       TEXT NOT NULL,
  date         TEXT NOT NULL,          -- YYYY-MM-DD as extracted; kept as text, not coerced
  currency     TEXT NOT NULL,          -- 3-letter code or 'UNKNOWN'
  total        NUMERIC(14, 2) NOT NULL,
  confidence   TEXT NOT NULL,          -- 'high' | 'medium' | 'low'
  notes        TEXT NOT NULL DEFAULT '',
  image_path   TEXT NOT NULL,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS line_items (
  id         SERIAL PRIMARY KEY,
  receipt_id TEXT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  quantity   NUMERIC(14, 3) NOT NULL,
  price      NUMERIC(14, 2) NOT NULL
);

-- Summary groups by these; index the hot paths.
CREATE INDEX IF NOT EXISTS receipts_extracted_at_idx ON receipts (extracted_at DESC);
CREATE INDEX IF NOT EXISTS receipts_vendor_currency_idx ON receipts (vendor, currency);
CREATE INDEX IF NOT EXISTS line_items_receipt_id_idx ON line_items (receipt_id);
