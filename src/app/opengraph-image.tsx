import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SINUMERIK ONE Configurator — catalog-driven CNC configuration";

// NOTE: Satori doesn't parse oklch() — every color in this ImageResponse
// is a hex equivalent of the matching token in globals.css. Keep rough
// parity if you change a --background / --primary / --foreground value.

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          // oklch(0.14 0.006 220) — graphite body
          background: "#070a0b",
          // oklch(0.96 0.004 95) — paper cream
          color: "#f2f2ef",
          padding: 64,
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Blueprint grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right,  rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Top row: mark + dateline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                // oklch(0.76 0.13 195) → oklch(0.42 0.11 195)
                background: "linear-gradient(145deg, #00cacb, #005e60)",
                color: "#040607", // oklch(0.12 0.006 220)
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "-0.04em",
              }}
            >
              S
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 18, opacity: 0.6, letterSpacing: 2, textTransform: "uppercase" }}>
                Configurator
              </span>
              <span style={{ fontSize: 28, fontWeight: 600 }}>SINUMERIK ONE</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              fontSize: 14,
              opacity: 0.6,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            <span>NC63 · D21 · D31 · 2026</span>
            <span>Verified MLFB article numbers</span>
          </div>
        </div>

        {/* Centered title */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 960,
            gap: 24,
          }}
        >
          <div style={{ fontSize: 76, fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            Describe your machine.
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#00e0e0", // oklch(0.82 0.14 195) — highlight petrol
            }}
          >
            Get a verified bill of materials.
          </div>
        </div>

        {/* Bottom MLFB sample — monospace article numbers */}
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 18,
            fontFamily: "ui-monospace, 'Courier New', monospace",
            opacity: 0.7,
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ padding: "6px 12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 }}>
            6FC5317-4AA00-0AA0
          </span>
          <span style={{ padding: "6px 12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 }}>
            6SL3130-7TE25-5AA3
          </span>
          <span style={{ padding: "6px 12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 }}>
            1FT7084-1AF71
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
