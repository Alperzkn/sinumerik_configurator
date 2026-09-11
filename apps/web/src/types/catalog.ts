// ============================================================
// SINUMERIK ONE Catalog Data Types
// Based on Siemens NC63 Catalog, January 2026
// ============================================================

/** Which SINUMERIK product line a configuration targets. */
export type ControlSystemFamily = "sinumerik_one" | "828d" | "828d_smart";

export const CONTROL_SYSTEM_FAMILIES: Record<ControlSystemFamily, { label: string; short: string; catalog: string }> = {
  sinumerik_one: { label: "SINUMERIK ONE", short: "ONE", catalog: "NC 63" },
  "828d": { label: "SINUMERIK 828D", short: "828D", catalog: "NC 82" },
  "828d_smart": { label: "SINUMERIK 828D Smart", short: "828D Smart", catalog: "NC 82" },
};

export type ControlUnitVariant =
  // SINUMERIK ONE (NC 63)
  | "PPU_1740"
  | "NCU_1740"
  | "NCU_1750"
  | "NCU_1760"
  // SINUMERIK 828D / 828D Smart (NC 82) — ids match the PPU generation .5
  | "PPU_241_5"
  | "PPU_240_5"
  | "PPU_261_5"
  | "PPU_260_5"
  | "PPU_271_5"
  | "PPU_270_5"
  | "PU_272_5"
  | "PPU_290_5";

/** Availability keyed by control unit; units not listed count as not available. */
export type CompatibilityMap = Partial<Record<ControlUnitVariant, Availability>>;

export type Availability = "basic" | "option" | "not_available";

export type MachineType =
  | "3axis_mill"
  | "5axis_mill"
  | "cnc_lathe"
  | "mill_turn"
  | "grinding"
  | "laser"
  | "punching"
  | "robot"
  | "router"
  | "custom";

export type SoftwareVariant = "export" | "full_scope";

export type DeliveryFormat =
  | "sd_card_with_license"
  | "sd_card_without_license"
  | "dvd_without_license"
  | "no_media_with_license";

// --- Control Units ---
export interface ControlUnit {
  id: ControlUnitVariant;
  /** Product line this unit belongs to. */
  family: ControlSystemFamily;
  name: string;
  articleNumber: string;
  formFactor: "panel_based" | "cabinet_based";
  displaySize?: string;
  maxAxesSpindles: number;
  maxAxesSpindlesCncPlusPLC?: number;
  maxChannels: number;
  maxModeGroups?: number;
  /** 0 for units without DRIVE-CLiQ (828D Smart talks PROFINET to S200). */
  driveCliqPorts: number;
  /** Drive interface the unit exposes to the drive line-up. */
  driveInterface?: "DRIVE-CLiQ" | "PROFINET";
  maxNX?: number;
  maxCombi?: number;
  baseChannels?: number;
  plcMemory?: { programMB: number; dataMB: number };
  cncUserMemoryMB?: number;
  blockChangeTimeMs?: number;
  maxLinearInterpolatingAxes?: number;
  exportVersionAvailable?: boolean;
  /** Panel orientation for PPUs with an integrated display. */
  orientation?: "horizontal" | "vertical";
  /** Drive-control axes the unit handles itself (828D: 6, Smart: 5). */
  onboardDriveAxes?: number;
  description: string;
}

// --- CNC Software ---
export interface CncSoftware {
  id: string;
  articleNumber: string;
  /** Product line; absent = SINUMERIK ONE. */
  family?: ControlSystemFamily;
  /** 828D SD cards are technology-specific: milling / turning / grinding. */
  technology?: "M" | "T" | "G";
  variant: SoftwareVariant;
  swVersion: string;
  spLevel?: string;
  deliveryFormat: DeliveryFormat;
  languages: string[];
  compatibility: CompatibilityMap;
  requiresExportApproval: boolean;
  description: string;
}

// --- Software Options ---
export type OptionCategory =
  | "axis"
  | "channel"
  | "mode_group"
  | "memory"
  | "technology"
  | "safety"
  | "monitoring"
  | "compensation"
  | "hmi"
  | "communication"
  | "engineering"
  | "coupling"
  | "interpolation"
  | "transformation"
  | "tool"
  | "measurement"
  | "drive"
  | "synchronized_action"
  | "programming"
  | "simulation"
  | "operating_mode"
  | "other";

export interface SoftwareOption {
  id: string;
  /** Product line; absent = SINUMERIK ONE. */
  family?: ControlSystemFamily;
  orderCode: string;
  articleNumber: string;
  name: string;
  description: string;
  category: OptionCategory;
  compatibility: CompatibilityMap;
  exportAvailable: boolean;
  exportRestriction?: string;
  requirements?: string[];
  includedIn?: string[];
  swVersionRequired?: string;
  isNew?: boolean;
}

