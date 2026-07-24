"use client";

import { useState } from "react";

// The photo the receipt was extracted from. Click to view full size in a new
// tab. A plain <img> (not next/image) — the source is a same-origin API file,
// so next/image's remote-host config and optimizer earn nothing here.
//
// If the file is missing on disk (e.g. uploads/ was cleared), we hide the frame
// rather than showing a broken-image icon.
export function ReceiptImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-xl border border-line bg-card"
      title="Open full size"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className="max-h-80 w-full object-contain"
      />
    </a>
  );
}
