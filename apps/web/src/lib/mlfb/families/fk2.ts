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
  // "31-" inserts the encoder interfix (AM24DQI absolute multi-turn
  // DRIVE-CLiQ on the OCC bus + standard signal) BEFORE the suffix dash.
  suffixTemplate: "31-{conn_brake}{shaft}{vibration}0",
  slots: [
    {
      id: "conn_brake",
      label: "Connection technology / holding brake",
      defaultCode: "1",
      choices: [
        { code: "1", label: "OCC (One-Cable Connection), without holding brake" },
        { code: "2", label: "OCC (One-Cable Connection), with holding brake" },
        { code: "3", label: "PROFINET RJ45, without holding brake" },
        { code: "4", label: "PROFINET RJ45, with holding brake" },
      ],
    },
    {
      id: "shaft",
      label: "Shaft form",
      defaultCode: "A",
      choices: [
        { code: "A", label: "Feather key + keyway (default)" },
        { code: "B", label: "Plain shaft" },
      ],
    },
    {
      id: "vibration",
      label: "Vibration grade",
      defaultCode: "A",
      choices: [
        { code: "A", label: "Grade A, IP65 (standard)" },
        { code: "B", label: "Grade R (reduced vibration)" },
      ],
    },
  ],
};

export function fk2SelectionsFor({
  brake,
  connection = "OCC",
  shaftKind = "feather",
}: {
  brake: boolean;
  connection?: "OCC" | "RJ45";
  shaftKind?: "feather" | "plain";
}): Record<string, string> {
  const conn_brake =
    connection === "OCC"
      ? brake
        ? "2"
        : "1"
      : brake
        ? "4"
        : "3";
  return {
    conn_brake,
    shaft: shaftKind === "plain" ? "B" : "A",
    vibration: "A",
  };
}
