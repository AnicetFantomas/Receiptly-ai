import type { Receipt } from '../extract/receipt.schema';

// A stored receipt is the extracted data plus some metadata we add ourselves.
// `needsReview` is computed server-side on save (see ReceiptsService).
//
// isReceipt/rejectionReason are omitted deliberately: they're a gate on the way
// in, not part of a filed record. Anything stored is a receipt by definition.
export interface StoredReceipt
  extends Omit<Receipt, 'isReceipt' | 'rejectionReason'> {
  id: string;
  imagePath: string;
  needsReview: boolean;
  extractedAt: string;
}

// What a human correction can set: the receipt fields, minus the intake-gate
// fields and minus the server-owned metadata (id, imagePath, extractedAt).
export type ReceiptCorrection = Omit<
  StoredReceipt,
  'id' | 'imagePath' | 'needsReview' | 'extractedAt'
>;

// The contract. The whole point of this interface is that the storage
// implementation is swappable — JsonReceiptStore and PostgresReceiptStore both
// satisfy it. Do NOT widen it: operations the HTTP API needs beyond save/list
// (get-one, patch, delete) live in ReceiptsService, keeping this seam clean.
export interface ReceiptStore {
  save(receipt: Receipt, imagePath: string): Promise<StoredReceipt>;
  list(): Promise<StoredReceipt[]>;
}
