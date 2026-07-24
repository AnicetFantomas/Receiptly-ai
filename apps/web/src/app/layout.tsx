import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Receiptly — Receipt capture & spend tracking",
  description:
    "Photograph a receipt, extract structured data, and track spending.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        {/* Fixed ambient field behind everything. */}
        <div className="bg-ambient" aria-hidden />

        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
            {children}
          </main>
          <footer className="border-t border-edge/60 py-6">
            <p className="mx-auto max-w-6xl px-4 text-xs text-lo sm:px-6">
              Receiptly · vision extraction with human review
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
