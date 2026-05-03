import type { MotorOptionModel } from "../types";

/**
 * 1FT2 SIMOTICS S — High-Dynamic / Compact servo motor.
 *
 * Source: D21.4 ordering tables.
 *
 *   1FT2104-4AF21-2AB0
 *   └────┘ └─┘└┘ └───┘
 *    base  spd flange interfix=21    suffix=-2AB0
 *
 *   MOTOR_SPECS stores the trunk through the speed code (e.g. "1FT2104-4AF")
 *   so the builder must (a) attach the 2-char encoder/flange interfix
 *   "21" — DRIVE-CLiQ multi-turn absolute encoder (AM24DQI) on a Classic
 *   flange, the most common production default — and (b) attach the
 *   4-char user-configurable suffix.
 *
 * Suffix slot layout (suffix only, after the second "-"):
 *   pos 1: leading code (2 = DRIVE-CLiQ Compact)
 *   pos 2: shaft + tolerance + brake (A/B/D/E/G/H)
 *   pos 3: terminal box / cable entry direction
 *   pos 4: vibration grade (0 = Grade A IP65 standard, 1 = Grade R)
 */
export const ft2DriveCliq: MotorOptionModel = {
  family: "1FT2",
  variant: "DRIVE-CLiQ",
  // "21-" inserts the encoder/flange interfix (Classic flange + AM24DQI
  // multi-turn DRIVE-CLiQ absolute encoder) BEFORE the second hyphen,
  // then the 4-char suffix follows. Final shape: "<base>21-2BA0".
  suffixTemplate: "21-2{shaft_brake}{terminal}{spec}",
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
      label: "Terminal box / cable entry",
      defaultCode: "A",
      choices: [
        { code: "A", label: "Rotatable connector (default)" },
        { code: "B", label: "Top, transverse from right" },
        { code: "C", label: "Top, transverse from left" },
      ],
    },
    {
      id: "spec",
      label: "Vibration grade / degree of protection",
      defaultCode: "0",
      choices: [
        { code: "0", label: "Grade A, IP65 (standard)" },
        { code: "1", label: "Grade R, IP65 (reduced vibration)" },
      ],
    },
  ],
};

export function ft2SelectionsFor({
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
    spec: "0",
  };
}
