import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Owner Hub — Cross-business overview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #581c87 0%, #a855f7 50%, #ec4899 100%)",
          color: "white",
          padding: "70px 80px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "9999px",
            background: "rgba(236, 72, 153, 0.22)",
            filter: "blur(80px)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "auto" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #c084fc 0%, #ec4899 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 36,
              color: "white",
              border: "3px solid white",
            }}
          >
            ◇
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
              Owner Hub
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#f5d0fe",
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Cross-business control
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: -2.5,
              lineHeight: 1.05,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Two businesses.</span>
            <span style={{ color: "#fce7f3" }}>One view.</span>
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#fae8ff",
              maxWidth: 900,
              lineHeight: 1.4,
              display: "flex",
            }}
          >
            AVS Invest + Vertex Hygiene side-by-side. Sign in once. Jump in anywhere.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
