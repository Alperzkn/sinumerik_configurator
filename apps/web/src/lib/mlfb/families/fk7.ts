import type { MotorOptionModel } from "../types";

/**
 * 1FK7 SIMOTICS S — Compact / Compact High Dynamic servo motor.
 *
 * Source: NC63 catalog and legacy D21.4 entries. 1FK7 is the
 * predecessor of 1FT2 / 1FK2 but is still extensively used in active
 * SINUMERIK installations.
 *
 *   1FK7042-5AF71-1DA1
 *   └────┘ └───┘└─┘ └──┘
 *    base  spd flange  suffix
 *                 (constant 7)
 *
 * If MOTOR_SPECS stores the full trunk through the flange digit
 * (e.g. "1FK7042-5AF71"), getBaseMlfb leaves it intact and the suffix
 * template appends "-1DA1"-style. If MOTOR_SPECS stores only the
 * shorter trunk (e.g. "1FK7042-5AF7"), the builder still produces a
 * recognisable MLFB the partner can complete.
 */
export const fk7Compact: MotorOptionModel = {
  family: "1FK7",
  variant: "Compact (DRIVE-CLiQ)",
  // Same shape as 1FT7: 4-char suffix beginning with the constant "1".
  suffixTemplate: "-1{shaft_brake}{terminal}{spec}",
  slots: [
    {
      id: "shaft_brake",
      label: "Shaft form / accuracy / holding brake",
      defaultCode: "A",
      choices: [
        { code: "A", label: "Feather key + keyway, tolerance N, without holding brake" },
        { code: "B", label: "Feather key + keyway, tolerance N, with holding brake" },
        { code: "D", label: "Feather key + keyway, tolerance R, without holding brake" },
        { code: "E", label: "Feather key + keyway, tolerance R, with holding brake" },
        { code: "G", label: "Plain shaft, tolerance N, without holding brake" },
        { code: "H", label: "Plain shaft, tolerance N, with holding brake" },
      ],
    },
    {
      id: "terminal",
      label: "Terminal box / cable entry direction",
      defaultCode: "A",
      choices: [
        { code: "A", label: "Rotatable connector (standard)" },
        { code: "5", label: "Top, transverse from right" },
        { code: "6", label: "Top, transverse from left" },
      ],
    },
    {
      id: "spec",
      label: "Additional specification",
      defaultCode: "1",
      choices: [{ code: "1", label: "Standard" }],
    },
  ],
};

export function fk7SelectionsFor({
  brake,
  shaftKind = "feather",
  tolerance = "N",
}: {
  brake: boolean;
  shaftKind?: "feather" | "plain";
  tolerance?: "N" | "R";
}): Record<string, string> {
  const map: Record<string, string> = {
    "feather|N|false": "A",
    "feather|N|true": "B",
    "feather|R|false": "D",
    "feather|R|true": "E",
    "plain|N|false": "G",
    "plain|N|true": "H",
    "plain|R|false": "D",
    "plain|R|true": "E",
  };
  return {
    shaft_brake: map[`${shaftKind}|${tolerance}|${brake}`] ?? "A",
    terminal: "A",
    spec: "1",
  };
}
