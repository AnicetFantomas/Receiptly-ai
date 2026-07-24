"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSummary, formatMoney, ApiError } from "@/lib/api";
import type { Summary, VendorTotal } from "@/lib/types";

export default function SummaryPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Something went wrong."),
      );
  }, []);

  // Group vendor rows by currency so the page never puts two currencies in the
  // same comparison — mirrors how totals are kept separate server-side.
  const vendorsByCurrency = new Map<string, VendorTotal[]>();
  for (const v of summary?.byVendor ?? []) {
    const list = vendorsByCurrency.get(v.currency) ?? [];
    list.push(v);
    vendorsByCurrency.set(v.currency, list);
  }

  const empty = summary && summary.byCurrency.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Spending
        </h1>
        <p className="mt-1.5 text-sm text-mid">
          Totals are tracked per currency and never added together.
        </p>
      </div>

      {error && (
        <div className="rounded-xl2 border border-flag/25 bg-flagdim p-5">
          <p className="text-sm font-semibold text-flag">
            Couldn&apos;t load spending
          </p>
          <p className="mt-1.5 text-sm text-mid">{error}</p>
        </div>
      )}

      {!summary && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="panel space-y-3 p-6">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-8 w-32" />
              <div className="skeleton h-2.5 w-20" />
            </div>
          ))}
        </div>
      )}

      {empty && (
        <div className="panel panel-lit p-12 text-center sm:p-16">
          <p className="text-lg font-medium">Nothing to total yet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-mid">
            Capture a receipt and your spending appears here.
          </p>
          <Link href="/" className="btn-primary mt-6">
            Capture a receipt
          </Link>
        </div>
      )}

      {summary && !empty && (
        <>
          {summary.needsReviewCount > 0 && (
            <Link
              href="/receipts"
              className="group flex items-center justify-between gap-4 rounded-xl2 border border-flag/25 bg-flagdim p-4 transition-all duration-300 hover:border-flag/40 sm:p-5"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-flag" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-flag" />
                </span>
                <p className="text-sm">
                  <span className="font-semibold text-hi">
                    {summary.needsReviewCount} receipt
                    {summary.needsReviewCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-mid"> need review</span>
                </p>
              </div>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-flag transition-transform duration-300 group-hover:translate-x-0.5"
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
          )}

          {/* ── Currency totals ─────────────────────────────── */}
          <section>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-lo">
              By currency
            </h2>
            <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {summary.byCurrency.map((c) => (
                <div key={c.currency} className="panel panel-lit panel-hover p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tracking-wider text-amber-600">
                      {c.currency}
                    </span>
                    <span className="badge-mute">
                      {c.count} receipt{c.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="tabular mt-4 animate-countUp text-3xl font-semibold tracking-tight">
                    {c.total.toLocaleString(undefined, {
                      minimumFractionDigits: c.currency === "RWF" ? 0 : 2,
                      maximumFractionDigits: c.currency === "RWF" ? 0 : 2,
                    })}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Vendor breakdown, grouped per currency ──────── */}
          <section>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-lo">
              By vendor
            </h2>
            <div className="space-y-6">
              {[...vendorsByCurrency.entries()].map(([currency, vendors]) => {
                // Bar widths are relative to the biggest vendor *within this
                // currency* — never across currencies.
                const max = Math.max(...vendors.map((v) => v.total), 1);
                return (
                  <div key={currency} className="panel panel-lit p-6">
                    <div className="mb-5 flex items-center gap-2">
                      <span className="font-mono text-xs tracking-wider text-amber-600">
                        {currency}
                      </span>
                      <div className="h-px flex-1 bg-edge" />
                    </div>
                    <div className="space-y-4">
                      {vendors.map((v) => (
                        <div key={`${v.vendor}-${v.currency}`}>
                          <div className="mb-2 flex items-baseline justify-between gap-3">
                            <span className="truncate text-sm">
                              {v.vendor}
                              <span className="ml-1.5 text-xs text-lo">
                                ({v.count}×)
                              </span>
                            </span>
                            <span className="tabular shrink-0 text-sm font-medium">
                              {formatMoney(v.total, v.currency)}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-base2">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-[width] duration-700 ease-out"
                              style={{ width: `${(v.total / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
