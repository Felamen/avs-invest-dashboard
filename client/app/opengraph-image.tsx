import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AVS Invest — Property portfolio dashboard";
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
            "linear-gradient(135deg, #064e3b 0%, #047857 50%, #065f46 100%)",
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
            background: "rgba(16, 185, 129, 0.22)",
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
              background: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 40,
              color: "white",
              border: "3px solid white",
            }}
          >
            A
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
              AVS Invest
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#a7f3d0",
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Property dashboard · Live Notion
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
            <span>Your portfolio.</span>
            <span style={{ color: "#86efac" }}>Live, mapped, sourced.</span>
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#d1fae5",
              maxWidth: 900,
              lineHeight: 1.4,
              display: "flex",
            }}
          >
            Managed properties, sourcing pipeline, compliance tracking — all in one place.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
