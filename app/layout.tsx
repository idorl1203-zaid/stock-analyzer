import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
};

// Neon dark appearance for all Clerk UI. Cast because this @clerk/types
// version's strict Appearance type lags behind the runtime `baseTheme` API.
const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#d4af37",
    colorPrimaryForeground: "#1a1305", // dark text on the gold button
    colorBackground: "#0d0c10",
    colorForeground: "#f5f0e6",        // headings + body text
    colorMutedForeground: "#b8ad97",   // secondary/help text
    colorNeutral: "#f5f0e6",
    colorInput: "#0e0c12",             // dark input background
    colorInputForeground: "#f5f0e6",   // input text
    colorBorder: "#2c2720",
    colorShadow: "rgba(212,175,55,0.25)",
    borderRadius: "6px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

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
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/app"
      signUpFallbackRedirectUrl="/app"
      afterSignOutUrl="/"
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
