// A small amber pill marking a receipt that needs human review.
export function ReviewBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 ${className}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Needs review
    </span>
  );
}
