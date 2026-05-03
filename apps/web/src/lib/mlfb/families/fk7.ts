import type { MotorOptionModel } from "../types";

/**
 * 1FK7 SIMOTICS S — Compact / Compact High Dynamic servo motor.
 *
 * Source: NC63 / legacy D21.4. 1FK7 is the predecessor of 1FT2 / 1FK2
 * and remains in service across many SINUMERIK installations.
 *
 * Marked trunk-only: the catalog ordering page hasn't been cross-
 * checked end-to-end, and the position layout for encoder / brake /
 * shaft / terminal in the suffix may differ from the 1FT7 sibling.
 * Better to ship a recognisable trunk and a "partner completes suffix"
 * badge than fabricate plausible characters.
 */
export const fk7Compact: MotorOptionModel = {
  family: "1FK7",
  variant: "Compact (DRIVE-CLiQ)",
  completeness: "trunk-only",
  suffixTemplate: "",
  slots: [],
};

/** No-op for trunk-only families. */
export function fk7SelectionsFor(_args?: {
  brake?: boolean;
  shaftKind?: "feather" | "plain";
  tolerance?: "N" | "R";
}): Record<string, string> {
  return {};
}