// --- Technology Packages ---
export interface TechnologyPackage {
  id: string;
  orderCode: string;
  articleNumber: string;
  name: string;
  description: string;
  includedOptions: string[];
  compatibility: CompatibilityMap;
  exportAvailable: boolean;
  requirements?: string[];
  recommendedFor: MachineType[];
}

// --- Drive Components ---
export type DriveFamily =
  | "S200"
  | "S120_booksize"
  | "S120_chassis"
  | "S120_combi"
  | "S220"
  | "G120"
  | "S210"
  | "S120M";

export type DriveComponentType =
  | "motor_module_single"
  | "motor_module_double"
  | "line_module_active"
  | "line_module_smart"
  | "line_module_basic"
  | "interface_module"
  | "control_unit"
  | "sensor_module"
  | "terminal_module"
  | "hub_module"
  | "power_module_3axis"
  | "power_module_4axis"
  | "hla_module"
  | "voltage_protection";

export interface DriveComponent {
  id: string;
  articleNumber: string;
  name: string;
  driveFamily: DriveFamily;
  componentType: DriveComponentType;
  variant?: string;
  ratedCurrent?: string;
  ratedPower?: string;
  frameType?: string;
  coolingType?: string;
  compatibility: CompatibilityMap;
  description: string;
}

// --- Motors ---
export type MotorFamily = "SIMOTICS_S" | "SIMOTICS_M" | "SIMOTICS_L" | "SIMOTICS_T";

export type MotorType =
  | "feed_servo_sync"
  | "main_spindle_async"
  | "main_spindle_sync"
  | "linear_sync"
  | "torque_sync";

/**
 * Per-axis MLFB resolution. When the user states per-axis preferences
 * (e.g. "X axes have brakes, Y axes don't") we expand a single sized
 * motor into N orderable MLFBs — one per axis — using the option-suffix
 * builder in `lib/mlfb`.
 *
 * If `perAxisMlfbs` is non-empty, the BOM should render one row per
 * axis with that axis's full MLFB. If empty/undefined, fall back to
 * the legacy "1 motor × quantity N" display using `articleNumber`.
 */
export interface AxisMlfb {
  /** User's axis label, exactly as they wrote it (X1, Y1, B, etc.) */
  axis: string;
  /** Full orderable MLFB for this axis, including suffix. */
  mlfb: string;
  /** True when this axis was configured with an integrated holding brake. */
  brake?: boolean;
  /** Encoder type code, when explicitly chosen. */
  encoder?: string;
  /**
   * Per-slot decoder produced by `explainMlfb()`. Lets the BOM render a
   * "what does each suffix character mean" tooltip without re-parsing the
   * MLFB at display time. Only set when a family option model exists.
   */
  decoded?: Array<{ label: string; code: string; choiceLabel: string }>;
  /**
   * Honesty flag: "verified" means the MLFB matches the catalog ordering
   * tables exactly; "trunk-only" means only the catalog trunk is shown
   * and the suffix (encoder / brake / shaft / IP) must be specified by
   * the Siemens partner during order entry.
   */
  completeness?: "verified" | "partial" | "trunk-only";
}

export interface Motor {
  id: string;
  family: MotorFamily;
  series: string;
  name: string;
  articleNumber?: string;
  motorType: MotorType;
  connectionType: "1_cable" | "2_cable" | "standard";
  compatibility: CompatibilityMap;
  notes?: string;
  description: string;
  // Runtime specs from AI response (optional — not all catalog entries have these)
  shaftHeight?: number;
  ratedPower?: string;
  ratedTorque?: string;
  ratedSpeed?: string;
  ratedCurrent?: string;
  maxSpeed?: string;
  maxTorque?: string;
  /**
   * Per-axis full MLFBs. Populated when the user provided axis names
   * + brake preferences (via the AI's userPreferences). Each entry is
   * an orderable article number for that specific axis.
   */
  perAxisMlfbs?: AxisMlfb[];
  /**
   * Honest signal of how completely `articleNumber` matches the
   * Siemens catalog's official ordering MLFB. "verified" = directly
   * orderable; "trunk-only" = trunk shown, partner picks the suffix.
   */
  mlfbCompleteness?: "verified" | "partial" | "trunk-only";
}

// --- Measuring Systems ---
export type EncoderInterface =
  | "DRIVE-CLiQ"
  | "SSI"
  | "RS422_TTL"
  | "sin_cos_1Vpp"
  | "EnDat_2_1"
  | "EnDat_2_2"
  | "resolver";

export interface MeasuringSystem {
  id: string;
  name: string;
  type: "absolute" | "incremental" | "resolver" | "linear_scale";
  encoderInterface: EncoderInterface;
  sensorModule?: string;
  articleNumber?: string;
  compatibility: CompatibilityMap;
  description: string;
}

