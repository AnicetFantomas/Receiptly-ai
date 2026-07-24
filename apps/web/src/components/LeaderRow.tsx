import type { ReactNode } from "react";

/**
 * Label on the left, value on the right, dotted leader between. Kept from the
 * receipt vocabulary because it genuinely helps the eye track across a long
 * item list to its price.
 */
export function LeaderRow({
  label,
  value,
  bold = false,
  muted = false,
}: {
  label: ReactNode;
  value: ReactNode;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`leader text-sm ${muted ? "text-mid" : "text-hi"}`}>
      <span className="min-w-0 break-words">{label}</span>
      <span aria-hidden className="leader-fill" />
      <span
        className={`tabular shrink-0 whitespace-nowrap ${
          bold ? "font-semibold" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
