import { z } from 'zod';

// ── The contract ──────────────────────────────────────────
// This is the shape the model MUST return. Not a suggestion.
// COPIED VERBATIM from the original src/extract.ts — tuned against real
// receipts; do not change without re-testing against them.
export const LineItem = z.object({
  name: z.string(),
  quantity: z.number(),
  price: z.number(),
});

export const Receipt = z.object({
  vendor: z.string(),
  date: z.string(), // ISO format: YYYY-MM-DD
  // 'UNKNOWN' must stay in this list: the prompt tells the model to use it
  // rather than guess a currency that isn't printed on the receipt.
  currency: z.enum(['RWF', 'USD', 'EUR', 'KES', 'GBP', 'UNKNOWN']),
  total: z.number(),
  lineItems: z.array(LineItem),
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string(), // anything unclear or unreadable
});

export type Receipt = z.infer<typeof Receipt>;
export type LineItem = z.infer<typeof LineItem>;
