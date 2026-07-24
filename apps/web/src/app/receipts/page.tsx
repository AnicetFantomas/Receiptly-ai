"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listReceipts, imageUrl, ApiError } from "@/lib/api";
import type { Receipt } from "@/lib/types";
import { ReviewBadge } from "@/components/ReviewBadge";

type Filter = "all" | "flagged";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    listReceipts()
      .then(setReceipts)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Something went wrong."),
      );
  }, []);

  const flaggedCount = receipts?.filter((r) => r.needsReview).length ?? 0;

  const visible = useMemo(() => {
    if (!receipts) return [];
    const q = query.trim().toLowerCase();
    return receipts.filter((r) => {
      if (filter === "flagged" && !r.needsReview) return false;
      if (q && !r.vendor.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [receipts, filter, query]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Receipts
          </h1>
          <p className="mt-1.5 text-sm text-mid">
            {receipts
              ? `${receipts.length} captured${flaggedCount ? ` · ${flaggedCount} need review` : ""}`
              : "Loading your records"}
          </p>
        </div>
        <Link href="/" className="btn-primary">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New receipt
        </Link>
      </div>

      {/* Controls */}
      {receipts && receipts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-edge bg-panel p-1">
            {(["all", "flagged"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3.5 py-1.5 text-sm capitalize transition-all duration-200 ${
                  filter === f
                    ? "bg-white/[0.08] text-hi"
                    : "text-mid hover:text-hi"
                }`}
              >
                {f === "flagged" ? `Needs review${flaggedCount ? ` (${flaggedCount})` : ""}` : "All"}
              </button>
            ))}
          </div>
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lo"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              className="input pl-9"
              placeholder="Search vendor…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search by vendor"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl2 border border-flag/25 bg-flagdim p-5">
          <p className="text-sm font-semibold text-flag">Couldn&apos;t load receipts</p>
          <p className="mt-1.5 text-sm text-mid">{error}</p>
        </div>
      )}

      {/* Loading skeletons */}
      {!receipts && !error && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="panel flex items-center gap-4 p-4">
              <div className="skeleton h-14 w-14 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2.5">
                <div className="skeleton h-3.5 w-1/3" />
                <div className="skeleton h-3 w-1/4" />
              </div>
              <div className="skeleton h-6 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {receipts?.length === 0 && (
        <div className="panel panel-lit animate-rise p-12 text-center sm:p-16">
          <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-edge bg-white/[0.04]">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-amber-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 3v18l2.5-1.6L10 21l2-1.6L14 21l2.5-1.6L19 21V3z" />
              <path d="M9 8h6M9 12h6" />
            </svg>
          </span>
          <p className="text-lg font-medium">No receipts yet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-mid">
            Capture your first receipt and it will appear here.
          </p>
          <Link href="/" className="btn-primary mt-6">
            Capture a receipt
          </Link>
        </div>
      )}

      {/* No search matches */}
      {receipts && receipts.length > 0 && visible.length === 0 && (
        <div className="panel p-10 text-center">
          <p className="text-sm font-medium">Nothing matches</p>
          <p className="mt-1.5 text-sm text-mid">
            Try a different search or filter.
          </p>
        </div>
      )}

      {/* List */}
      {visible.length > 0 && (
        <div className="stagger space-y-3">
          {visible.map((r) => (
            <Link
              key={r.id}
              href={`/receipts/${r.id}`}
              className={`panel panel-hover group flex items-center gap-4 p-4 ${
                r.needsReview ? "border-flag/25" : ""
              }`}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-edge bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(r.imagePath)}
                  alt=""
                  aria-hidden
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{r.vendor}</span>
                  {r.needsReview && <ReviewBadge />}
                </div>
                <p className="mt-1 font-mono text-xs text-mid">
                  {r.date}
                  <span className="text-lo">
                    {" · "}
                    {r.lineItems.length} item{r.lineItems.length === 1 ? "" : "s"}
                  </span>
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="tabular font-semibold">
                  {r.total.toLocaleString(undefined, {
                    minimumFractionDigits: r.currency === "RWF" ? 0 : 2,
                    maximumFractionDigits: r.currency === "RWF" ? 0 : 2,
                  })}
                </p>
                <p className="font-mono text-xs text-mid">{r.currency}</p>
              </div>

              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-lo transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-hi"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
