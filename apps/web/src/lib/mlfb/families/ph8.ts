import type { MotorOptionModel } from "../types";

/**
 * 1PH8 SIMOTICS M — Asynchronous and synchronous main spindle motor.
 *
 * Source: D21.4 motor catalog (Part 2). The 1PH8 MLFB has the form
 * `1PH8XXX-YZF10-0LA1` where the suffix encodes:
 *
 *   pos 1: encoder type
 *      0 = SIN/COS 2048 S/R                 (analog incremental)
 *      1 = Resolver
 *      2 = AS22DQI absolute single-turn 22-bit DRIVE-CLiQ
 *      3 = AM22DQI absolute multi-turn 22-bit DRIVE-CLiQ
 *      L = Without encoder (open-loop / external feedback only)
 *   pos 2: cooling / mounting
 *      L = Air cooling, IP55, IM B3 horizontal foot mount (default)
 *      A = Air cooling, IP55, IM B5 flange
 *      W = Water cooling, IP55
 *   pos 3: cabling / drive interface (A = standard SINAMICS S120 booksize)
 *   pos 4: spec / additional features (1 = standard)
 *
 * Holding brake is NOT typical for 1PH8 spindles (the spindle has a
 * mechanical brake or works with the position-loop hold). We don't
 * model brake here — the field is always "1" for standard production.
 */
export const ph8: MotorOptionModel = {
  family: "1PH8",
  variant: "SINAMICS S120 spindle",
  // MOTOR_SPECS for 1PH8 already stores the full ordering MLFB
  // (e.g. "1PH8133-1FF10-0LA1"). The resolver detects this and skips
  // the suffix template — completeness "verified" means the article in
  // the BOM matches the published catalog entry exactly.
  completeness: "verified",
  suffixTemplate: "-{encoder}{mounting}{interface}{spec}",
  slots: [
    {
      id: "encoder",
      label: "Encoder",
      defaultCode: "0",
      choices: [
        { code: "0", label: "SIN/COS 2048 S/R (analog incremental, default)" },
        { code: "1", label: "Resolver" },
        { code: "2", label: "Absolute single-turn 22-bit DRIVE-CLiQ" },
        { code: "3", label: "Absolute multi-turn 22-bit DRIVE-CLiQ" },
        { code: "L", label: "Without encoder (open-loop)" },
      ],
    },
    {
      id: "mounting",
      label: "Cooling / mounting",
      defaultCode: "L",
      choices: [
        { code: "L", label: "Air cooling, IP55, IM B3 (foot mount)" },
        { code: "A", label: "Air cooling, IP55, IM B5 (flange)" },
        { code: "W", label: "Water cooling, IP55" },
      ],
    },
    {
      id: "interface",
      label: "Drive interface",
      defaultCode: "A",
      choices: [
        { code: "A", label: "Standard SINAMICS S120 booksize" },
        { code: "B", label: "S120 chassis (large frame sizes)" },
      ],
    },
    {
      id: "spec",
      label: "Additional spec",
      defaultCode: "1",
      choices: [{ code: "1", label: "Standard" }],
    },
  ],
};

/**
 * Pick 1PH8 suffix codes from user intent. Spindle motors don't
 * usually have a brake choice — the form's "encoder" and "cooling"
 * questions feed in here.
 */
export function ph8SelectionsFor({
  encoder = "incremental",
  cooling = "air",
}: {
  encoder?: "incremental" | "resolver" | "absolute_single" | "absolute_multi" | "none";
  cooling?: "air" | "water";
}): Record<string, string> {
  const enc = {
    incremental: "0",
    resolver: "1",
    absolute_single: "2",
    absolute_multi: "3",
    none: "L",
  }[encoder];
  return {
    encoder: enc,
    mounting: cooling === "water" ? "W" : "L",
    interface: "A",
    spec: "1",
  };
}
