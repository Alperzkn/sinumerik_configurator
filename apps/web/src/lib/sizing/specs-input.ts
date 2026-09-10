import type { MachineSpecsState } from "@/store/configurator-store";
import type { UserSpecsInput } from "./index";

/** First number in a free-text spec field ("22 kW" → 22). */
export function parseNumeric(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : undefined;
}

/** Wizard specs form → sizing-engine input. One implementation for every caller. */
export function specsToSizingInput(specs: MachineSpecsState): UserSpecsInput {
  return {
    spindlePowerKw: parseNumeric(specs.spindlePower),
    spindleMaxRpm: parseNumeric(specs.spindleSpeed),
    movingMassKg: parseNumeric(specs.movingMass),
    rapidTraverseMpm: parseNumeric(specs.rapidTraverse),
    axisTravel: specs.axisTravel,
    machineSize: (specs.machineSize || "") as UserSpecsInput["machineSize"],
    material: specs.material,
    ioModule: specs.ioModule,
    handheldUnit: specs.handheldUnit,
    cableLengthMeters: specs.cableLengthMeters,
    safetyLevel: (specs.safetyLevel || "") as UserSpecsInput["safetyLevel"],
  };
}
