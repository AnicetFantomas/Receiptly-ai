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

  // Group the vendor rows by currency so the page never places two currencies
  // in the same column — matches how the totals are kept separate server-side.
  const vendorsByCurrency = new Map<string, VendorTotal[]>();
  for (const v of summary?.byVendor ?? []) {
    const list = vendorsByCurrency.get(v.currency) ?? [];
    list.push(v);
    vendorsByCurrency.set(v.currency, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Summary</h1>
        <p className="mt-1 text-sm text-faint">
          Totals are kept per currency — different currencies are never added
          together.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!summary && !error && <p className="text-sm text-faint">Loading…</p>}

      {summary && (
        <>
          {summary.needsReviewCount > 0 && (
            <Link
              href="/receipts"
              className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 transition-colors hover:bg-amber-100"
            >
              <span>
                {summary.needsReviewCount} receipt
                {summary.needsReviewCount === 1 ? "" : "s"} need review
              </span>
              <span aria-hidden>→</span>
            </Link>
          )}

          {/* Totals by currency */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">
              Totals by currency
            </h2>
            {summary.byCurrency.length === 0 ? (
              <p className="text-sm text-faint">No receipts yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {summary.byCurrency.map((c) => (
                  <div
                    key={c.currency}
                    className="rounded-xl border border-line bg-card p-4"
                  >
                    <p className="text-xs text-faint">{c.currency}</p>
                    <p className="tabular mt-1 text-2xl font-semibold">
                      {formatMoney(c.total, c.currency)}
                    </p>
                    <p className="mt-1 text-xs text-faint">
                      {c.count} receipt{c.count === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* By vendor, grouped under each currency */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">
              By vendor
            </h2>
            {vendorsByCurrency.size === 0 ? (
              <p className="text-sm text-faint">No receipts yet.</p>
            ) : (
              <div className="space-y-5">
                {[...vendorsByCurrency.entries()].map(([currency, vendors]) => (
                  <div key={currency}>
                    <p className="mb-1 text-xs font-medium text-faint">{currency}</p>
                    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                      {vendors.map((v) => (
                        <li
                          key={`${v.vendor}-${v.currency}`}
                          className="flex items-center justify-between px-4 py-2.5 text-sm"
                        >
                          <span className="truncate">
                            {v.vendor}{" "}
                            <span className="text-faint">
                              ({v.count}×)
                            </span>
                          </span>
                          <span className="tabular font-medium">
                            {formatMoney(v.total, v.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