// --- HMI Components ---
export type HmiCategory =
  | "ppu_panel"
  | "thin_client"
  | "flat_panel"
  | "panel_pc"
  | "cabinet_ipc"
  | "mcp"
  | "handwheel"
  | "handheld_terminal"
  | "handheld_accessory"
  | "io_module";

export interface HmiComponent {
  id: string;
  /** Product line; absent = SINUMERIK ONE. */
  family?: ControlSystemFamily;
  articleNumber: string;
  name: string;
  category: HmiCategory;
  screenSize?: number;
  resolution?: string;
  compatibility: CompatibilityMap;
  requirements?: string[];
  mountingPosition?: string;
  description: string;
  isNew?: boolean;
}

// --- Safety Functions ---
export type SafetyCategory =
  | "basic"
  | "f_plc"
  | "axis_monitoring"
  | "multi_axis"
  | "safe_stop"
  | "safe_monitoring"
  | "safe_kinematics";

export interface SafetyFunction {
  id: string;
  articleNumber?: string;
  orderCode?: string;
  name: string;
  category: SafetyCategory;
  isBasicScope: boolean;
  compatibility: CompatibilityMap;
  requirements?: string[];
  description: string;
}

// --- Compatibility Warning ---
export interface CompatibilityWarning {
  severity: "error" | "warning" | "info";
  message: string;
  affectedComponents: string[];
  suggestion?: string;
}

// --- Compatibility Rule ---
export interface CompatibilityRule {
  id: string;
  name: string;
  description: string;
  check: (config: GeneratedConfiguration) => CompatibilityWarning | null;
}

// --- Machine Template ---
export interface MachineTemplate {
  id: string;
  type: MachineType;
  name: string;
  description: string;
  icon: string;
  typicalAxes: number;
  typicalSpindles: number;
  defaultControlUnit: ControlUnitVariant;
  defaultPackages: string[];
  defaultSafetyOptions: string[];
  defaultDriveFamily: DriveFamily;
  defaultMotorTypes: MotorType[];
  promptHint: string;
}

// --- Cables & Accessories ---
export interface CableAccessory {
  id: string;
  articleNumber: string;
  name: string;
  category: "power_cable" | "signal_cable" | "drive_cliq_cable" | "motor_cable" | "encoder_cable" | "network_cable" | "accessory";
  length?: string;
  quantity: number;
  description: string;
}

// --- BOM Item with quantity ---
/**
 * How the article number on a BOM line was obtained.
 *  catalog     — listed verbatim in the local Siemens catalog data
 *  composed    — motor trunk + catalog-verified suffix (per-axis MLFB)
 *  trunk_only  — catalog trunk shown; suffix assigned at order time
 *  order_code  — no article number in the catalog; ordered by option code
 */
export type BomBasis = "catalog" | "composed" | "trunk_only" | "order_code";

export interface BomItem {
  articleNumber: string;
  name: string;
  quantity: number;
  orderCode?: string;
  category: string;
  basis?: BomBasis;
  /** Siemens catalog the article comes from (NC63, D21.4, D32, …) */
  source?: string;
}

// --- Generated Configuration (output of AI) ---
export interface GeneratedConfiguration {
  /** Product line; derived from controlUnit.family when absent (older saved configs). */
  family?: ControlSystemFamily;
  controlUnit: ControlUnit;
  cncSoftware: CncSoftware;
  softwareVariant: SoftwareVariant;
  technologyPackages: TechnologyPackage[];
  softwareOptions: SoftwareOption[];
  optionQuantities: Record<string, number>;
  drives: DriveComponent[];
  driveQuantities: Record<string, number>;
  motors: Motor[];
  motorQuantities: Record<string, number>;
  measuringSystems: MeasuringSystem[];
  hmiComponents: HmiComponent[];
  safetyFunctions: SafetyFunction[];
  cables: CableAccessory[];
  totalAxes: number;
  totalChannels: number;
  warnings: CompatibilityWarning[];
  notes: string[];
  estimatedComplexity: "basic" | "standard" | "advanced" | "complex";
}

// --- AI Message ---
export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// --- Wizard Step ---
// Four steps: describe → AI analysis (skipped for templates) → configure →
// bill of materials. Previously a separate "review" step duplicated the
// summary BOM without the export actions; merged into "summary".
export type WizardStep =
  | "description"
  | "analysis"
  | "configuration"
  | "summary";

export const WIZARD_STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: "description", label: "Describe", number: 1 },
  { key: "analysis", label: "Analyze", number: 2 },
  { key: "configuration", label: "Configure", number: 3 },
  { key: "summary", label: "Bill of materials", number: 4 },
];
