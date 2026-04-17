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
export { technologyPackages } from "./technology-packages";
export { hmiComponents } from "./hmi-components";
export { machineTemplates } from "./machine-templates";
export { compatibilityRules } from "./compatibility-rules";
export { cablesCatalog, selectCables } from "./cables";
export {
  s120MotorModules,
  s120LineModules,
  s220LineModules,
  s210Converters,
  s210Motors,
  s210Matches,
  selectMotorModule,
  selectLineModule,
  selectS210System,
} from "./drive-selection";
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
