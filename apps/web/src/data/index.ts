// ============================================================
// SINUMERIK ONE Catalog Data - Barrel Export
// ============================================================

export { controlUnits } from "./control-units";
export { cncSoftwareOptions } from "./cnc-software";
export { driveComponents } from "./drives";
export { motors } from "./motors";
export { measuringSystems } from "./measuring-systems";
export { safetyFunctions } from "./safety";
export { softwareOptions } from "./software-options";
export { softwareOptions828d } from "./software-options-828d";
export { technologyPackages } from "./technology-packages";
export { hmiComponents } from "./hmi-components";
export { machineTemplates } from "./machine-templates";
export { compatibilityRules } from "./compatibility-rules";
export { cablesCatalog, selectCables } from "./cables";
// Note: ./drive-selection.ts removed — its parallel motor/cable lookup
// data was unverified against the catalog and the active code uses
// MOTOR_SPECS / MOTOR_MODULE_SPECS in src/lib/validation/drive-system-rules.ts
// + selectCables in ./cables.ts as the single source of truth.
export {
  BASE_SCOPE,
  AXIS_RULES,
  CHANNEL_RULES,
  SAFETY_RULES,
  CONTROL_UNIT_RULES,
  HMI_RULES,
  DRIVE_RULES,
  EXPORT_RULES,
  PACKAGE_CONTENTS,
  CONFIG_CHECKLIST,
} from "./sinumerik-rules";
