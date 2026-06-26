import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Branded neon "SA" app icon — favicon + PWA/maskable source.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #e6c66e 0%, #d4af37 52%, #b8902a 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.18), transparent 60%)",
            fontSize: 300,
            fontWeight: 900,
            color: "#1a1305",
            letterSpacing: "-12px",
          }}
        >
          SA
        </div>
      </div>
    ),
    { ...size }
  );
}
