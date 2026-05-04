import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 64, background: "#0E1430", color: "#fff",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "#0E1430", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#FF5A3C", fontSize: 28,
          }}>OL</div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>
            OrderLink<span style={{ color: "#FF5A3C" }}>.</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
            Things worth
          </div>
          <div style={{ fontSize: 88, fontWeight: 500, fontStyle: "italic", color: "#FF5A3C", letterSpacing: -2, lineHeight: 1.05 }}>
            actually clicking on.
          </div>
        </div>
        <div style={{ fontSize: 22, opacity: 0.7 }}>
          Curated finds, straight to the best price.
        </div>
      </div>
    ),
    size,
  );
}
