import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Jewel ERP", template: "%s · Jewel ERP" },
  description: "Jewellery wholesale accounting — stock, billing, fine-gold and money ledgers in one simple place.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: "var(--font-inter)", fontSize: 14, border: "1px solid var(--border)", boxShadow: "none" } }} />
      </body>
    </html>
  );
}
