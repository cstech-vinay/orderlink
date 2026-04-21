import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "OrderLink — A tight edit of everyday things, made well. Curated lifestyle store from Pune.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(family: string, weight: number, italic: boolean) {
  const axis = italic ? "ital,wght@1," : "wght@";
  const url = `https://fonts.googleapis.com/css2?family=${family}:${axis}${weight}&display=swap`;
  try {
    const cssRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    const css = await cssRes.text();
    const fontUrl = css.match(/src: url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    if (!fontUrl) return null;
    const fontRes = await fetch(fontUrl);
    return fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function Image() {
  const [fraunces, frauncesItalic, mono] = await Promise.all([
    loadFont("Fraunces", 600, false),
    loadFont("Fraunces", 600, true),
    loadFont("JetBrains+Mono", 500, false),
  ]);

  const fonts = [
    fraunces && { name: "Fraunces", data: fraunces, weight: 600 as const, style: "normal" as const },
    frauncesItalic && { name: "Fraunces", data: frauncesItalic, weight: 600 as const, style: "italic" as const },
    mono && { name: "JetBrainsMono", data: mono, weight: 500 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 600 | 500; style: "normal" | "italic" }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#FBF7F1",
          padding: "72px 80px",
          fontFamily: "Fraunces, serif",
          position: "relative",
        }}
      >
        {/* Top strip: handle pill */}
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#1E1C1C",
              color: "#FBF7F1",
              padding: "10px 22px",
              borderRadius: 9999,
              fontFamily: "JetBrainsMono, monospace",
              fontSize: 22,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            @ORDERLINK.IN
          </div>
        </div>

        {/* Center: headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            color: "#1E1C1C",
          }}
        >
          <div style={{ fontSize: 74, lineHeight: 1.08, display: "flex" }}>
            A tight edit of
          </div>
          <div
            style={{
              fontSize: 104,
              lineHeight: 1.02,
              fontStyle: "italic",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                borderBottom: "5px solid #EC4356",
                paddingBottom: 4,
              }}
            >
              everyday things,
            </span>
          </div>
          <div
            style={{
              fontSize: 104,
              lineHeight: 1.02,
              display: "flex",
              alignItems: "center",
            }}
          >
            made&nbsp;
            <span
              style={{
                fontStyle: "italic",
                borderBottom: "5px solid #EC4356",
                paddingBottom: 4,
              }}
            >
              well.
            </span>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "JetBrainsMono, monospace",
          }}
        >
          <div
            style={{
              color: "#5A5350",
              fontFamily: "Fraunces, serif",
              fontStyle: "italic",
              fontSize: 28,
            }}
          >
            — curated in India, shipped across India
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "#1E1C1C",
              fontSize: 20,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span>ORDERLINK.IN</span>
            <span style={{ color: "#EC4356", fontSize: 22 }}>⁂</span>
            <span>MADE IN INDIA</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  );
}
