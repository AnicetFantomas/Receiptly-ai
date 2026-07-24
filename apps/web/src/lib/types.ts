// API contract shapes for the Receiptly backend (NestJS). Kept in sync with
// apps/api/src/extract/receipt.schema.ts and receipts.service.ts.

export type Currency = "RWF" | "USD" | "EUR" | "KES" | "GBP" | "UNKNOWN";
export type Confidence = "high" | "medium" | "low";

export interface LineItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Receipt {
  id: string;
  vendor: string;
  date: string; // YYYY-MM-DD
  currency: Currency;
  total: number;
  confidence: Confidence;
  notes: string;
  lineItems: LineItem[];
  imagePath: string;
  needsReview: boolean;
  extractedAt: string; // ISO
  /** Plain-language reasons this receipt is flagged; empty when not flagged. */
  reviewReasons: string[];
}

// Body for PATCH /receipts/:id — the full corrected receipt.
export interface ReceiptCorrection {
  vendor: string;
  date: string;
  currency: Currency;
  total: number;
  confidence: Confidence;
  notes: string;
  lineItems: LineItem[];
}

export interface CurrencyTotal {
  currency: string;
  total: number;
  count: number;
}

export interface VendorTotal {
  vendor: string;
  currency: string;
  total: number;
  count: number;
}

export interface Summary {
  byCurrency: CurrencyTotal[];
  byVendor: VendorTotal[];
  needsReviewCount: number;
}

export const CURRENCIES: Currency[] = [
  "RWF",
  "USD",
  "EUR",
  "KES",
  "GBP",
  "UNKNOWN",
];
export const CONFIDENCES: Confidence[] = ["high", "medium", "low"];
