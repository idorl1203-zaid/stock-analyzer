import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Full-bleed branded icon for iOS "Add to Home Screen".
export default function AppleIcon() {
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
          fontSize: 104,
          fontWeight: 900,
          color: "#1a1305",
          letterSpacing: "-4px",
        }}
      >
        SA
      </div>
    ),
    { ...size }
  );
}
