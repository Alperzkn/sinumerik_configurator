import { selectSpindleMotor, type SpindleSelection } from "./spindle-sizing";
import { selectFeedMotor, type FeedSelection } from "./feed-sizing";
import type { MachineType } from "@/types/catalog";

export { selectSpindleMotor, selectFeedMotor };
export type { SpindleSelection, FeedSelection };

export interface UserSpecsInput {
  /** User-entered spindle power in kW (optional) */
  spindlePowerKw?: number;
  /** User-entered required spindle max speed in rpm (optional) */
  spindleMaxRpm?: number;
  /** User-entered moving mass per axis in kg (optional) */
  movingMassKg?: number;
  /** User-entered rapid traverse in m/min (optional) */
  rapidTraverseMpm?: number;
  /** Machine size class used to derive defaults if numbers are missing */
  machineSize?: "small" | "medium" | "large" | "very_large" | "";
  /** Primary workpiece material — influences speed/power mix defaults */
  material?: string;
  /** "" = default PP 72/48 for NCU, "pp_72_48", "et200sp", or "none" */
  ioModule?: string;
  /** "" | "none" | "ht2" | "ht10" */
  handheldUnit?: string;
  /** Preferred motor/encoder cable length in meters (default 10) */
  cableLengthMeters?: string;
}

export interface SizedSelection {
  spindle: SpindleSelection | null;
  feed: FeedSelection | null;
  /** True if any requirement was derived from defaults (machineSize) rather than user input */
  derivedFromDefaults: {
    spindlePower: boolean;
    spindleSpeed: boolean;
    movingMass: boolean;
    rapidTraverse: boolean;
  };
  /** Assumptions surfaced to the user (so they know what defaults were applied) */
  assumptions: string[];
}

/**
 * Defaults by machine size class. Applied only when user hasn't provided a
 * number. Values are conservative mid-range estimates and are always
 * surfaced as assumptions so the user can correct them.
 */
const DEFAULTS_BY_SIZE: Record<
  "small" | "medium" | "large" | "very_large",
  { spindleKw: number; spindleRpm: number; massKg: number; rapidMpm: number }
> = {
  small:      { spindleKw: 7.5,  spindleRpm: 6000,  massKg: 150,  rapidMpm: 30 },
  medium:     { spindleKw: 11,   spindleRpm: 8000,  massKg: 350,  rapidMpm: 40 },
  large:      { spindleKw: 22,   spindleRpm: 8000,  massKg: 1000, rapidMpm: 30 },
  very_large: { spindleKw: 45,   spindleRpm: 6000,  massKg: 2500, rapidMpm: 20 },
};

/**
 * Template-level defaults (used when machineSize is empty).
 * Values reflect typical machines of each type.
 */
const DEFAULTS_BY_TEMPLATE: Partial<Record<
  MachineType,
  { spindleKw: number; spindleRpm: number; massKg: number; rapidMpm: number }
>> = {
  "3axis_mill": { spindleKw: 11, spindleRpm: 8000, massKg: 350, rapidMpm: 40 },
  "5axis_mill": { spindleKw: 22, spindleRpm: 12000, massKg: 500, rapidMpm: 50 },
  "cnc_lathe":  { spindleKw: 15, spindleRpm: 4000, massKg: 200, rapidMpm: 30 },
  "mill_turn":  { spindleKw: 22, spindleRpm: 6000, massKg: 400, rapidMpm: 40 },
  "grinding":   { spindleKw: 7.5, spindleRpm: 6000, massKg: 250, rapidMpm: 20 },
  "laser":      { spindleKw: 3.7, spindleRpm: 3000, massKg: 200, rapidMpm: 100 },
  "punching":   { spindleKw: 7.5, spindleRpm: 3000, massKg: 300, rapidMpm: 80 },
  "robot":      { spindleKw: 3.7, spindleRpm: 3000, massKg: 100, rapidMpm: 60 },
};

export interface SizingInput {
  userSpecs: UserSpecsInput;
  template: MachineType | null;
  /** Whether AI-determined machine calls for high-speed spindle (e.g., mold making, HSC) */
  preferHighSpeedSpindle?: boolean;
}

export function sizeConfiguration(input: SizingInput): SizedSelection {
  const { userSpecs, template } = input;
  const assumptions: string[] = [];

  // Pick defaults: machineSize > template > generic medium
  const sizeKey = userSpecs.machineSize as
    | "small"
    | "medium"
    | "large"
    | "very_large"
    | undefined;
  const defaults =
    (sizeKey && DEFAULTS_BY_SIZE[sizeKey]) ??
    (template ? DEFAULTS_BY_TEMPLATE[template] : undefined) ??
    DEFAULTS_BY_SIZE.medium;

  const derivedFromDefaults = {
    spindlePower: false,
    spindleSpeed: false,
    movingMass: false,
    rapidTraverse: false,
  };

  let spindleKw = userSpecs.spindlePowerKw;
  if (spindleKw === undefined || spindleKw <= 0) {
    spindleKw = defaults.spindleKw;
    derivedFromDefaults.spindlePower = true;
    assumptions.push(
      `Spindle power not provided — assumed ${spindleKw} kW based on machine class.`
    );
  }

  let spindleRpm = userSpecs.spindleMaxRpm;
  if (spindleRpm === undefined || spindleRpm <= 0) {
    spindleRpm = defaults.spindleRpm;
    derivedFromDefaults.spindleSpeed = true;
    assumptions.push(
      `Spindle max speed not provided — assumed ${spindleRpm} rpm based on machine class.`
    );
  }

  let massKg = userSpecs.movingMassKg;
  if (massKg === undefined || massKg <= 0) {
    massKg = defaults.massKg;
    derivedFromDefaults.movingMass = true;
    assumptions.push(
      `Moving mass per axis not provided — assumed ${massKg} kg based on machine class.`
    );
  }

  let rapidMpm = userSpecs.rapidTraverseMpm;
  if (rapidMpm === undefined || rapidMpm <= 0) {
    rapidMpm = defaults.rapidMpm;
    derivedFromDefaults.rapidTraverse = true;
    assumptions.push(
      `Rapid traverse not provided — assumed ${rapidMpm} m/min based on machine class.`
    );
  }

  // Determine if we should prefer sync spindle (high-speed / high-precision):
  // - Explicit signal from AI architecture
  // - Required rpm > 10000 (async 1PH8 tops out ~8000-9000 for most sizes)
  // - 5-axis mill template often implies HSC
  const preferSync =
    input.preferHighSpeedSpindle ||
    spindleRpm > 10000 ||
    template === "5axis_mill";

  // Skip spindle selection entirely for machines that don't have a traditional
  // rotary spindle (laser, robot, punching have external/linear actuators).
  const skipSpindle =
    template === "laser" || template === "robot" || template === "punching";

  const spindle = skipSpindle
    ? null
    : selectSpindleMotor({
        requiredPowerKw: spindleKw,
        requiredMaxRpm: spindleRpm,
        preferSync,
      });

  const feed = selectFeedMotor({
    movingMassKg: massKg,
    rapidTraverseMpm: rapidMpm,
    axisKind: userSpecs.machineSize === "very_large" ? "gantry" : "horizontal",
  });

  return {
    spindle,
    feed,
    derivedFromDefaults,
    assumptions,
  };
}
