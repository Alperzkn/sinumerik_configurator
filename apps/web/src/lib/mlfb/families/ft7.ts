import type { MotorOptionModel } from "../types";

/**
 * 1FT7 SIMOTICS S — Compact servo motor option model.
 *
 * Source: Siemens D21.4 catalog, ordering data tables for 1FT7 Compact
 * (Part 2, "SIMOTICS S-1FT7 synchronous motors"). The base portion
 * (family + shaft height + variant + speed + interface + flange) is
 * decided by the sizing engine; this model describes the SUFFIX slots
 * the customer selects at order time.
 *
 *   Example: 1FT7064-5AF71-1DA1
 *                          ^^^^
 *                          suffix: -{interface}{shaft_brake}{terminal}{spec}
 *
 * Slot codes from D21.4:
 *   - shaft_brake: A=feather/N/no-brake, B=feather/N/brake,
 *                  D=feather/R/no-brake, E=feather/R/brake,
 *                  G=plain/N/no-brake,   H=plain/N/brake
 *   - terminal:    5=top right, 6=top left, 7=top NDE, 8=top DE
 *   - spec:        1=standard
 *
 * The interface character is hardwired to "1" for DRIVE-CLiQ Compact.
 * Non-DRIVE-CLiQ variants use a different base code and are handled by
 * a separate model when added.
 */
export const ft7CompactDriveCliq: MotorOptionModel = {
  family: "1FT7",
  variant: "Compact (DRIVE-CLiQ)",
  completeness: "verified",
  // Format: -{1}{shaft_brake}{terminal}{spec}
  // The leading "1" identifies the DRIVE-CLiQ Compact suffix family.
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
        { code: "A", label: "Rotatable connector (sizes 1 / 1.5)" },
        { code: "5", label: "Top, transverse from right" },
        { code: "6", label: "Top, transverse from left" },
        { code: "7", label: "Top, axial from NDE" },
        { code: "8", label: "Top, axial from DE" },
      ],
    },
    {
      id: "spec",
      label: "Additional specification",
      defaultCode: "1",
      choices: [{ code: "1", label: "Standard (no special spec)" }],
    },
  ],
};

/**
 * Pick the right 1FT7 suffix codes for an axis given the user's
 * intent. Returns a {@link SlotSelections} object suitable for
 * {@link buildMlfb}.
 *
 * Intentionally narrow scope: brake yes/no is the only user-facing
 * decision in Phase 1. Terminal direction and shaft tolerance default
 * to standard production values until the per-axis form lets the user
 * override them (Phase 3).
 */
export function ft7SelectionsFor({
  brake,
  shaftKind = "feather",
  tolerance = "N",
}: {
  brake: boolean;
  shaftKind?: "feather" | "plain";
  tolerance?: "N" | "R";
}): Record<string, string> {
  // Map the (shaft, tolerance, brake) tuple to the catalog's combined code.
  const map: Record<string, string> = {
    "feather|N|false": "A",
    "feather|N|true": "B",
    "feather|R|false": "D",
    "feather|R|true": "E",
    "plain|N|false": "G",
    "plain|N|true": "H",
    // Plain shaft + tolerance R is not in the published catalog.
    // Fall back to feather/R for those edge cases.
    "plain|R|false": "D",
    "plain|R|true": "E",
  };
  const key = `${shaftKind}|${tolerance}|${brake}`;
  return {
    shaft_brake: map[key] ?? "A",
    terminal: "A",
    spec: "1",
  };
}
