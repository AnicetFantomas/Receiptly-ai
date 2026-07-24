// Explains WHY a receipt is flagged. The list comes straight from the API
// (review.ts), so UI and server rules never drift.
export function ReviewReasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;

  return (
    <div className="animate-rise overflow-hidden rounded-xl2 border border-flag/25 bg-flagdim shadow-flag">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-flag/15 text-flag">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-hi">
            This receipt needs a look
          </p>
          <ul className="mt-2 space-y-1.5">
            {reasons.map((reason, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-mid">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-flag/70" />
                {reason}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-lo">
            Correct the fields below and save — the flag clears automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
