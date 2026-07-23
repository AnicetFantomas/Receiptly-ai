import { Injectable, NotFoundException } from '@nestjs/common';
import { ExtractService } from '../extract/extract.service';
import { PostgresReceiptStore } from './postgres-receipt-store';
import type { StoredReceipt } from './receipt-store.interface';
import type { Receipt } from '../extract/receipt.schema';
import { reviewReasons } from './review';

// A stored receipt plus the plain-language reasons it's flagged (empty if not).
// The frontend's review flow renders these directly.
export interface ReceiptWithReasons extends StoredReceipt {
  reviewReasons: string[];
}

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly extract: ExtractService,
    // Depend on the concrete Postgres store: it satisfies ReceiptStore for
    // save/list and also carries the findOne/update/remove the HTTP API needs.
    private readonly store: PostgresReceiptStore,
  ) {}

  /** Extract from an uploaded image, then store. needs_review is set in save(). */
  async createFromImage(imagePath: string): Promise<ReceiptWithReasons> {
    const extracted = await this.extract.extractReceipt(imagePath);
    const stored = await this.store.save(extracted, imagePath);
    return this.withReasons(stored);
  }

  async list(): Promise<ReceiptWithReasons[]> {
    const receipts = await this.store.list();
    return receipts.map((r) => this.withReasons(r));
  }

  async findOne(id: string): Promise<ReceiptWithReasons> {
    const receipt = await this.store.findOne(id);
    if (!receipt) throw new NotFoundException(`Receipt ${id} not found`);
    return this.withReasons(receipt);
  }

  /** Apply human corrections; needs_review is recomputed inside the store. */
  async update(id: string, receipt: Receipt): Promise<ReceiptWithReasons> {
    const updated = await this.store.update(id, receipt);
    if (!updated) throw new NotFoundException(`Receipt ${id} not found`);
    return this.withReasons(updated);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.store.remove(id);
    if (!deleted) throw new NotFoundException(`Receipt ${id} not found`);
  }

  private withReasons(receipt: StoredReceipt): ReceiptWithReasons {
    return { ...receipt, reviewReasons: reviewReasons(receipt) };
  }
}
