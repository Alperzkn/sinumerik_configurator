import type { MotorOptionModel } from "../types";

/**
 * 1FT2 SIMOTICS S — Compact / High-Dynamic servo motor.
 *
 * Source: D21.4 catalog, "Selection and ordering data — Structure of
 * the article number of SIMOTICS S-1FT2 servomotors", page 8.1/55.
 *
 *   Article position layout (16 positions, 2 separators):
 *
 *       1FT2 ▯▯▯▯ - ▯▯▯▯▯ - ▯▯ B 0
 *       1234 5678   9 10 11 12   13 14 15 16
 *
 *   Pos 1-4   1FT2                                           (fixed)
 *   Pos 5     Moment of inertia    1=High Dynamic, 2=Compact
 *   Pos 6-7   Shaft height         03=20, 04=30, 05=40, 06=52,
 *                                  08=63, 10=80, 13=100 (per page 8.1/55)
 *   Pos 8     Overall length       digit (per motor — see specific tables)
 *   Pos 9     Cooling              A=Natural, S=Forced
 *   Pos 10    Winding/rated speed  B=1500, C=2000, E=2500,
 *                                  F=3000, H=4500, K=6000 r/min
 *   Pos 11    Brake                0=Without, 1=Holding brake,
 *                                  2=Reinforced holding brake (1FT2108 only)
 *   Pos 12    Degree of protection 0=IP64, 1=IP65, 2=IP67
 *   Pos 13    Shaft end            0=Plain, 1=Feather key
 *                                  (special "0 2" plain reduced not modelled)
 *   Pos 14    Encoder              S=AS22DQC absolute single-turn 22-bit,
 *                                  M=AM22DQC abs ST 22-bit + 12-bit MT,
 *                                  B=AS26DQC absolute single-turn 26-bit,
 *                                  C=AM26DQC abs ST 22-bit + 12-bit MT
 *   Pos 15    Cable tech           B = 2 CC dual cable for SINAMICS S120 (fixed)
 *   Pos 16    Reserved             0 (fixed)
 *
 * MOTOR_SPECS stores the trunk through position 10 (e.g. "1FT2104-4AF").
 * The builder fills positions 11-16: `<brake><ip>-<shaft><encoder>B0`.
 *
 *   Example sized motor: 1FT2104 (SH40) + 4AF (length 4, natural, 3000 rpm)
 *   Default no-brake config: brake=0, ip=1 (IP65), shaft=1 (feather key),
 *                            encoder=M (AM22DQC) → suffix "01-1MB0"
 *   Full MLFB:               1FT2104-4AF01-1MB0
 *
 *   With brake: suffix "11-1MB0" → 1FT2104-4AF11-1MB0
 */
export const ft2DriveCliq: MotorOptionModel = {
  family: "1FT2",
  variant: "DRIVE-CLiQ",
  completeness: "verified",
  suffixTemplate: "{brake}{ip}-{shaft}{encoder}B0",
  slots: [
    {
      id: "brake",
      label: "Brake (pos 11)",
      defaultCode: "0",
      choices: [
        { code: "0", label: "Without brake" },
        { code: "1", label: "Holding brake" },
        { code: "2", label: "Reinforced holding brake (1FT2108 only)" },
      ],
    },
    {
      id: "ip",
      label: "Degree of protection (pos 12)",
      defaultCode: "1",
      choices: [
        { code: "0", label: "IP64 (without shaft sealing ring)" },
        { code: "1", label: "IP65 (with shaft sealing ring)" },
        { code: "2", label: "IP67 (sealing ring + spring lock washer)" },
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
        { code: "B", label: "AS26DQC — absolute single-turn 26-bit DRIVE-CLiQ" },
        { code: "C", label: "AM26DQC — abs single-turn 26-bit + 12-bit multi-turn" },
      ],
    },
  ],
};

/**
 * Map user intent to verified 1FT2 ordering codes. Defaults match the
 * most common SINUMERIK ONE production preset:
 *   • IP65 (sealed against coolant mist — standard for machine tools)
 *   • Shaft with feather key (standard for ball-screw drives)
 *   • AM22DQC absolute multi-turn (24-bit total — references hold across
 *     power-cycles, no homing required)
 */
export function ft2SelectionsFor({
  brake = false,
  ip = "IP65",
  shaftKind = "feather",
  encoder = "absolute_multi",
}: {
  brake?: boolean;
  ip?: "IP64" | "IP65" | "IP67";
  shaftKind?: "feather" | "plain";
  encoder?:
    | "absolute_single_22"
    | "absolute_multi"  // AM22DQC default
    | "absolute_single_26"
    | "absolute_multi_26";
} = {}): Record<string, string> {
  const ipMap = { IP64: "0", IP65: "1", IP67: "2" } as const;
  const encoderMap = {
    absolute_single_22: "S",
    absolute_multi: "M",
    absolute_single_26: "B",
    absolute_multi_26: "C",
  } as const;
  return {
    brake: brake ? "1" : "0",
    ip: ipMap[ip],
    shaft: shaftKind === "plain" ? "0" : "1",
    encoder: encoderMap[encoder],
  };
}
