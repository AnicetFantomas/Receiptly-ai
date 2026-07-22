import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Receipt } from './extract.js';

// A stored receipt is the extracted data plus some metadata we add ourselves
export interface StoredReceipt extends Receipt {
  id: string;
  imagePath: string;
  extractedAt: string;
}

// The contract. Postgres will implement this later — nothing else changes.
export interface ReceiptStore {
  save(receipt: Receipt, imagePath: string): Promise<StoredReceipt>;
  list(): Promise<StoredReceipt[]>;
}

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

  // Serializes concurrent saves: each one waits for the previous read-modify-write
  // to finish, otherwise interleaved saves silently drop rows.
  private queue: Promise<unknown> = Promise.resolve();

  async save(receipt: Receipt, imagePath: string): Promise<StoredReceipt> {
    const run = this.queue.then(() => {
      const stored: StoredReceipt = {
        ...receipt,
        id: `rcpt_${randomUUID()}`,
        imagePath,
        extractedAt: new Date().toISOString(),
      };

      const all = this.read();
      all.push(stored);
      this.write(all);

      return stored;
    });

    // Keep the chain alive even if this save throws.
    this.queue = run.catch(() => {});
    return run;
  }

  async list(): Promise<StoredReceipt[]> {
    return this.read();
  }
}