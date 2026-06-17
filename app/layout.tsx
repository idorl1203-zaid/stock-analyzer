import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockAI Analyzer — AI-Powered Stock Analysis",
  description: "Upload stock charts and get AI-powered technical analysis, news insights, and trading recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
