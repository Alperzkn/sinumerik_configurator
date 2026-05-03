import type { MotorOptionModel } from "../types";

/**
 * 1FT2 SIMOTICS S — High-Dynamic / Compact servo motor.
 *
 * Source: D21.4 ordering tables.
 *
 *   1FT2104-4AF21-2AB0
 *   └────┘ └─┘└┘ └───┘
 *    base  spd flange interfix=21    suffix=-2AB0
 *
 *   MOTOR_SPECS stores the trunk through the speed code (e.g. "1FT2104-4AF")
 *   so the builder must (a) attach the 2-char encoder/flange interfix
 *   "21" — DRIVE-CLiQ multi-turn absolute encoder (AM24DQI) on a Classic
 *   flange, the most common production default — and (b) attach the
 *   4-char user-configurable suffix.
 *
 * Suffix slot layout (suffix only, after the second "-"):
 *   pos 1: leading code (2 = DRIVE-CLiQ Compact)
 *   pos 2: shaft + tolerance + brake (A/B/D/E/G/H)
 *   pos 3: terminal box / cable entry direction
 *   pos 4: vibration grade (0 = Grade A IP65 standard, 1 = Grade R)
 */
export const ft2DriveCliq: MotorOptionModel = {
  family: "1FT2",
  variant: "DRIVE-CLiQ",
  // 1FT2 ordering option codes per D21.4 page 8.1/57:
  //   • Holding brake:   0 = without, 1 = with
  //   • Degree of IP:    0 = IP64, 1 = IP65, 2 = IP67
  //   • Shaft end:       0 = plain, 1 = feather key
  //   • Encoder:         S = AS22DQC, M = AM22DQC, B = AS26DQC, C = AM26DQC
  // The catalog ordering article shape is `1FT2XXX-YYY██-■■■B0` for
  // Compact frames or `■■-■■B0` for High Dynamic — the codes above
  // are confirmed but their *positional layout* across the suffix isn't
  // exhaustively cross-referenced. Until that's done, we don't emit a
  // speculative suffix; the BOM shows the verified trunk and tags the
  // line "trunk-only — partner completes suffix".
  completeness: "trunk-only",
  suffixTemplate: "",
  slots: [],
};

/**
 * No-op for trunk-only families. Kept for API compatibility with the
 * per-axis resolver dispatch table; returns an empty selections map
 * because the suffix template is empty.
 */
export function ft2SelectionsFor(_args?: {
  brake?: boolean;
  shaftKind?: "feather" | "plain";
  tolerance?: "N" | "R";
}): Record<string, string> {
  return {};
}
