import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { PostgresReceiptStore } from './postgres-receipt-store';
import type { Receipt } from '../extract/receipt.schema';

// Integration test against the real Postgres container (docker compose up).
// Skips itself cleanly if no database is reachable, so `npm test` still passes
// on a machine without Docker.
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://receiptly:receiptly@localhost:5434/receiptly';

// Everything runs inside a throwaway schema so it never touches real data.
const TEST_SCHEMA = `test_${Date.now()}`;

const sample: Receipt = {
  isReceipt: true,
  rejectionReason: '',
  vendor: '  Corner   Store ', // deliberately messy, to prove normalization
  date: '2026-07-10',
  currency: 'USD',
  total: 30,
  confidence: 'high',
  notes: '',
  lineItems: [
    { name: 'Milk', quantity: 2, price: 5 },
    { name: 'Bread', quantity: 1, price: 20 },
  ],
};

describe('PostgresReceiptStore (integration)', () => {
  let pool: Pool;
  let store: PostgresReceiptStore;
  let available = true;

  beforeAll(async () => {
    // A bootstrap pool (default search_path) just to create the schema.
    const bootstrap = new Pool({ connectionString: DATABASE_URL });
    try {
      await bootstrap.query(`CREATE SCHEMA ${TEST_SCHEMA}`);
    } catch {
      available = false;
      await bootstrap.end().catch(() => {});
    }

    if (available) {
      // The real pool pins search_path on EVERY pooled connection via `options`,
      // so transactions (which grab their own client) also see the test schema.
      pool = new Pool({
        connectionString: DATABASE_URL,
        options: `-c search_path=${TEST_SCHEMA}`,
      });
      const schema = readFileSync(
        join(__dirname, '..', '..', 'db', 'schema.sql'),
        'utf-8',
      );
      await pool.query(schema);
      store = new PostgresReceiptStore(pool);
      await bootstrap.end();
    }
  });

  afterAll(async () => {
    if (available && pool) {
      await pool.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
      await pool.end();
    }
  });

  // Guard every test body so the suite is a clean no-op without a database.
  const dbit = (name: string, fn: () => Promise<void>) =>
    it(name, async () => {
      if (!available) {
        console.warn('Skipping: no database reachable at ' + DATABASE_URL);
        return;
      }
      await fn();
    });

  dbit('saves a receipt, normalizing the vendor', async () => {
    const stored = await store.save(sample, 'uploads/x.jpg');
    expect(stored.id).toMatch(/^rcpt_/);
    expect(stored.vendor).toBe('Corner Store'); // trimmed + collapsed
    expect(stored.needsReview).toBe(false); // 2*5 + 1*20 = 30 = total
    expect(stored.lineItems).toHaveLength(2);
  });

  dbit('round-trips through findOne with numeric types intact', async () => {
    const saved = await store.save(sample, 'uploads/y.jpg');
    const found = await store.findOne(saved.id);
    expect(found).not.toBeNull();
    // NUMERIC columns come back as strings from pg; the store must parse them.
    expect(typeof found!.total).toBe('number');
    expect(found!.total).toBe(30);
    expect(typeof found!.lineItems[0].price).toBe('number');
  });

  dbit('lists newest first', async () => {
    const list = await store.list();
    const times = list.map((r) => r.extractedAt);
    const sorted = [...times].sort((a, b) => b.localeCompare(a));
    expect(times).toEqual(sorted);
  });

  dbit('recomputes needs_review on update', async () => {
    const saved = await store.save(sample, 'uploads/z.jpg');
    // Break the sum so the receipt should now be flagged.
    const updated = await store.update(saved.id, { ...sample, total: 9999 });
    expect(updated!.needsReview).toBe(true);

    // Fix it: correct the total back to the real sum → flag clears.
    const fixed = await store.update(saved.id, { ...sample, total: 30 });
    expect(fixed!.needsReview).toBe(false);
  });

  dbit('replaces line items on update', async () => {
    const saved = await store.save(sample, 'uploads/w.jpg');
    await store.update(saved.id, {
      ...sample,
      total: 7,
      lineItems: [{ name: 'Gum', quantity: 1, price: 7 }],
    });
    const found = await store.findOne(saved.id);
    expect(found!.lineItems).toHaveLength(1);
    expect(found!.lineItems[0].name).toBe('Gum');
  });

  dbit('deletes a receipt and cascades its line items', async () => {
    const saved = await store.save(sample, 'uploads/d.jpg');
    expect(await store.remove(saved.id)).toBe(true);
    expect(await store.findOne(saved.id)).toBeNull();

    const orphans = await pool.query(
      `SELECT count(*)::int AS n FROM line_items WHERE receipt_id = $1`,
      [saved.id],
    );
    expect(orphans.rows[0].n).toBe(0);
  });

  dbit('returns false when deleting a missing receipt', async () => {
    expect(await store.remove('rcpt_does_not_exist')).toBe(false);
  });

  dbit('does not persist the intake-gate fields', async () => {
    const saved = await store.save(sample, 'uploads/gate.jpg');
    // isReceipt/rejectionReason gate the upload; they aren't part of a record.
    expect(saved).not.toHaveProperty('isReceipt');
    expect(saved).not.toHaveProperty('rejectionReason');

    const found = await store.findOne(saved.id);
    expect(found).not.toHaveProperty('isReceipt');
    expect(found).not.toHaveProperty('rejectionReason');
  });
});
