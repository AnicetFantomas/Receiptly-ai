import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import type { Receipt } from '../extract/receipt.schema';
import type { ReceiptStore, StoredReceipt } from './receipt-store.interface';
import { computeNeedsReview, normalizeVendor } from './review';

// Shape of a joined receipt row coming back from Postgres. NUMERIC columns
// arrive as strings from the pg driver, so we parse them back to numbers.
interface ReceiptRow {
  id: string;
  vendor: string;
  date: string;
  currency: Receipt['currency'];
  total: string;
  confidence: Receipt['confidence'];
  notes: string;
  image_path: string;
  needs_review: boolean;
  extracted_at: Date;
}

interface LineItemRow {
  receipt_id: string;
  name: string;
  quantity: string;
  price: string;
}

@Injectable()
export class PostgresReceiptStore implements ReceiptStore {
  constructor(@Inject('DB_POOL') private readonly pool: Pool) {}

  async save(receipt: Receipt, imagePath: string): Promise<StoredReceipt> {
    const normalized: Receipt = {
      ...receipt,
      vendor: normalizeVendor(receipt.vendor),
    };
    const stored: StoredReceipt = {
      ...normalized,
      id: `rcpt_${randomUUID()}`,
      imagePath,
      needsReview: computeNeedsReview(normalized),
      extractedAt: new Date().toISOString(),
    };

    // Receipt + its line items must land together or not at all.
    await this.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO receipts
           (id, vendor, date, currency, total, confidence, notes,
            image_path, needs_review, extracted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          stored.id,
          stored.vendor,
          stored.date,
          stored.currency,
          stored.total,
          stored.confidence,
          stored.notes,
          stored.imagePath,
          stored.needsReview,
          stored.extractedAt,
        ],
      );
      await this.insertLineItems(client, stored.id, stored.lineItems);
    });

    return stored;
  }

  async list(): Promise<StoredReceipt[]> {
    // Two queries (receipts, then their items) rather than a join with N rows
    // per receipt — simpler to reassemble and fine at this scale.
    const receipts = await this.pool.query<ReceiptRow>(
      `SELECT * FROM receipts ORDER BY extracted_at DESC`,
    );
    if (receipts.rows.length === 0) return [];

    const ids = receipts.rows.map((r) => r.id);
    const items = await this.pool.query<LineItemRow>(
      `SELECT receipt_id, name, quantity, price
         FROM line_items WHERE receipt_id = ANY($1)`,
      [ids],
    );

    const itemsByReceipt = new Map<string, Receipt['lineItems']>();
    for (const row of items.rows) {
      const list = itemsByReceipt.get(row.receipt_id) ?? [];
      list.push({ name: row.name, quantity: Number(row.quantity), price: Number(row.price) });
      itemsByReceipt.set(row.receipt_id, list);
    }

    return receipts.rows.map((r) =>
      this.toStored(r, itemsByReceipt.get(r.id) ?? []),
    );
  }

  // ── Operations beyond the ReceiptStore interface, used by ReceiptsService ──

  async findOne(id: string): Promise<StoredReceipt | null> {
    const receipt = await this.pool.query<ReceiptRow>(
      `SELECT * FROM receipts WHERE id = $1`,
      [id],
    );
    const row = receipt.rows[0];
    if (!row) return null;

    const items = await this.pool.query<LineItemRow>(
      `SELECT receipt_id, name, quantity, price
         FROM line_items WHERE receipt_id = $1`,
      [id],
    );
    return this.toStored(
      row,
      items.rows.map((i) => ({
        name: i.name,
        quantity: Number(i.quantity),
        price: Number(i.price),
      })),
    );
  }

  /** Replace a receipt's fields and line items, recomputing needs_review. */
  async update(id: string, receipt: Receipt): Promise<StoredReceipt | null> {
    const normalized: Receipt = {
      ...receipt,
      vendor: normalizeVendor(receipt.vendor),
    };
    const needsReview = computeNeedsReview(normalized);

    return this.withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE receipts
            SET vendor=$2, date=$3, currency=$4, total=$5,
                confidence=$6, notes=$7, needs_review=$8
          WHERE id=$1
          RETURNING *`,
        [
          id,
          normalized.vendor,
          normalized.date,
          normalized.currency,
          normalized.total,
          normalized.confidence,
          normalized.notes,
          needsReview,
        ],
      );
      const row = result.rows[0] as ReceiptRow | undefined;
      if (!row) return null;

      // Replace children wholesale — simplest correct way to reconcile edits.
      await client.query(`DELETE FROM line_items WHERE receipt_id = $1`, [id]);
      await this.insertLineItems(client, id, normalized.lineItems);

      return this.toStored(row, normalized.lineItems);
    });
  }

  /** @returns true if a row was deleted. Line items cascade. */
  async remove(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM receipts WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // ── helpers ──

  private async insertLineItems(
    client: PoolClient,
    receiptId: string,
    items: Receipt['lineItems'],
  ): Promise<void> {
    for (const item of items) {
      await client.query(
        `INSERT INTO line_items (receipt_id, name, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [receiptId, item.name, item.quantity, item.price],
      );
    }
  }

  private async withTransaction<T>(
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private toStored(row: ReceiptRow, lineItems: Receipt['lineItems']): StoredReceipt {
    return {
      id: row.id,
      vendor: row.vendor,
      date: row.date,
      currency: row.currency,
      total: Number(row.total),
      confidence: row.confidence,
      notes: row.notes,
      lineItems,
      imagePath: row.image_path,
      needsReview: row.needs_review,
      extractedAt: row.extracted_at.toISOString(),
    };
  }
}
