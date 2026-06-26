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
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    categories: ["finance", "productivity", "business"],
    icons: [
      { src: "/icon?v=2", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon?v=2", sizes: "192x192", type: "image/png", purpose: "any" },
    ],
  };
}
