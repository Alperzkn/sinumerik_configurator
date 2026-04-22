import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * Runtime-generated favicon matching the app's logo chip — a rounded
 * square with the "S" glyph.
 *
 * NOTE on colors: Satori (the engine behind ImageResponse) doesn't parse
 * oklch() yet, so the gradient and text colors here are hex equivalents
 * of the app's --primary / --primary-foreground tokens (see globals.css).
 * Keep these in sync if you change the token values.
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
          // oklch(0.76 0.13 195) → oklch(0.54 0.12 195)
          background: "linear-gradient(145deg, #00cacb 0%, #008384 100%)",
          color: "#040607", // oklch(0.12 0.006 220)
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
