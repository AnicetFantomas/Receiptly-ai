"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listReceipts, formatMoney, imageUrl, ApiError } from "@/lib/api";
import type { Receipt } from "@/lib/types";
import { ReviewBadge } from "@/components/ReviewBadge";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReceipts()
      .then(setReceipts)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Something went wrong."),
      );
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receipts</h1>
          <p className="mt-1 text-sm text-faint">Newest first.</p>
        </div>
        <Link
          href="/"
          className="rounded-md bg-moss-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moss-700"
        >
          Upload
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!receipts && !error && <p className="text-sm text-faint">Loading…</p>}

      {receipts?.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-card p-10 text-center">
          <p className="font-medium">No receipts yet</p>
          <p className="mt-1 text-sm text-faint">
            Upload a photo to get started.
          </p>
        </div>
      )}

      {receipts && receipts.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          {receipts.map((r) => (
            <li key={r.id}>
              <Link
                href={`/receipts/${r.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-moss-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(r.imagePath)}
                  alt=""
                  aria-hidden
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                  className="h-10 w-10 shrink-0 rounded-md border border-line object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.vendor}</span>
                    {r.needsReview && <ReviewBadge />}
                  </div>
                  <p className="text-xs text-faint">{r.date}</p>
                </div>
                <span className="tabular shrink-0 font-medium">
                  {formatMoney(r.total, r.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
