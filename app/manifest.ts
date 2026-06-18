import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StockAI — AI Stock Analysis Terminal",
    short_name: "StockAI",
    description:
      "Upload a stock chart and get AI-powered technical analysis with live market data and news — a neon trading command center.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#06030f",
    theme_color: "#06030f",
    categories: ["finance", "productivity", "business"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" },
    ],
  };
}
