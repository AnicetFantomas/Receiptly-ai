"use client";

import { useState } from "react";

/**
 * The original photograph attached to a record. Click to open full size.
 *
 * A plain <img> (not next/image) — the source is a same-origin API file, so
 * next/image's remote-host config and optimizer earn nothing here.
 */
export function ReceiptImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-lo">
          Original
        </p>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-mid transition-colors hover:text-amber-600"
        >
          Full size ↗
        </a>
      </div>
      <a href={src} target="_blank" rel="noreferrer" className="group mt-3 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className="max-h-80 w-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </a>
    </div>
  );
}
