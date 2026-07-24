import { computeNeedsReview, reviewReasons, normalizeVendor } from './review';
import type { Reviewable } from './review';

// A clean receipt that passes every rule; each test tweaks one field.
// Typed as Reviewable — the rules only read the scoring fields.
const clean: Reviewable & { vendor: string; date: string; notes: string } = {
  vendor: 'Java House',
  date: '2026-07-01',
  currency: 'KES',
  total: 1000,
  confidence: 'high',
  notes: '',
  lineItems: [
    { name: 'Coffee', quantity: 2, price: 250 },
    { name: 'Cake', quantity: 1, price: 500 },
  ],
};

describe('computeNeedsReview', () => {
  it('is false when everything checks out', () => {
    expect(computeNeedsReview(clean)).toBe(false);
  });

  it('flags low confidence', () => {
    expect(computeNeedsReview({ ...clean, confidence: 'low' })).toBe(true);
  });

  it('does not flag medium confidence on its own', () => {
    expect(computeNeedsReview({ ...clean, confidence: 'medium' })).toBe(false);
  });

  it('flags UNKNOWN currency', () => {
    expect(computeNeedsReview({ ...clean, currency: 'UNKNOWN' })).toBe(true);
  });

  it('flags when line items do not sum to the total', () => {
    expect(computeNeedsReview({ ...clean, total: 9999 })).toBe(true);
  });

  it('tolerates rounding within 1 unit', () => {
    // items sum to 1000; a total off by exactly 1 is still fine
    expect(computeNeedsReview({ ...clean, total: 1001 })).toBe(false);
    expect(computeNeedsReview({ ...clean, total: 999 })).toBe(false);
  });

  it('flags a mismatch just past the tolerance', () => {
    expect(computeNeedsReview({ ...clean, total: 1002 })).toBe(true);
  });

  it('accounts for quantity, not just unit price', () => {
    // 2×250 + 1×500 = 1000; if quantity were ignored it would look like 750
    expect(computeNeedsReview({ ...clean, total: 750 })).toBe(true);
  });
});

describe('reviewReasons', () => {
  it('returns no reasons for a clean receipt', () => {
    expect(reviewReasons(clean)).toEqual([]);
  });

  it('lists every failing rule at once', () => {
    const bad: Reviewable = {
      ...clean,
      confidence: 'low',
      currency: 'UNKNOWN',
      total: 5000,
    };
    const reasons = reviewReasons(bad);
    expect(reasons).toHaveLength(3);
    expect(reasons.some((r) => /confidence/i.test(r))).toBe(true);
    expect(reasons.some((r) => /currency/i.test(r))).toBe(true);
    expect(reasons.some((r) => /add up/i.test(r))).toBe(true);
  });

  it('reports the actual sum and total in the mismatch reason', () => {
    const [reason] = reviewReasons({ ...clean, total: 5000 });
    expect(reason).toContain('1000'); // computed sum
    expect(reason).toContain('5000'); // stated total
  });
});

describe('normalizeVendor', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeVendor('  Java   House ')).toBe('Java House');
  });

  it('collapses tabs and newlines too', () => {
    expect(normalizeVendor('Java\t\nHouse')).toBe('Java House');
  });

  it('leaves an already-clean name untouched', () => {
    expect(normalizeVendor('Java House')).toBe('Java House');
  });
});
