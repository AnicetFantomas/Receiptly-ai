"use client";

import { useState } from "react";
import Link from "next/link";
import { uploadReceipt, formatMoney, ApiError } from "@/lib/api";
import type { Receipt } from "@/lib/types";
import { ReviewBadge } from "@/components/ReviewBadge";
import { ReviewReasons } from "@/components/ReviewReasons";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Receipt | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setStatus("loading");
    try {
      setResult(await uploadReceipt(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload a receipt</h1>
        <p className="mt-1 text-sm text-faint">
          Take a photo or pick an image. We&apos;ll read the vendor, total, and
          line items.
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging
            ? "border-moss-500 bg-moss-50"
            : "border-line bg-card hover:border-moss-300"
        } ${status === "loading" ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          accept={ACCEPT}
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {status === "loading" ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-moss-300 border-t-moss-600" />
            <span className="text-sm text-faint">Reading the receipt…</span>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-medium text-ink">
              Drop an image here, or tap to choose
            </p>
            <p className="text-xs text-faint">PNG, JPG, WebP or GIF · up to 10 MB</p>
          </div>
        )}
      </label>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="animate-fade-in space-y-4 rounded-xl border border-line bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-faint">Extracted</p>
              <h2 className="text-xl font-semibold">{result.vendor}</h2>
              <p className="text-sm text-faint">{result.date}</p>
            </div>
            <div className="text-right">
              <p className="tabular text-xl font-semibold">
                {formatMoney(result.total, result.currency)}
              </p>
              {result.needsReview && <ReviewBadge className="mt-2" />}
            </div>
          </div>

          {result.needsReview && <ReviewReasons reasons={result.reviewReasons} />}

          <ul className="divide-y divide-line border-y border-line">
            {result.lineItems.map((item, i) => (
              <li key={i} className="flex justify-between py-2 text-sm">
                <span>
                  <span className="tabular text-faint">{item.quantity}×</span> {item.name}
                </span>
                <span className="tabular">{formatMoney(item.price, result.currency)}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-3 pt-1 text-sm">
            <Link
              href={`/receipts/${result.id}`}
              className="rounded-md bg-moss-600 px-4 py-2 font-medium text-white transition-colors hover:bg-moss-700"
            >
              {result.needsReview ? "Review & correct" : "View receipt"}
            </Link>
            <button
              onClick={() => setResult(null)}
              className="rounded-md border border-line px-4 py-2 font-medium text-faint transition-colors hover:text-ink"
            >
              Upload another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
