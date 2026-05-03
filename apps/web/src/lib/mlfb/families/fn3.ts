import type { MotorOptionModel } from "../types";

/**
 * 1FN3 SIMOTICS L — Linear motor (primary section).
 *
 * Source: D21.4. Linear motors are component pairs: a primary section
 * (the active "stator") and a secondary section (the magnetic track).
 * The MLFB describes the primary; the secondary is ordered separately.
 *
 *   1FN3450-4WC00-0AA1
 *
 * Slots:
 *   pos 1: cooling — A = air, W = water (water is standard for high-power)
 *   pos 2: thermal sensor — C = PT1000 + KTY84 (standard)
 *   pos 3: spec (0 = standard)
 *   pos 4-5-6: encoder interface (defaults to standard analog signal port)
 *
 * Brake is N/A — linear motors use external mechanical clamps if a
 * fail-safe hold is required.
 */
export const fn3: MotorOptionModel = {
  family: "1FN3",
  variant: "Linear motor primary section",
  completeness: "trunk-only",
  suffixTemplate: "-{cooling}{thermal}{spec}-0AA1",
  slots: [
    {
      id: "cooling",
      label: "Cooling",
      defaultCode: "W",
      choices: [
        { code: "W", label: "Water cooling (standard)" },
        { code: "A", label: "Air cooling (smaller frames only)" },
      ],
    },
    {
      id: "thermal",
      label: "Thermal sensor",
      defaultCode: "C",
      choices: [
        { code: "C", label: "PT1000 + KTY84 (standard)" },
      ],
    },
    {
      id: "spec",
      label: "Spec",
      defaultCode: "0",
      choices: [{ code: "0", label: "Standard" }],
    },
  ],
};

export function fn3SelectionsFor({
  cooling = "water",
}: {
  cooling?: "water" | "air";
}): Record<string, string> {
  return {
    cooling: cooling === "air" ? "A" : "W",
    thermal: "C",
    spec: "0",
  };
}
