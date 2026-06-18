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
          background: "linear-gradient(135deg, #ff2e97 0%, #b14eff 52%, #00f0ff 100%)",
          fontSize: 104,
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-4px",
        }}
      >
        SA
      </div>
    ),
    { ...size }
  );
}
