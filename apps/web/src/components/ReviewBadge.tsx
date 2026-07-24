// Marks a receipt needing human review. A live pulse ring draws the eye
// without resorting to a loud colour block.
export function ReviewBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`badge-flag ${className}`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-flag" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-flag" />
      </span>
      Needs review
    </span>
  );
}
