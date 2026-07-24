"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  uploadReceipt,
  formatMoney,
  ApiError,
  NotAReceiptError,
} from "@/lib/api";
import type { Receipt } from "@/lib/types";
import { ReviewBadge } from "@/components/ReviewBadge";
import { ReviewReasons } from "@/components/ReviewReasons";
import { LeaderRow } from "@/components/LeaderRow";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export default function CapturePage() {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  // A non-receipt isn't a failure, so it gets its own calmer presentation.
  const [rejected, setRejected] = useState<string | null>(null);
  const [result, setResult] = useState<Receipt | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Revoke the object URL when it's replaced or the page unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleFile(file: File) {
    setError(null);
    setRejected(null);
    setResult(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setStatus("loading");
    try {
      const receipt = await uploadReceipt(file);
      setResult(receipt);
      // Bring the result into view on small screens.
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80,
      );
    } catch (err) {
      if (err instanceof NotAReceiptError) setRejected(err.message);
      else setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-10">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="animate-rise text-center">
        <span className="badge-mute mb-4 inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Vision extraction
        </span>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Turn a photo into{" "}
          <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
            structured data
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-mid sm:text-base">
          Snap a receipt and Receiptly reads the vendor, date, currency, totals
          and every line item — then flags anything that needs your eyes.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Dropzone ───────────────────────────────────── */}
        <section className="lg:col-span-3">
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
            className={`group relative flex min-h-[19rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl2 border-2 border-dashed p-8 text-center transition-all duration-300 ${
              dragging
                ? "scale-[1.01] border-amber-400/70 bg-amber-500/[0.07] shadow-glow"
                : "border-edge bg-panel hover:border-edgehi hover:bg-panelhi"
            } ${status === "loading" ? "pointer-events-none" : ""}`}
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
              <div className="animate-fade w-full max-w-[15rem]">
                {/* The uploaded image with a scanning line passing over it. */}
                <div className="relative mx-auto mb-5 h-40 w-32 overflow-hidden rounded-lg border border-edge bg-black/40">
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt=""
                      className="h-full w-full object-cover opacity-60"
                    />
                  )}
                  <div className="absolute inset-x-0 top-0 h-14 animate-scanline bg-gradient-to-b from-transparent via-amber-400/40 to-transparent" />
                  <div className="absolute inset-0 ring-1 ring-inset ring-amber-400/30" />
                </div>
                <p className="text-sm font-medium">Reading your receipt…</p>
                <div className="mx-auto mt-4 space-y-2">
                  <div className="skeleton mx-auto h-2 w-4/5" />
                  <div className="skeleton mx-auto h-2 w-3/5" />
                  <div className="skeleton mx-auto h-2 w-2/3" />
                </div>
              </div>
            ) : (
              <>
                <span
                  className={`mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-edge bg-white/[0.04] transition-transform duration-500 ${
                    dragging ? "scale-110" : "group-hover:scale-105 animate-float"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 16V4m0 0L8 8m4-4 4 4" />
                    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                </span>
                <p className="text-base font-medium">
                  {dragging ? "Drop to scan" : "Drop a receipt photo"}
                </p>
                <p className="mt-1.5 text-sm text-mid">
                  or{" "}
                  <span className="text-amber-400 underline decoration-amber-400/40 underline-offset-4">
                    browse your files
                  </span>
                </p>
                <p className="mt-5 text-xs text-lo">
                  PNG · JPG · WebP · GIF — up to 10 MB
                </p>
              </>
            )}
          </label>
        </section>

        {/* ── How it works ───────────────────────────────── */}
        <aside className="panel panel-lit lg:col-span-2">
          <div className="p-6">
            <h2 className="text-sm font-semibold">How it works</h2>
            <ol className="mt-5 space-y-5">
              {[
                {
                  t: "Capture",
                  d: "Photograph the receipt or upload an existing image.",
                },
                {
                  t: "Extract",
                  d: "A vision model reads vendor, date, currency and line items.",
                },
                {
                  t: "Verify",
                  d: "Anything uncertain is flagged so you can correct it fast.",
                },
              ].map((step, i) => (
                <li key={step.t} className="flex gap-3.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-edge bg-white/[0.04] font-mono text-xs text-amber-400">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-mid">
                      {step.d}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-xl border border-edge bg-black/20 p-3.5">
              <p className="text-xs leading-relaxed text-lo">
                Totals are always kept per currency — Receiptly never adds
                different currencies together.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Hard error ─────────────────────────────────────── */}
      {error && (
        <div className="animate-rise rounded-xl2 border border-flag/25 bg-flagdim p-5">
          <p className="text-sm font-semibold text-flag">Upload failed</p>
          <p className="mt-1.5 text-sm text-mid">{error}</p>
        </div>
      )}

      {/* ── Not a receipt: nothing extracted, nothing stored ── */}
      {rejected && (
        <div className="animate-rise panel panel-lit overflow-hidden">
          <div className="flex flex-col items-center p-8 text-center sm:p-10">
            <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-edge bg-white/[0.04] text-mid">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M9 9l6 6M15 9l-6 6" />
              </svg>
            </span>
            <p className="text-base font-medium">Nothing was saved</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-mid">
              {rejected}
            </p>
            <p className="mt-3 text-xs text-lo">
              No amount was recorded. Try a photo of a receipt, invoice or bill.
            </p>
            <button
              onClick={() => {
                setRejected(null);
                setPreview(null);
              }}
              className="btn-ghost mt-6"
            >
              Try another image
            </button>
          </div>
        </div>
      )}

      {/* ── Result ─────────────────────────────────────────── */}
      {result && (
        <section ref={resultRef} className="animate-rise space-y-5">
          <div className="flex items-center gap-3">
            <span className="badge-ok">
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
              Extracted
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-edge to-transparent" />
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <div className="panel panel-lit lg:col-span-3">
              <div className="p-6 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold tracking-tight">
                      {result.vendor}
                    </h3>
                    <p className="mt-1 font-mono text-sm text-mid">
                      {result.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-2xl font-semibold">
                      {result.total.toLocaleString(undefined, {
                        minimumFractionDigits: result.currency === "RWF" ? 0 : 2,
                        maximumFractionDigits: result.currency === "RWF" ? 0 : 2,
                      })}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-mid">
                      {result.currency}
                    </p>
                  </div>
                </div>

                {result.needsReview && (
                  <div className="mt-4">
                    <ReviewBadge />
                  </div>
                )}

                <div className="my-6 h-px bg-edge" />

                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-lo">
                  Line items · {result.lineItems.length}
                </p>
                <div className="space-y-2.5">
                  {result.lineItems.map((item, i) => (
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
                      value={formatMoney(item.price, result.currency)}
                    />
                  ))}
                  {result.lineItems.length === 0 && (
                    <p className="text-sm text-lo">No line items detected.</p>
                  )}
                </div>

                <div className="my-5 h-px bg-edge" />
                <LeaderRow
                  bold
                  label="Total"
                  value={formatMoney(result.total, result.currency)}
                />

                {result.notes && (
                  <p className="mt-5 rounded-xl border border-edge bg-black/20 p-3.5 text-xs leading-relaxed text-mid">
                    <span className="font-medium text-hi">Note · </span>
                    {result.notes}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/receipts/${result.id}`} className="btn-primary">
                    {result.needsReview ? "Review & correct" : "Open receipt"}
                  </Link>
                  <button
                    onClick={() => {
                      setResult(null);
                      setPreview(null);
                    }}
                    className="btn-ghost"
                  >
                    Scan another
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5 lg:col-span-2">
              {result.needsReview && (
                <ReviewReasons reasons={result.reviewReasons} />
              )}
              {preview && (
                <div className="panel overflow-hidden">
                  <p className="px-4 pt-4 text-xs font-medium uppercase tracking-wider text-lo">
                    Original
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="The receipt you uploaded"
                    className="mt-3 max-h-72 w-full object-contain p-3"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
