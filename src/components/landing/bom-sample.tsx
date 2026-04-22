"use client";

/**
 * Live-looking sample Bill of Materials used on the landing page.
 * The product IS this table — render a realistic slice so visitors see
 * exactly what they're going to get instead of generic "feature cards".
 *
 * Data is intentionally hard-coded (fast load, no store, no SSR cost)
 * and mirrors the kind of output that comes out of /configure for a
 * 3-axis mill on NCU 1740.
 */

interface SampleRow {
  mlfb: string;
  qty: number;
  name: string;
  category:
    | "Control Unit"
    | "CNC Software"
    | "Tech Package"
    | "Drive"
    | "Motor"
    | "HMI"
    | "Cable";
  orderCode?: string;
}

const SAMPLE: SampleRow[] = [
  {
    mlfb: "6FC5317-4AA00-0AA0",
    qty: 1,
    name: "NCU 1740",
    category: "Control Unit",
  },
  {
    mlfb: "6FC5852-1YG25-1YA0",
    qty: 1,
    name: "CNC SW 31-3 export V6.25 SP1 (SD card)",
    category: "CNC Software",
  },
  {
    mlfb: "6FC5800-0BS42-0YB0",
    qty: 1,
    name: "Dynamics 3-Axis Milling package",
    category: "Tech Package",
    orderCode: "S42",
  },
  {
    mlfb: "6SL3120-1TE22-4AD0",
    qty: 3,
    name: "Motor Module booksize 24 A",
    category: "Drive",
  },
  {
    mlfb: "6SL3120-1TE28-5AA3",
    qty: 1,
    name: "Motor Module booksize 85 A (spindle)",
    category: "Drive",
  },
  {
    mlfb: "6SL3130-6TE23-6AA3",
    qty: 1,
    name: "Smart Line Module booksize 36 kW",
    category: "Drive",
  },
  {
    mlfb: "1FT7086-5AF71-1AA2",
    qty: 3,
    name: "SIMOTICS S-1FT7 servo motor, SH80",
    category: "Motor",
  },
  {
    mlfb: "1PH8137-1FG20",
    qty: 1,
    name: "SIMOTICS M-1PH8 spindle 15 kW, 1500 rpm",
    category: "Motor",
  },
  {
    mlfb: "6AV6646-1BA15-0NA1",
    qty: 1,
    name: 'ITC1500 V3 15" Thin Client',
    category: "HMI",
  },
  {
    mlfb: "6FC5303-0AF22-1AA0",
    qty: 1,
    name: 'MCP 15" Machine Control Panel',
    category: "HMI",
  },
  {
    mlfb: "6FX8002-5CA15-1BA0",
    qty: 4,
    name: "Motion-Connect 800PLUS 4×1.5 mm², 10 m",
    category: "Cable",
  },
];

const CATEGORY_ORDER: SampleRow["category"][] = [
  "Control Unit",
  "CNC Software",
  "Tech Package",
  "Drive",
  "Motor",
  "HMI",
  "Cable",
];

const CATEGORY_HUE: Record<SampleRow["category"], string> = {
  "Control Unit": "oklch(from var(--primary) l c h)",
  "CNC Software": "oklch(0.72 0.13 260)",
  "Tech Package": "oklch(0.72 0.16 90)",
  Drive: "oklch(0.72 0.13 145)",
  Motor: "oklch(0.76 0.16 28)",
  HMI: "oklch(0.72 0.12 300)",
  Cable: "oklch(0.70 0.03 220)",
};

export function LandingBomSample() {
  // Sort by category in the canonical BOM order
  const rows = [...SAMPLE].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  );

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      {/* Header strip — looks like a document header, not a pill */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
          <span>Pos · MLFB · Qty · Description</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span>
            <span className="text-foreground tabular-nums">{rows.length}</span> items
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            <span className="text-foreground tabular-nums">{totalQty}</span> qty
          </span>
        </div>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.mlfb + i}
              className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors"
            >
              <td className="py-2 px-4 w-8 text-[10px] font-mono text-muted-foreground/70 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </td>
              <td className="py-2 px-3 whitespace-nowrap">
                <code className="mlfb text-[12px] text-foreground">
                  {row.mlfb}
                </code>
              </td>
              <td className="py-2 px-3 text-center w-12 font-mono tabular-nums text-[12px] text-muted-foreground">
                ×{row.qty}
              </td>
              <td className="py-2 px-3 text-[13px]">
                <span>{row.name}</span>
                {row.orderCode && (
                  <span className="ml-2 text-[10px] font-mono uppercase text-muted-foreground">
                    {row.orderCode}
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 pl-2 text-right whitespace-nowrap">
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground"
                  title={row.category}
                >
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: CATEGORY_HUE[row.category] }}
                  />
                  {row.category}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tick-marked footer — dimensional drawing vibe */}
      <div className="px-4 py-2 border-t bg-muted/10 flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
        <span>→ Truncated sample. Full output includes safety, measuring systems, accessories.</span>
        <span className="text-muted-foreground/50 hidden sm:inline">
          scale 1:1
        </span>
      </div>
    </div>
  );
}
