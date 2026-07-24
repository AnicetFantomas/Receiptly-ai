"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getReceipt,
  correctReceipt,
  deleteReceipt,
  formatMoney,
  imageUrl,
  ApiError,
} from "@/lib/api";
import { ReceiptImage } from "@/components/ReceiptImage";
import type { Receipt, ReceiptCorrection, LineItem } from "@/lib/types";
import { CURRENCIES, CONFIDENCES } from "@/lib/types";
import { ReviewBadge } from "@/components/ReviewBadge";
import { ReviewReasons } from "@/components/ReviewReasons";

// Editable form state mirrors ReceiptCorrection but keeps numbers as strings
// while typing, so a half-typed "12." doesn't get coerced to NaN mid-edit.
interface FormState {
  vendor: string;
  date: string;
  currency: Receipt["currency"];
  total: string;
  confidence: Receipt["confidence"];
  notes: string;
  lineItems: { name: string; quantity: string; price: string }[];
}

function toForm(r: Receipt): FormState {
  return {
    vendor: r.vendor,
    date: r.date,
    currency: r.currency,
    total: String(r.total),
    confidence: r.confidence,
    notes: r.notes,
    lineItems: r.lineItems.map((i) => ({
      name: i.name,
      quantity: String(i.quantity),
      price: String(i.price),
    })),
  };
}

function toCorrection(f: FormState): ReceiptCorrection {
  const lineItems: LineItem[] = f.lineItems.map((i) => ({
    name: i.name,
    quantity: Number(i.quantity) || 0,
    price: Number(i.price) || 0,
  }));
  return {
    vendor: f.vendor,
    date: f.date,
    currency: f.currency,
    total: Number(f.total) || 0,
    confidence: f.confidence,
    notes: f.notes,
    lineItems,
  };
}

const inputCls =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-moss-500 focus:outline-none focus:ring-1 focus:ring-moss-500";

export default function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReceipt(id)
      .then((r) => {
        setReceipt(r);
        setForm(toForm(r));
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Something went wrong."),
      );
  }, [id]);

  // Live client-side echo of the server's sum-vs-total rule, so the user sees
  // the mismatch shrink as they fix line items. The server remains the source
  // of truth for the actual flag.
  const liveSum = form
    ? form.lineItems.reduce(
        (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0),
        0,
      )
    : 0;
  const liveTotal = form ? Number(form.total) || 0 : 0;
  const sumMismatch = Math.abs(liveSum - liveTotal) > 1;

  function updateItem(idx: number, patch: Partial<FormState["lineItems"][number]>) {
    setForm((f) =>
      f
        ? {
            ...f,
            lineItems: f.lineItems.map((it, i) =>
              i === idx ? { ...it, ...patch } : it,
            ),
          }
        : f,
    );
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await correctReceipt(id, toCorrection(form));
      setReceipt(updated);
      setForm(toForm(updated));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this receipt? This can't be undone.")) return;
    try {
      await deleteReceipt(id);
      router.push("/receipts");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete.");
    }
  }

  if (error && !receipt) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (!receipt || !form) return <p className="text-sm text-faint">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/receipts" className="text-sm text-faint hover:text-ink">
          ← All receipts
        </Link>
        {receipt.needsReview && <ReviewBadge />}
      </div>

      {receipt.needsReview && <ReviewReasons reasons={receipt.reviewReasons} />}

      <ReceiptImage
        src={imageUrl(receipt.imagePath)}
        alt={`Receipt from ${receipt.vendor}`}
      />

      <div className="space-y-5 rounded-xl border border-line bg-card p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Vendor">
            <input
              className={inputCls}
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            />
          </Field>
          <Field label="Date">
            <input
              className={inputCls}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <select
              className={inputCls}
              value={form.currency}
              onChange={(e) =>
                setForm({ ...form, currency: e.target.value as Receipt["currency"] })
              }
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Confidence">
            <select
              className={inputCls}
              value={form.confidence}
              onChange={(e) =>
                setForm({
                  ...form,
                  confidence: e.target.value as Receipt["confidence"],
                })
              }
            >
              {CONFIDENCES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Line items */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">
              Line items
            </p>
            <button
              onClick={() =>
                setForm({
                  ...form,
                  lineItems: [...form.lineItems, { name: "", quantity: "1", price: "0" }],
                })
              }
              className="text-sm font-medium text-moss-600 hover:text-moss-700"
            >
              + Add item
            </button>
          </div>
          <div className="space-y-2">
            {form.lineItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Name"
                  value={item.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                />
                <input
                  className={`${inputCls} w-16 tabular`}
                  inputMode="decimal"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: e.target.value })}
                />
                <input
                  className={`${inputCls} w-28 tabular`}
                  inputMode="decimal"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => updateItem(i, { price: e.target.value })}
                />
                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      lineItems: form.lineItems.filter((_, j) => j !== i),
                    })
                  }
                  aria-label="Remove item"
                  className="px-2 text-faint hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            {form.lineItems.length === 0 && (
              <p className="text-sm text-faint">No line items.</p>
            )}
          </div>
        </div>

        {/* Total + live reconciliation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="text-sm">
            <span className="text-faint">Line items sum: </span>
            <span className="tabular font-medium">
              {formatMoney(liveSum, form.currency)}
            </span>
            {sumMismatch && (
              <span className="ml-2 text-amber-700">
                ≠ total ({formatMoney(liveTotal, form.currency)})
              </span>
            )}
          </div>
          <Field label="Total" inline>
            <input
              className={`${inputCls} w-32 tabular`}
              inputMode="decimal"
              value={form.total}
              onChange={(e) => setForm({ ...form, total: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            className={`${inputCls} min-h-[60px]`}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-moss-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-moss-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save corrections"}
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-faint transition-colors hover:border-red-200 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  inline = false,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <label className={inline ? "flex items-center gap-2" : "block"}>
      <span
        className={`text-xs font-semibold uppercase tracking-wide text-faint ${
          inline ? "" : "mb-1 block"
        }`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
