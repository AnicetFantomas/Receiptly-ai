import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Receipt } from '../extract/receipt.schema';
import type { ReceiptStore, StoredReceipt } from './receipt-store.interface';
import { computeNeedsReview, normalizeVendor } from './review';

/**
 * The original file-backed store, kept in the codebase to prove the interface
 * is genuinely swappable. Not wired into the API (Postgres is), but still valid.
 */
export class JsonReceiptStore implements ReceiptStore {
  constructor(private filePath = 'data/receipts.json') {}

  private read(): StoredReceipt[] {
    if (!fs.existsSync(this.filePath)) return [];
    const raw = fs.readFileSync(this.filePath, 'utf-8').trim();
    if (!raw) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        `${this.filePath} is not valid JSON. Fix or delete it before saving again.`,
      );
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`${this.filePath} should contain a JSON array of receipts.`);
    }
    return parsed as StoredReceipt[];
  }

  // Write to a temp file then rename. Rename is atomic on POSIX, so a crash
  // mid-write leaves the original file intact rather than truncated.
  private write(receipts: StoredReceipt[]): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(receipts, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      fs.rmSync(tmp, { force: true });
      throw err;
    }
  }

  // Serializes concurrent saves: each waits for the previous read-modify-write,
  // otherwise interleaved saves silently drop rows.
  private queue: Promise<unknown> = Promise.resolve();

  async save(receipt: Receipt, imagePath: string): Promise<StoredReceipt> {
    const run = this.queue.then(() => {
      // Drop the intake-gate fields: a filed record is a receipt by definition.
      const { isReceipt: _i, rejectionReason: _r, ...rest } = receipt;
      const normalized = {
        ...rest,
        vendor: normalizeVendor(receipt.vendor),
      };
      const stored: StoredReceipt = {
        ...normalized,
        id: `rcpt_${randomUUID()}`,
        imagePath,
        needsReview: computeNeedsReview(normalized),
        extractedAt: new Date().toISOString(),
      };

      const all = this.read();
      all.push(stored);
      this.write(all);
      return stored;
    });

    this.queue = run.catch(() => {});
    return run;
  }

  async list(): Promise<StoredReceipt[]> {
    // Newest first, to match the Postgres store's contract.
    return this.read().sort((a, b) => b.extractedAt.localeCompare(a.extractedAt));
  }
}
