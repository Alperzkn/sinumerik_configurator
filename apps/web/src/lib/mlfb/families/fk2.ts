import type { MotorOptionModel } from "../types";

/**
 * 1FK2 SIMOTICS S — compact servo for SINAMICS S210 with One-Cable
 * Connection (OCC) or PROFINET (RJ45).
 *
 * Source: D32 catalog (motion-control-drives D32 2026-02). MOTOR_SPECS
 * stores the trunk (e.g. "1FK2103-2AG"); the builder appends the
 * 2-char encoder interfix "31" and the 4-char user-configurable
 * suffix. Final shape:
 *
 *   1FK2103-2AG31-1AA0    OCC, no brake
 *   1FK2103-2AG31-2AA0    OCC, with brake
 *   1FK2103-2AG31-3AA0    PROFINET RJ45, no brake
 *   1FK2103-2AG31-4AA0    PROFINET RJ45, with brake
 *
 * Slots (4-char suffix after the interfix):
 *   pos 1: connection + brake combo
 *      1 = OCC, no brake          2 = OCC, with brake
 *      3 = RJ45, no brake         4 = RJ45, with brake
 *   pos 2: shaft form (A=feather, B=plain)
 *   pos 3: vibration grade (A = standard, B = reduced)
 *   pos 4: spec (fixed 0)
 */
export const fk2: MotorOptionModel = {
  family: "1FK2",
  variant: "S210 (OCC / PROFINET)",
  // 1FK2 ordering structure (D32 catalog) involves connection-style
  // (OCC vs PROFINET) and brake codes interleaved with encoder /
  // shaft codes. The exact positional layout in the suffix segment
  // hasn't been cross-referenced against a sized motor's full ordering
  // article. Marking trunk-only until verified — better to ship a
  // recognisable trunk than a speculative suffix.
  completeness: "trunk-only",
  suffixTemplate: "",
  slots: [],
};

/** No-op for trunk-only families. */
export function fk2SelectionsFor(_args?: {
  brake?: boolean;
  connection?: "OCC" | "RJ45";
  shaftKind?: "feather" | "plain";
}): Record<string, string> {
  return {};
}
