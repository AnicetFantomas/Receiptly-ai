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
import type { Receipt, ReceiptCorrection, LineItem } from "@/lib/types";
import { CURRENCIES, CONFIDENCES } from "@/lib/types";
import { ReviewBadge } from "@/components/ReviewBadge";
import { ReviewReasons } from "@/components/ReviewReasons";
import { ReceiptImage } from "@/components/ReceiptImage";
import { LeaderRow } from "@/components/LeaderRow";

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
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getReceipt(id)
      .then((r) => {
        setReceipt(r);
        setForm(toForm(r));
        // Flagged receipts open straight into edit mode — correcting them is
        // the whole reason you're here.
        setEditing(r.needsReview);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Something went wrong."),
      );
  }, [id]);

  // Live echo of the server's sum-vs-total rule so the mismatch visibly closes
  // as items are corrected. The server stays the source of truth.
  const liveSum = form
    ? form.lineItems.reduce(
        (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0),
        0,
      )
    : 0;
  const liveTotal = form ? Number(form.total) || 0 : 0;
  const sumMismatch = Math.abs(liveSum - liveTotal) > 1;

  function updateItem(
    idx: number,
    patch: Partial<FormState["lineItems"][number]>,
  ) {
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
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
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
      <div className="rounded-xl2 border border-flag/25 bg-flagdim p-6">
        <p className="text-sm font-semibold text-flag">Receipt unavailable</p>
        <p className="mt-1.5 text-sm text-mid">{error}</p>
        <Link href="/receipts" className="btn-ghost mt-5">
          Back to receipts
        </Link>
      </div>
    );
  }

  if (!receipt || !form) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-4 w-28" />
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="panel space-y-4 p-6 lg:col-span-3">
            <div className="skeleton h-7 w-1/2" />
            <div className="skeleton h-4 w-1/4" />
            <div className="skeleton h-px w-full" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-5/6" />
          </div>
          <div className="panel h-56 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + save toast */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/receipts"
          className="group inline-flex items-center gap-1.5 text-sm text-mid transition-colors hover:text-hi"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Receipts
        </Link>
        {saved && (
          <span className="badge-ok animate-rise">
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Saved
          </span>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ── Main record ──────────────────────────────────── */}
        <div className="panel panel-lit lg:col-span-3">
          <div className="p-6 sm:p-7">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {editing ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-lo">
                        Vendor
                      </span>
                      <input
                        className="input text-base font-medium"
                        value={form.vendor}
                        onChange={(e) =>
                          setForm({ ...form, vendor: e.target.value })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-lo">
                        Date
                      </span>
                      <input
                        className="input font-mono"
                        value={form.date}
                        onChange={(e) =>
                          setForm({ ...form, date: e.target.value })
                        }
                        placeholder="YYYY-MM-DD"
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                      {receipt.vendor}
                    </h1>
                    <p className="mt-1 font-mono text-sm text-mid">
                      {receipt.date}
                    </p>
                  </>
                )}
              </div>

              {!editing && (
                <div className="text-right">
                  <p className="tabular text-2xl font-semibold">
                    {receipt.total.toLocaleString(undefined, {
                      minimumFractionDigits: receipt.currency === "RWF" ? 0 : 2,
                      maximumFractionDigits: receipt.currency === "RWF" ? 0 : 2,
                    })}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-mid">
                    {receipt.currency}
                  </p>
                </div>
              )}
            </div>

            {receipt.needsReview && !editing && (
              <div className="mt-4">
                <ReviewBadge />
              </div>
            )}

            <div className="my-6 h-px bg-edge" />

            {/* Line items */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-lo">
                Line items
              </p>
              {editing && (
                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      lineItems: [
                        ...form.lineItems,
                        { name: "", quantity: "1", price: "0" },
                      ],
                    })
                  }
                  className="text-xs font-medium text-amber-600 transition-colors hover:text-amber-700"
                >
                  + Add item
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                {form.lineItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      aria-label={`Item ${i + 1} name`}
                    />
                    <input
                      className="input tabular w-16 text-right"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(i, { quantity: e.target.value })
                      }
                      aria-label={`Item ${i + 1} quantity`}
                    />
                    <input
                      className="input tabular w-24 text-right"
                      inputMode="decimal"
                      value={item.price}
                      onChange={(e) => updateItem(i, { price: e.target.value })}
                      aria-label={`Item ${i + 1} price`}
                    />
                    <button
                      onClick={() =>
                        setForm({
                          ...form,
                          lineItems: form.lineItems.filter((_, j) => j !== i),
                        })
                      }
                      aria-label={`Remove item ${i + 1}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lo transition-colors hover:bg-flag/10 hover:text-flag"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {form.lineItems.length === 0 && (
                  <p className="py-2 text-sm text-lo">No line items.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {receipt.lineItems.map((item, i) => (
                  <LeaderRow
                    key={i}
                    label={
                      <>
                        <span className="font-mono text-mid">
                          {item.quantity}×
                        </span>{" "}
                        {item.name}
                      </>
                    }
                    value={formatMoney(item.price, receipt.currency)}
                  />
                ))}
                {receipt.lineItems.length === 0 && (
                  <p className="text-sm text-lo">No line items.</p>
                )}
              </div>
            )}

            <div className="my-5 h-px bg-edge" />

            {/* Reconciliation */}
            <LeaderRow
              muted
              label="Items subtotal"
              value={formatMoney(liveSum, form.currency)}
            />

            {editing ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-lo">
                      Currency
                    </span>
                    <select
                      className="input"
                      value={form.currency}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          currency: e.target.value as Receipt["currency"],
                        })
                      }
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-lo">
                      Total
                    </span>
                    <input
                      className="input tabular text-right font-semibold"
                      inputMode="decimal"
                      value={form.total}
                      onChange={(e) =>
                        setForm({ ...form, total: e.target.value })
                      }
                    />
                  </label>
                </div>
                <div
                  className={`mt-3 flex items-center gap-2 rounded-xl border p-3 text-xs transition-colors duration-300 ${
                    sumMismatch
                      ? "border-flag/25 bg-flagdim text-flag"
                      : "border-ok/25 bg-okdim text-ok"
                  }`}
                >
                  {sumMismatch ? (
                    <>
                      <span aria-hidden>⚠</span>
                      Items and total differ by{" "}
                      {formatMoney(Math.abs(liveSum - liveTotal), form.currency)}
                    </>
                  ) : (
                    <>
                      <span aria-hidden>✓</span>
                      Items match the total
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-2.5">
                <LeaderRow
                  bold
                  label="Total"
                  value={formatMoney(receipt.total, receipt.currency)}
                />
              </div>
            )}

            <div className="my-6 h-px bg-edge" />

            {/* Confidence + notes */}
            {editing ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-lo">
                    Reading confidence
                  </span>
                  <select
                    className="input"
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
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-lo">
                    Notes
                  </span>
                  <textarea
                    className="input min-h-[5rem] resize-y leading-relaxed"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <LeaderRow
                  muted
                  label="Reading confidence"
                  value={
                    <span
                      className={
                        receipt.confidence === "low"
                          ? "text-flag"
                          : receipt.confidence === "high"
                            ? "text-ok"
                            : "text-mid"
                      }
                    >
                      {receipt.confidence}
                    </span>
                  }
                />
                {receipt.notes && (
                  <p className="rounded-xl border border-edge bg-base2 p-3.5 text-xs leading-relaxed text-mid">
                    <span className="font-medium text-hi">Note · </span>
                    {receipt.notes}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-flag">{error}</p>
            )}

            {/* Actions */}
            <div className="mt-7 flex flex-wrap gap-3">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? "Saving…" : "Save corrections"}
                  </button>
                  <button
                    onClick={() => {
                      setForm(toForm(receipt));
                      setEditing(false);
                      setError(null);
                    }}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="btn-ghost">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                  Edit receipt
                </button>
              )}
              <button onClick={handleDelete} className="btn-danger ml-auto">
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* ── Side column ──────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-2">
          {receipt.needsReview && (
            <ReviewReasons reasons={receipt.reviewReasons} />
          )}
          <ReceiptImage
            src={imageUrl(receipt.imagePath)}
            alt={`Receipt from ${receipt.vendor}`}
          />
          <div className="panel p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-lo">
              Record
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-mid">Captured</dt>
                <dd className="tabular text-right">
                  {new Date(receipt.extractedAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mid">Items</dt>
                <dd className="tabular">{receipt.lineItems.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-mid">ID</dt>
                <dd className="truncate font-mono text-xs text-lo">
                  {receipt.id.replace("rcpt_", "")}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
