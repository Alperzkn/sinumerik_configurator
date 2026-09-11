/**
 * Everything the response-parser needs, across all control-system families.
 * Family-specific data lives in the *-828d.ts files; the SINUMERIK ONE data
 * keeps its original file names. Import this instead of picking arrays by hand
 * so the AI flow and the template flow always see the same catalog.
 */
import { controlUnits } from "./control-units";
import { controlUnits828d } from "./control-units-828d";
import { cncSoftwareOptions } from "./cnc-software";
import { cncSoftware828d } from "./cnc-software-828d";
import { technologyPackages } from "./technology-packages";
import { softwareOptions } from "./software-options";
import { softwareOptions828d } from "./software-options-828d";
import { driveComponents } from "./drives";
import { driveComponents828d } from "./drives-828d";
import { motors } from "./motors";
import { measuringSystems } from "./measuring-systems";
import { hmiComponents } from "./hmi-components";
import { hmiComponents828d } from "./hmi-828d";
import { safetyFunctions } from "./safety";
import { selectCables } from "./cables";
import type { ControlSystemFamily } from "@/types/catalog";

export const catalogBundle = {
  controlUnits: [...controlUnits, ...controlUnits828d],
  cncSoftware: [...cncSoftwareOptions, ...cncSoftware828d],
  technologyPackages,
  softwareOptions: [...softwareOptions, ...softwareOptions828d],
  driveComponents: [...driveComponents, ...driveComponents828d],
  motors,
  measuringSystems,
  hmiComponents: [...hmiComponents, ...hmiComponents828d],
  safetyFunctions,
  selectCables,
};

/** Family of a catalog entity; entries without the field are SINUMERIK ONE. */
export function familyOf(entity: { family?: ControlSystemFamily }): ControlSystemFamily {
  return entity.family ?? "sinumerik_one";
}

/** 828D and 828D Smart share the NC 82 option / HMI / software data. */
export function sharesCatalog(a: ControlSystemFamily, b: ControlSystemFamily): boolean {
  if (a === b) return true;
  return a !== "sinumerik_one" && b !== "sinumerik_one";
}
