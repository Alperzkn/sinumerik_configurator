import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon — larger version of the app mark. */
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
          background:
            "linear-gradient(145deg, oklch(0.76 0.13 195) 0%, oklch(0.42 0.11 195) 100%)",
          color: "oklch(0.10 0.006 220)",
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
