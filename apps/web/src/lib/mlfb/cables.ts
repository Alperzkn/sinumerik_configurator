/**
 * MOTION-CONNECT cable MLFB suffix (length code) lookup.
 *
 * Cable MLFBs follow the form `<base>-<length-code>` where the
 * length-code suffix is a 4-character segment that encodes the cable's
 * cut length. Per Siemens D21.4 (MOTION-CONNECT 800PLUS, 500, 400):
 *
 *   1m  → 1AB0     7m  → 1AH0     30m → 1DA0
 *   2m  → 1AC0    10m  → 1BA0     40m → 1EA0
 *   3m  → 1AD0    15m  → 1BC0     50m → 1FA0
 *   5m  → 1AF0    20m  → 1CA0    100m → 1HA0
 *
 * Custom lengths beyond the stocked catalogue use sold-by-the-meter
 * variants (different base MLFB) — out of scope for the configurator;
 * we round UP to the next stocked length.
 */
const LENGTH_CODES: Array<{ meters: number; code: string }> = [
  { meters: 1, code: "1AB0" },
  { meters: 2, code: "1AC0" },
  { meters: 3, code: "1AD0" },
  { meters: 5, code: "1AF0" },
  { meters: 7, code: "1AH0" },
  { meters: 10, code: "1BA0" },
  { meters: 15, code: "1BC0" },
  { meters: 20, code: "1CA0" },
  { meters: 25, code: "1CC0" },
  { meters: 30, code: "1DA0" },
  { meters: 40, code: "1EA0" },
  { meters: 50, code: "1FA0" },
  { meters: 75, code: "1GA0" },
  { meters: 100, code: "1HA0" },
];

/**
 * Returns the catalogue length code for a cable cut to `meters`.
 * Rounds UP to the next stocked length if the requested length is
 * non-standard. Returns the longest available (100m) if requested
 * length exceeds the catalogue.
 */
export function lengthCodeFor(meters: number): { code: string; actualMeters: number } {
  const valid = Number.isFinite(meters) && meters > 0 ? meters : 10;
  for (const entry of LENGTH_CODES) {
    if (valid <= entry.meters) return { code: entry.code, actualMeters: entry.meters };
  }
  const max = LENGTH_CODES[LENGTH_CODES.length - 1];
  return { code: max.code, actualMeters: max.meters };
}

/**
 * Build a complete cable MLFB by attaching the length-code suffix.
 *
 *   buildCableMlfb("6FX8002-5CA15", 7) → "6FX8002-5CA15-1AH0"
 *
 * If the base already has a suffix (4-char alphanumeric segment after
 * the last hyphen), the suffix is replaced.
 */
export function buildCableMlfb(baseMlfb: string, meters: number): {
  mlfb: string;
  actualMeters: number;
} {
  const { code, actualMeters } = lengthCodeFor(meters);
  // Strip an EXISTING length-code suffix only — Siemens cable length
  // codes are exactly 4 characters and begin with "1" (e.g. 1AF0, 1BA0).
  // Other 4/5-char hyphen segments in the base ("5CA15", "8002") must
  // be preserved.
  const lastDash = baseMlfb.lastIndexOf("-");
  const tail = baseMlfb.slice(lastDash + 1);
  const baseWithoutSuffix =
    /^1[A-Z]{2}[0-9]$/.test(tail) ? baseMlfb.slice(0, lastDash) : baseMlfb;
  return { mlfb: `${baseWithoutSuffix}-${code}`, actualMeters };
}
