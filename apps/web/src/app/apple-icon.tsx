import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple touch icon — larger version of the app mark.
 *
 * NOTE on colors: Satori doesn't parse oklch(). Keep these hex values
 * roughly in sync with the --primary token in globals.css.
 */
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
          // oklch(0.76 0.13 195) → oklch(0.42 0.11 195) — deeper at the bottom
          background: "linear-gradient(145deg, #00cacb 0%, #005e60 100%)",
          color: "#020404", // oklch(0.10 0.006 220)
          fontSize: 108,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          borderRadius: 40,
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}
