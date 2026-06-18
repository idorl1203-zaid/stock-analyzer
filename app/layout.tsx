import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://stock-analyzer-idorl1203-2081s-projects.vercel.app"),
  title: "StockAI — AI-Powered Stock Analysis Terminal",
  description: "Upload a stock chart and get AI-powered technical analysis, live market data, news insights, and trading recommendations — in a neon command-center terminal.",
  applicationName: "StockAI Terminal",
  keywords: ["stock analysis", "AI trading", "technical analysis", "stock charts", "market data", "trading terminal"],
  openGraph: {
    title: "StockAI — AI-Powered Stock Analysis Terminal",
    description: "Upload a chart, get instant AI technical analysis with live market data and news. A neon trading command center.",
    type: "website",
    siteName: "StockAI Terminal",
  },
  twitter: {
    card: "summary_large_image",
    title: "StockAI — AI-Powered Stock Analysis Terminal",
    description: "Upload a chart, get instant AI technical analysis with live market data and news.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
