import type { MotorOptionModel } from "../types";

/**
 * 1FE1 / 1FE2 SIMOTICS M — Built-in motor spindles (direct-drive).
 *
 * Source: D21.4 (1FE1) and D31 (1FE2). Built-in motors don't have a
 * shaft or brake — they're rotor + stator components integrated into
 * the customer's spindle housing. The MLFB encodes:
 *
 *   pos 1: cooling style (W = water, A = air)
 *   pos 2: encoder type (1 = SIN/COS, 2 = absolute single-turn DQ)
 *   pos 3: spec (0 = standard)
 *
 *   1FE1051-4WC10-1FE1
 *   1FE2104-4WS10-2AB0
 *
 * Brake is N/A. The mechanical clamp / hydraulic brake is part of the
 * customer spindle assembly, not the motor.
 */
export const fe1: MotorOptionModel = {
  family: "1FE1",
  variant: "Built-in motor spindle",
  suffixTemplate: "-{cooling}{encoder}{spec}",
  slots: [
    {
      id: "cooling",
      label: "Cooling",
      defaultCode: "W",
      choices: [
        { code: "W", label: "Water cooling (default)" },
        { code: "A", label: "Air cooling" },
      ],
    },
    {
      id: "encoder",
      label: "Encoder interface",
      defaultCode: "1",
      choices: [
        { code: "1", label: "SIN/COS 2048 S/R (analog)" },
        { code: "2", label: "Absolute single-turn DRIVE-CLiQ" },
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

export const fe2: MotorOptionModel = {
  ...fe1,
  family: "1FE2",
  variant: "Built-in motor spindle (newer generation)",
};

export function fe1SelectionsFor({
  cooling = "water",
  encoder = "incremental",
}: {
  cooling?: "water" | "air";
  encoder?: "incremental" | "absolute_single";
}): Record<string, string> {
  return {
    cooling: cooling === "air" ? "A" : "W",
    encoder: encoder === "absolute_single" ? "2" : "1",
    spec: "0",
  };
}

export const fe2SelectionsFor = fe1SelectionsFor;
