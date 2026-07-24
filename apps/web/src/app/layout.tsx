import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Receiptly",
  description:
    "Photograph a receipt, extract structured data, and track spending.",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-faint transition-colors hover:bg-moss-50 hover:text-ink"
    >
      {label}
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <header className="border-b border-line bg-card/80 backdrop-blur">
          <div className="mx-auto flex max-w-ledger items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="font-mono text-lg font-semibold tracking-tight text-ink"
            >
              Receiptly
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink href="/" label="Upload" />
              <NavLink href="/receipts" label="Receipts" />
              <NavLink href="/summary" label="Summary" />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-ledger px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
