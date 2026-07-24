"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Capture" },
  { href: "/receipts", label: "Receipts" },
  { href: "/summary", label: "Spending" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-edge/70 bg-base/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          {/* Mark: a stylised receipt with a soft glow. */}
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_6px_18px_-6px_rgba(245,158,11,0.8)] transition-transform duration-300 group-hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="#221603"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 3v18l2.5-1.6L10 21l2-1.6L14 21l2.5-1.6L19 21V3z" />
              <path d="M9 8h6M9 12h6" />
            </svg>
          </span>
          <span className="text-[0.95rem] font-semibold tracking-tight">
            Receiptly
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-lg px-3 py-2 text-sm transition-colors duration-200 sm:px-4 ${
                  active ? "text-hi" : "text-mid hover:text-hi"
                }`}
              >
                {active && (
                  <span className="absolute inset-0 rounded-lg border border-edge bg-white/[0.06]" />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
