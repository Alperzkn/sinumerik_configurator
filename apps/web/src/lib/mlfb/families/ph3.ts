import type { MotorOptionModel } from "../types";

/**
 * 1PH3 SIMOTICS M — compact main spindle motor (smaller frame sizes).
 *
 * Source: NC63 / D31 catalog. 1PH3 covers small lathes and smaller
 * mills where 1PH8 is overkill. Suffix layout is similar to 1PH8 but
 * with fewer encoder options.
 *
 *   1PH3105-1AF40-0LA1
 *   └─────┘ └────┘ └──┘
 *    base   speed   suffix
 *
 * Slots match 1PH8: encoder / mounting / interface / spec.
 */
export const ph3: MotorOptionModel = {
  family: "1PH3",
  variant: "Compact spindle",
  completeness: "trunk-only",
  suffixTemplate: "-{encoder}{mounting}{interface}{spec}",
  slots: [
    {
      id: "encoder",
      label: "Encoder",
      defaultCode: "0",
      choices: [
        { code: "0", label: "SIN/COS 2048 S/R (analog incremental)" },
        { code: "1", label: "Resolver" },
        { code: "2", label: "Absolute single-turn DRIVE-CLiQ" },
        { code: "L", label: "Without encoder" },
      ],
    },
    {
      id: "mounting",
      label: "Cooling / mounting",
      defaultCode: "L",
      choices: [
        { code: "L", label: "Air cooling, IP55, IM B3 (foot)" },
        { code: "A", label: "Air cooling, IP55, IM B5 (flange)" },
      ],
    },
    {
      id: "interface",
      label: "Drive interface",
      defaultCode: "A",
      choices: [{ code: "A", label: "Standard SINAMICS S120 booksize" }],
    },
    {
      id: "spec",
      label: "Spec",
      defaultCode: "1",
      choices: [{ code: "1", label: "Standard" }],
    },
  ],
};

export function ph3SelectionsFor({
  encoder = "incremental",
}: {
  encoder?: "incremental" | "resolver" | "absolute_single" | "none";
}): Record<string, string> {
  const enc = {
    incremental: "0",
    resolver: "1",
    absolute_single: "2",
    none: "L",
  }[encoder];
  return { encoder: enc, mounting: "L", interface: "A", spec: "1" };
}
