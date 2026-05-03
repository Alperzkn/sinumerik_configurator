// ============================================================
// SINUMERIK ONE Catalog Data Types
// Based on Siemens NC63 Catalog, January 2026
// ============================================================

export type ControlUnitVariant = "PPU_1740" | "NCU_1740" | "NCU_1750" | "NCU_1760";

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
  name: string;
  articleNumber: string;
  formFactor: "panel_based" | "cabinet_based";
  displaySize?: string;
  maxAxesSpindles: number;
  maxAxesSpindlesCncPlusPLC: number;
  maxChannels: number;
  maxModeGroups: number;
  driveCliqPorts: number;
  maxNX: number;
  maxCombi: number;
  baseChannels: number;
  plcMemory: { programMB: number; dataMB: number };
  cncUserMemoryMB: number;
  blockChangeTimeMs: number;
  maxLinearInterpolatingAxes: number;
  exportVersionAvailable: boolean;
  description: string;
}

// --- CNC Software ---
export interface CncSoftware {
  id: string;
  articleNumber: string;
  variant: SoftwareVariant;
  swVersion: string;
  spLevel?: string;
  deliveryFormat: DeliveryFormat;
  languages: string[];
  compatibility: Record<ControlUnitVariant, Availability>;
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
  orderCode: string;
  articleNumber: string;
  name: string;
  description: string;
  category: OptionCategory;
  compatibility: Record<ControlUnitVariant, Availability>;
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
  compatibility: Record<ControlUnitVariant, Availability>;
  exportAvailable: boolean;
  requirements?: string[];
  recommendedFor: MachineType[];
}

// --- Drive Components ---
export type DriveFamily =
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
  compatibility: Record<ControlUnitVariant, Availability>;
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
  compatibility: Record<ControlUnitVariant, Availability>;
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
  compatibility: Record<ControlUnitVariant, Availability>;
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
  articleNumber: string;
  name: string;
  category: HmiCategory;
  screenSize?: number;
  resolution?: string;
  compatibility: Record<ControlUnitVariant, Availability>;
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
  compatibility: Record<ControlUnitVariant, Availability>;
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
export interface BomItem {
  articleNumber: string;
  name: string;
  quantity: number;
  orderCode?: string;
  category: string;
}

// --- Generated Configuration (output of AI) ---
export interface GeneratedConfiguration {
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
