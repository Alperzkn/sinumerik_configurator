"use client";

import JsonViewLib from "@uiw/react-json-view";

const theme: React.CSSProperties = {
  // Map the library's CSS vars to the admin's existing palette so the
  // viewer blends with the surrounding card instead of stamping its own
  // dark grey background.
  "--w-rjv-font-family":
    "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
  "--w-rjv-font-size": "13px",
  "--w-rjv-line-height": "1.55",
  "--w-rjv-color": "var(--foreground)",
  "--w-rjv-key-string": "var(--foreground)",
  "--w-rjv-key-number": "var(--foreground)",
  "--w-rjv-background-color": "transparent",
  "--w-rjv-line-color": "color-mix(in oklch, var(--border), transparent 50%)",
  "--w-rjv-arrow-color": "var(--muted-foreground)",
  "--w-rjv-info-color": "var(--muted-foreground)",
  "--w-rjv-update-color": "oklch(0.85 0.13 90)",
  "--w-rjv-copied-color": "var(--primary)",
  "--w-rjv-copied-success-color": "oklch(0.78 0.16 150)",
  "--w-rjv-curlybraces-color": "var(--muted-foreground)",
  "--w-rjv-brackets-color": "var(--muted-foreground)",
  "--w-rjv-colon-color": "var(--muted-foreground)",
  "--w-rjv-quotes-color": "var(--muted-foreground)",
  "--w-rjv-quotes-string-color": "oklch(0.82 0.12 50)",
  "--w-rjv-type-string-color": "oklch(0.82 0.12 50)",
  "--w-rjv-type-int-color": "oklch(0.78 0.13 240)",
  "--w-rjv-type-float-color": "oklch(0.82 0.14 140)",
  "--w-rjv-type-bigint-color": "oklch(0.78 0.13 240)",
  "--w-rjv-type-boolean-color": "oklch(0.78 0.14 195)",
  "--w-rjv-type-date-color": "var(--muted-foreground)",
  "--w-rjv-type-url-color": "oklch(0.78 0.13 240)",
  "--w-rjv-type-null-color": "oklch(0.78 0.16 340)",
  "--w-rjv-type-nan-color": "oklch(0.78 0.16 340)",
  "--w-rjv-type-undefined-color": "var(--muted-foreground)",
} as React.CSSProperties;

export function JsonView({
  value,
  collapsed,
}: {
  value: unknown;
  /** When true, collapse all nodes by default. A number collapses below that depth. */
  collapsed?: boolean | number;
}) {
  // The library expects an object root. Wrap primitives so they still render
  // (rare for our traces, but keeps the component robust).
  const data =
    value !== null && typeof value === "object"
      ? (value as object)
      : { value };

  return (
    <JsonViewLib
      value={data}
      style={theme}
      displayDataTypes={false}
      displayObjectSize
      enableClipboard
      collapsed={collapsed ?? 2}
      shortenTextAfterLength={140}
      indentWidth={18}
    />
  );
}
