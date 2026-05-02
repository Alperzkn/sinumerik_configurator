import type { MotorOptionModel } from "../types";

/**
 * 1FT2 SIMOTICS S — High-Dynamic / Compact servo motor.
 *
 * Source: D21.4 ordering tables. The 1FT2 suffix layout is broadly
 * similar to 1FT7 — encoder, flange, shaft+brake, vibration grade —
 * but the codes differ. We model the user-facing slots (encoder type
 * and the combined shaft/brake position) and default the rest.
 *
 *   1FT2104-4AF21-2AB0
 *   └─────┘ └─── ┘ └──┘
 *    base   speed  suffix
 *
 * Suffix slot layout (from D21.4 ordering tables):
 *   pos 1: encoder + flange combo (1=DRIVE-CLiQ classic, 0=DRIVE-CLiQ recessed,
 *          4=non-DQ classic, 5=non-DQ recessed, plus encoder letter)
 *   pos 2: shaft + tolerance + brake (A/B/D/E/G/H — same scheme as 1FT7)
 *   pos 3: terminal box / cable entry direction
 *   pos 4: vibration grade / IP class (1=Grade A IP65 standard)
 */
export const ft2DriveCliq: MotorOptionModel = {
  family: "1FT2",
  variant: "DRIVE-CLiQ",
  // Format: -2{shaft_brake}{terminal}{spec}
  // The leading "2" identifies the standard DRIVE-CLiQ + Multi-turn variant.
  suffixTemplate: "-2{shaft_brake}{terminal}{spec}",
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
