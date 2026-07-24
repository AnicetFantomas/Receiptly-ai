import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ExtractService,
  ExtractionError,
  NotAReceiptError,
} from './extract.service';
import type { Receipt } from './receipt.schema';

// A real (tiny) file on disk, so the service's existence/extension checks pass
// and we exercise the intake gate rather than the pre-flight guards.
function makeImage(): string {
  const dir = mkdtempSync(join(tmpdir(), 'receiptly-'));
  const file = join(dir, 'shot.jpg');
  writeFileSync(file, 'not-really-a-jpeg');
  return file;
}

// Stands in for ConfigService; the key is never used because callModel is stubbed.
const config = { get: () => 'sk-test' } as never;

/** Build a service whose model call returns the given parsed payload. */
function serviceReturning(parsed: Partial<Receipt>) {
  const service = new ExtractService(config);
  jest
    // callModel is private; the cast keeps the test honest about that.
    .spyOn(service as never, 'callModel')
    .mockResolvedValue({
      choices: [{ message: { parsed, refusal: null } }],
    } as never);
  return service;
}

const receiptPayload: Receipt = {
  isReceipt: true,
  rejectionReason: '',
  vendor: 'Java House',
  date: '2026-07-20',
  currency: 'KES',
  total: 1300,
  lineItems: [{ name: 'Coffee', quantity: 2, price: 650 }],
  confidence: 'high',
  notes: '',
};

describe('ExtractService intake gate', () => {
  it('returns the receipt when the image is one', async () => {
    const service = serviceReturning(receiptPayload);
    const result = await service.extractReceipt(makeImage());
    expect(result.vendor).toBe('Java House');
    expect(result.total).toBe(1300);
  });

  it('rejects a non-receipt with NotAReceiptError', async () => {
    const service = serviceReturning({
      ...receiptPayload,
      isReceipt: false,
      rejectionReason: 'This looks like a photo of a dog, not a receipt.',
      vendor: '',
      total: 0,
      lineItems: [],
      currency: 'UNKNOWN',
      confidence: 'low',
    });

    await expect(service.extractReceipt(makeImage())).rejects.toBeInstanceOf(
      NotAReceiptError,
    );
  });

  it('surfaces the model’s own description of what it saw', async () => {
    const service = serviceReturning({
      ...receiptPayload,
      isReceipt: false,
      rejectionReason: 'This looks like a photo of a dog, not a receipt.',
    });

    await expect(service.extractReceipt(makeImage())).rejects.toThrow(
      /photo of a dog/,
    );
  });

  it('falls back to a generic message when no reason is given', async () => {
    const service = serviceReturning({
      ...receiptPayload,
      isReceipt: false,
      rejectionReason: '   ',
    });

    await expect(service.extractReceipt(makeImage())).rejects.toThrow(
      /doesn't look like a receipt/,
    );
  });

  it('still rejects a non-receipt even when the model filled in values', async () => {
    // The prompt tells the model to zero everything out, but the gate must not
    // depend on it complying — isReceipt alone decides.
    const service = serviceReturning({
      ...receiptPayload,
      isReceipt: false,
      rejectionReason: 'A landscape photo.',
      vendor: 'Invented Vendor',
      total: 9999,
    });

    await expect(service.extractReceipt(makeImage())).rejects.toBeInstanceOf(
      NotAReceiptError,
    );
  });

  it('rejects a missing file before calling the model', async () => {
    const service = serviceReturning(receiptPayload);
    await expect(
      service.extractReceipt('/nope/missing.jpg'),
    ).rejects.toBeInstanceOf(ExtractionError);
  });
});
