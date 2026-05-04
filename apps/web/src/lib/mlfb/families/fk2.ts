import type { MotorOptionModel } from "../types";

/**
 * 1FK2 SIMOTICS S — Compact servo for SINAMICS S210 with One-Cable
 * Connection (OCC).
 *
 * Source: D32 catalog page 1/12, "Order overview — SINAMICS S210
 * drive system with SIMOTICS S-1FK2 servomotors for line connection
 * 200 ... 240 V 1 AC". The article-number supplements table at the
 * bottom of that page lists the suffix codes.
 *
 *   Article position layout (16 positions, 2 separators):
 *
 *       1FK2 ▯▯▯▯ - ▯▯▯▯▯ - ▯▯ A 0
 *       1234 5678   9 10 11 12   13 14 15 16
 *
 *   Pos 1-4   1FK2                                          (fixed)
 *   Pos 5     Moment of inertia    1=High Dynamic, 2=Compact
 *   Pos 6-7   Shaft height         02=20, 03=30, 04=40, 05=48/52,
 *                                  06=63 (per D32 table)
 *   Pos 8     Overall length       digit (per motor — see specific tables)
 *   Pos 9     Cooling              A=Natural (most 1FK2 are passive)
 *   Pos 10    Winding/rated speed  F=1500, K=3000, G=… (per D32)
 *   Pos 11    Brake                0=Without holding brake,
 *                                  1=With holding brake
 *   Pos 12    Degree of protection 0=IP64 (no shaft sealing ring),
 *                                  1=IP65 (with shaft sealing ring)
 *   Pos 13    Shaft end            0=Plain shaft, 1=Shaft with feather key
 *                                  (special "0 2" plain reduced not modelled)
 *   Pos 14    Encoder              S=AS22DQC absolute single-turn 22-bit,
 *                                  M=AM22DQC abs ST 22-bit + 12-bit MT
 *   Pos 15    Cable connection     A = One Cable Connection (OCC) (fixed)
 *   Pos 16    Reserved             0 (fixed)
 *
 * MOTOR_SPECS stores the trunk through position 10 (e.g. "1FK2103-2AG").
 * Builder fills positions 11-16: `<brake><ip>-<shaft><encoder>A0`.
 *
 *   Sized motor: 1FK2103-2AG (SH 30, length 2, natural, 3000 rpm)
 *   Default (no brake, IP65, feather key, AM22DQC):
 *     suffix "01-1MA0" → 1FK2103-2AG01-1MA0   ← orderable per D32
 *   With brake: "11-1MA0" → 1FK2103-2AG11-1MA0
 *
 * Note: 1FK2 connection technology is OCC (one cable: power + brake +
 * encoder via single MOTION-CONNECT cable). The "PROFINET RJ45 variant"
 * referenced in earlier model comments is not a separate motor MLFB —
 * PROFINET is the converter's communication interface, handled at the
 * SINAMICS S210 (6SL5...) side, not in the motor article number.
 */
export const fk2: MotorOptionModel = {
  family: "1FK2",
  variant: "OCC for SINAMICS S210",
  completeness: "verified",
  suffixTemplate: "{brake}{ip}-{shaft}{encoder}A0",
  slots: [
    {
      id: "brake",
      label: "Brake (pos 11)",
      defaultCode: "0",
      choices: [
        { code: "0", label: "Without holding brake" },
        { code: "1", label: "With holding brake" },
      ],
    },
    {
      id: "ip",
      label: "Degree of protection (pos 12)",
      defaultCode: "1",
      choices: [
        { code: "0", label: "IP64 (without shaft sealing ring)" },
        { code: "1", label: "IP65 (with shaft sealing ring)" },
      ],
    },
    {
      id: "shaft",
      label: "Shaft end (pos 13)",
      defaultCode: "1",
      choices: [
        { code: "0", label: "Plain shaft" },
        { code: "1", label: "Shaft with feather key" },
      ],
    },
    {
      id: "encoder",
      label: "Encoder (pos 14)",
      defaultCode: "M",
      choices: [
        { code: "S", label: "AS22DQC — absolute single-turn 22-bit DRIVE-CLiQ" },
        { code: "M", label: "AM22DQC — abs single-turn 22-bit + 12-bit multi-turn" },
      ],
    },
  ],
};

/**
 * Map user intent to verified 1FK2 ordering codes. Defaults match the
 * standard SINUMERIK ONE production preset (IP65, feather key, AM22DQC).
 *
 * The legacy `connection` parameter is accepted for backward compat but
 * has no effect — 1FK2 motor articles only encode OCC. Communication
 * choice (OCC pulse vs PROFINET) lives on the S210 converter side.
 */
export function fk2SelectionsFor({
  brake = false,
  ip = "IP65",
  shaftKind = "feather",
  encoder = "absolute_multi",
}: {
  brake?: boolean;
  /** Accepted for back-compat; not used in 1FK2 motor MLFB. */
  connection?: "OCC" | "RJ45";
  ip?: "IP64" | "IP65";
  shaftKind?: "feather" | "plain";
  encoder?: "absolute_single" | "absolute_multi";
} = {}): Record<string, string> {
  return {
    brake: brake ? "1" : "0",
    ip: ip === "IP64" ? "0" : "1",
    shaft: shaftKind === "plain" ? "0" : "1",
    encoder: encoder === "absolute_single" ? "S" : "M",
  };
}
