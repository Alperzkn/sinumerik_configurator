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
  | "handwheel";

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
export type WizardStep =
  | "description"
  | "analysis"
  | "configuration"
  | "review"
  | "summary";

export const WIZARD_STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: "description", label: "Describe Machine", number: 1 },
  { key: "analysis", label: "AI Analysis", number: 2 },
  { key: "configuration", label: "Configuration", number: 3 },
  { key: "review", label: "Review", number: 4 },
  { key: "summary", label: "Summary", number: 5 },
];
