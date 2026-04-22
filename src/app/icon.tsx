import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * Runtime-generated favicon matching the app's logo chip — a rounded
 * square with the "S" glyph. Uses the IBM Plex Sans heritage vibe in a
 * system grotesque fallback (ImageResponse can't pull Google Fonts
 * without an extra fetch, so we keep it simple and sharp).
 */
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
          background:
            "linear-gradient(145deg, oklch(0.76 0.13 195) 0%, oklch(0.54 0.12 195) 100%)",
          color: "oklch(0.12 0.006 220)",
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          borderRadius: 14,
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}
