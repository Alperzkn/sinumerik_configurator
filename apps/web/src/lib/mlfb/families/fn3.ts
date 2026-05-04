import type { MotorOptionModel } from "../types";

/**
 * 1FN3 SIMOTICS L — Synchronous linear motor (primary section).
 *
 * Source: D21.4 catalog page 8.3/19 (PDF p.672), "Selection and ordering data"
 * for 1FN3 linear motors.
 *
 *   Article position layout (16 positions, 2 separators):
 *
 *       1FN3 ▯▯▯ - ▯▯▯▯▯ - 0 ▯ A 3
 *       1234 567   8 9 10 11 12  13 14 15 16
 *
 *   Pos 1-4   1FN3                                    (fixed)
 *   Pos 5-7   Frame size           050, 100, 150, 300, 450, 600, 900
 *   Pos 8     Number of windings   digit (motor variant)
 *   Pos 9-10  Cooling/winding code WC=water cooling C, WE=water cooling E,
 *                                  WJ=etc. (per motor table)
 *   Pos 11-12 Standard placeholder 00 (per catalog examples)
 *   Pos 13    Spec base            0 (fixed in all examples)
 *   Pos 14    Type of connection   A=Power+signal one cable, terminal box
 *                                    cover prepared for heavy-gauge cable
 *                                    gland (default for 1FN3100..1FN3900)
 *                                  B=Separate power and signal, terminal
 *                                    box prepared for metric cable gland
 *                                  E=Separate, permanently connected with
 *                                    bare wire ends (1FN3050 only)
 *                                  F=Other 1FN3050 variant
 *   Pos 15-16 Cable + reserved     A3 (fixed)
 *
 * MOTOR_SPECS stores positions 1-12 (e.g. "1FN3100-3WC00"). The
 * builder appends positions 13-16: `-0{conn}A3`.
 *
 *   Sized 1FN3100-3WC00 with default connection (A):
 *     Full MLFB: 1FN3100-3WC00-0AA3  ← orderable per D21.4
 *
 *   1FN3 has no holding brake — linear motors require external mechanical
 *   clamps if a fail-safe hold is needed.
 */
export const fn3: MotorOptionModel = {
  family: "1FN3",
  variant: "Linear motor primary section",
  completeness: "verified",
  suffixTemplate: "-0{conn}A3",
  slots: [
    {
      id: "conn",
      label: "Type of connection (pos 14)",
      defaultCode: "A",
      choices: [
        { code: "A", label: "Power+signal one cable, heavy-gauge cable gland (default 1FN3100..1FN3900)" },
        { code: "B", label: "Separate power+signal, metric cable gland (1FN3100..1FN3900)" },
        { code: "E", label: "Separate, permanently connected bare wire 2 m (1FN3050 only)" },
      ],
    },
  ],
};

/**
 * Map user intent to verified 1FN3 ordering codes. Defaults match the
 * standard production preset for 1FN3100 and larger frames (single-cable
 * connection). For 1FN3050 the caller should pass `connection: "bare"`.
 */
export function fn3SelectionsFor({
  connection = "single_cable",
}: {
  /** Legacy field accepted for backward compat — has no effect on MLFB. */
  cooling?: "water" | "air";
  connection?: "single_cable" | "separate" | "bare";
} = {}): Record<string, string> {
  const map = {
    single_cable: "A",
    separate: "B",
    bare: "E",
  } as const;
  return { conn: map[connection] };
}
