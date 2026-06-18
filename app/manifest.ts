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
      { src: "/favicon.ico", sizes: "256x256", type: "image/x-icon", purpose: "any" },
    ],
  };
}
