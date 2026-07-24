import type { Receipt } from '../extract/receipt.schema';

// The review rules only read these fields, so they apply equally to a freshly
// extracted Receipt and an already-stored one (which drops the intake-gate
// fields). Keeping the parameter narrow means neither caller has to fake them.
export type Reviewable = Pick<
  Receipt,
  'confidence' | 'currency' | 'total' | 'lineItems'
>;

/**
 * The single source of truth for the review rules. Used on save and re-run on
 * every PATCH, so correcting a receipt actually clears (or re-raises) its flag.
 *
 * A receipt needs human review if ANY of these hold:
 *   - confidence is 'low'
 *   - currency is 'UNKNOWN'
 *   - line items don't sum to the stated total (off by more than 1)
 */
export function computeNeedsReview(receipt: Reviewable): boolean {
  const sum = receipt.lineItems.reduce((s, i) => s + i.price * i.quantity, 0);
  return (
    receipt.confidence === 'low' ||
    receipt.currency === 'UNKNOWN' ||
    Math.abs(sum - receipt.total) > 1
  );
}

/** Human-readable reasons a receipt is flagged — drives the review UI. */
export function reviewReasons(receipt: Reviewable): string[] {
  const reasons: string[] = [];
  if (receipt.confidence === 'low') {
    reasons.push('The model had low confidence in this reading.');
  }
  if (receipt.currency === 'UNKNOWN') {
    reasons.push('No currency was printed on the receipt.');
  }
  const sum = receipt.lineItems.reduce((s, i) => s + i.price * i.quantity, 0);
  if (Math.abs(sum - receipt.total) > 1) {
    reasons.push(
      `Line items add up to ${sum}, but the stated total is ${receipt.total}.`,
    );
  }
  return reasons;
}

/** Normalize a vendor name so the same vendor groups together in the summary. */
export function normalizeVendor(vendor: string): string {
  return vendor.trim().replace(/\s+/g, ' ');
}
