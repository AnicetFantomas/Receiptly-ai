import type { Receipt } from '../extract/receipt.schema';

// A stored receipt is the extracted data plus some metadata we add ourselves.
// `needsReview` is computed server-side on save (see ReceiptsService).
export interface StoredReceipt extends Receipt {
  id: string;
  imagePath: string;
  needsReview: boolean;
  extractedAt: string;
}

// The contract. The whole point of this interface is that the storage
// implementation is swappable — JsonReceiptStore and PostgresReceiptStore both
// satisfy it. Do NOT widen it: operations the HTTP API needs beyond save/list
// (get-one, patch, delete) live in ReceiptsService, keeping this seam clean.
export interface ReceiptStore {
  save(receipt: Receipt, imagePath: string): Promise<StoredReceipt>;
  list(): Promise<StoredReceipt[]>;
}
