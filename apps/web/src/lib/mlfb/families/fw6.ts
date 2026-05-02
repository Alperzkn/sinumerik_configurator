import type { MotorOptionModel } from "../types";

/**
 * 1FW6 SIMOTICS T — Built-in / complete torque motor.
 *
 * Source: D21.4. Torque motors are direct-drive rotary motors with
 * very high pole counts. They come as built-in (rotor + stator only)
 * or complete (housed) variants.
 *
 *   1FW6230-8WC07-1JA0    Built-in, water cooling, encoder C, version 1JA0
 *   1FW6090-8RB07-3JA0    Complete, air cooling
 *
 * Slots:
 *   pos 1: form / cooling (W = built-in water, R = complete air)
 *   pos 2: thermal protection (C = PT1000 + KTY)
 *   pos 3: spec (0 = standard)
 *
 * Encoder mounting is part of the customer's spindle build for built-in
 * variants; complete variants have an integrated encoder picked at
 * order time. No brake on torque motors.
 */
export const fw6: MotorOptionModel = {
  family: "1FW6",
  variant: "Torque motor",
  suffixTemplate: "-{form_cooling}{thermal}{spec}-1JA0",
  slots: [
    {
      id: "form_cooling",
      label: "Form / cooling",
      defaultCode: "W",
      choices: [
        { code: "W", label: "Built-in (rotor + stator), water cooling" },
        { code: "R", label: "Complete (housed), air cooling" },
        { code: "S", label: "Complete (housed), water cooling" },
      ],
    },
    {
      id: "thermal",
      label: "Thermal sensor",
      defaultCode: "C",
      choices: [{ code: "C", label: "PT1000 + KTY84 (standard)" }],
    },
    {
      id: "spec",
      label: "Spec",
      defaultCode: "0",
      choices: [{ code: "0", label: "Standard" }],
    },
  ],
};

export function fw6SelectionsFor({
  form = "built-in",
  cooling = "water",
}: {
  form?: "built-in" | "complete";
  cooling?: "water" | "air";
}): Record<string, string> {
  let code: string;
  if (form === "built-in") code = "W"; // built-in is always water-cooled
  else code = cooling === "air" ? "R" : "S";
  return { form_cooling: code, thermal: "C", spec: "0" };
}
