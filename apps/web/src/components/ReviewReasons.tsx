// Explains WHY a receipt is flagged — the heart of the review flow. The list
// comes straight from the API (review.ts), so UI and server rules never drift.
export function ReviewReasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-700">
        This receipt needs a look
      </p>
      <ul className="mt-2 space-y-1">
        {reasons.map((reason, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink">
            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
            {reason}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-amber-700/80">
        Correct the fields below and save to clear the flag.
      </p>
    </div>
  );
}
