import { selectSpindleMotor, type SpindleSelection } from "./spindle-sizing";
import { selectFeedMotor, type FeedSelection } from "./feed-sizing";
import type { ControlSystemFamily, MachineType } from "@/types/catalog";
import type { DrivePlatform } from "@/lib/validation/drive-system-rules";

/** Drive platforms each control system can be configured with. */
export function platformsForFamily(family: ControlSystemFamily | undefined): DrivePlatform[] {
  switch (family) {
    case "828d_smart":
      return ["S200"];
    case "828d":
      return ["S120"];
    default:
      return ["S120", "S210"];
  }
}

export { selectSpindleMotor, selectFeedMotor };
export type { SpindleSelection, FeedSelection };

export interface UserSpecsInput {
  /** Explicit number of servo feed axes; overrides the template / AI count. */
  feedAxisCount?: number;
  /** Explicit number of main spindles; overrides the template / AI count. */
  spindleCount?: number;
  /** User-entered spindle power in kW (optional) */
  spindlePowerKw?: number;
  /** Feed-motor rated power the user asked for (kW) — a floor for the selection. */
  feedPowerKw?: number;
  /** User-entered required spindle max speed in rpm (optional) */
  spindleMaxRpm?: number;
  /** User-entered moving mass per axis in kg (optional) */
  movingMassKg?: number;
  /** User-entered rapid traverse in m/min (optional) */
  rapidTraverseMpm?: number;
  /**
   * Free-text axis travel string (e.g. "1500", "X1500×Y1200×Z800",
   * "X 2000 Y 1500"). Used as a fallback hint for machine-size class
   * when the explicit `machineSize` selector wasn't picked — the
   * sizing engine extracts the largest dimension from the string.
   */
  axisTravel?: string;
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
  /**
   * Required safety level. When set, overrides whatever safety options
   * the AI architecture (or template) defaulted to:
   *   "basic"    → no extended safety (STO/SS1/SBC hardware only)
   *   "extended" → S60 (F-PLC) + S61 (multi-axis monitoring)
   *   "full"     → S60 + S61 + per-axis K codes covering the axis count
   * Read in src/lib/ai/response-parser.ts (Safety section) where it
   * deterministically replaces raw.safety.options.
   */
  safetyLevel?: "basic" | "extended" | "full" | "";
  /**
   * Restrict feed motor selection to a specific family (substring match
   * against MotorSpecs.family, e.g. "1FT2", "1FK2", "1FK7", "1FT7").
   */
  feedMotorFamily?: string;
  /**
   * Restrict spindle motor selection to a specific family (e.g. "1PH8", "1PH3").
   */
  spindleMotorFamily?: string;
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
  "router":     { spindleKw: 7.5, spindleRpm: 18000, massKg: 150, rapidMpm: 40 },
};

export interface SizingInput {
  /** Control system — restricts motors to the drive platforms that system supports. */
  controlFamily?: ControlSystemFamily;
  userSpecs: UserSpecsInput;
  template: MachineType | null;
  /** Whether AI-determined machine calls for high-speed spindle (e.g., mold making, HSC) */
  preferHighSpeedSpindle?: boolean;
}

/**
 * Infer a machine-size class from a free-text axis-travel string. Pulls
 * the largest numeric token (in mm) and bins it. Used only as a
 * fallback when the user typed a travel value but didn't pick a size.
 */
function inferMachineSizeFromTravel(
  axisTravel: string | undefined
): "small" | "medium" | "large" | "very_large" | undefined {
  if (!axisTravel) return undefined;
  const matches = axisTravel.match(/(\d{2,5})/g);
  if (!matches || matches.length === 0) return undefined;
  const maxMm = Math.max(...matches.map((m) => parseInt(m, 10)));
  if (!Number.isFinite(maxMm) || maxMm <= 0) return undefined;
  if (maxMm >= 2000) return "very_large";
  if (maxMm >= 1500) return "large";
  if (maxMm >= 500) return "medium";
  return "small";
}

export function sizeConfiguration(input: SizingInput): SizedSelection {
  const { userSpecs, template } = input;
  const assumptions: string[] = [];

  // Pick defaults: machineSize > axisTravel-inferred > template > generic medium
  let sizeKey = userSpecs.machineSize as
    | "small"
    | "medium"
    | "large"
    | "very_large"
    | undefined;
  if (!sizeKey) {
    const inferred = inferMachineSizeFromTravel(userSpecs.axisTravel);
    if (inferred) {
      sizeKey = inferred;
      assumptions.push(
        `Machine size class inferred from axis travel (${userSpecs.axisTravel}) → ${inferred}.`
      );
    }
  }
  // SINUMERIK 828D / 828D Smart target compact standard machines: without a
  // size class, mass or travel, size them as a small machine so the default
  // lands on the S120 Combi (828D) or the S200 range (Smart).
  if (!sizeKey && (input.controlFamily === "828d" || input.controlFamily === "828d_smart") && !userSpecs.movingMassKg) {
    sizeKey = "small";
    assumptions.push(
      "SINUMERIK 828D targets compact standard machines — sized as a small machine class (table ≤ 500 mm, < 200 kg per axis). Pick a larger machine size or enter the moving mass for heavier axes."
    );
  }
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

  // Apply defaults silently — we'll consolidate into one banner at the end
  // rather than spamming four "assumed X based on machine class" notes.
  const isMissing = (n: number | undefined): n is undefined =>
    n === undefined || !Number.isFinite(n) || n <= 0;

  let spindleKw = userSpecs.spindlePowerKw;
  if (isMissing(spindleKw)) {
    spindleKw = defaults.spindleKw;
    derivedFromDefaults.spindlePower = true;
  }

  let spindleRpm = userSpecs.spindleMaxRpm;
  if (isMissing(spindleRpm)) {
    spindleRpm = defaults.spindleRpm;
    derivedFromDefaults.spindleSpeed = true;
  }

  let massKg = userSpecs.movingMassKg;
  if (isMissing(massKg)) {
    massKg = defaults.massKg;
    derivedFromDefaults.movingMass = true;
  }

  let rapidMpm = userSpecs.rapidTraverseMpm;
  if (isMissing(rapidMpm)) {
    rapidMpm = defaults.rapidMpm;
    derivedFromDefaults.rapidTraverse = true;
  }

  // Determine if we should prefer sync spindle (high-speed / high-precision):
  // - Explicit signal from AI architecture
  // - Required rpm > 10000 (async 1PH8 tops out ~8000-9000 for most sizes)
  // - 5-axis mill template often implies HSC
  // - Light / soft workpiece materials (aluminum, plastic, composite) are
  //   typically machined at higher RPM, so bias toward a sync spindle.
  const mat = (userSpecs.material || "").toLowerCase();
  const lightMaterial = /alumin|plastic|composite|wood|brass|copper/.test(mat);
  const preferSync =
    input.preferHighSpeedSpindle ||
    spindleRpm > 10000 ||
    template === "5axis_mill" ||
    lightMaterial;
  if (lightMaterial && !derivedFromDefaults.spindleSpeed) {
    assumptions.push(
      `Material "${userSpecs.material}" is typically high-speed-machined — biased toward synchronous spindle.`
    );
  }

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
        familyHint: userSpecs.spindleMotorFamily,
        platforms: platformsForFamily(input.controlFamily),
      });

  const feed = selectFeedMotor({
    movingMassKg: massKg,
    rapidTraverseMpm: rapidMpm,
    axisKind: userSpecs.machineSize === "very_large" ? "gantry" : "horizontal",
    familyHint: userSpecs.feedMotorFamily,
    minPowerKw: userSpecs.feedPowerKw,
    platforms: platformsForFamily(input.controlFamily),
    // 828D: the S120 Combi feed power units are 9 A — prefer motors that fit
    // when the mass / rapid inputs were only defaults.
    maxRatedCurrentA: input.controlFamily === "828d" && derivedFromDefaults.movingMass ? 9 : undefined,
  });

  // When ANY mechanical input was a default, the per-motor warnings
  // produced by select* are noise — they're comparing the catalog
  // against a placeholder, not the user's actual machine. Drop them and
  // emit ONE actionable banner that points the user back to the form.
  const missingFields: string[] = [];
  if (derivedFromDefaults.spindlePower) missingFields.push("spindle power (kW)");
  if (derivedFromDefaults.spindleSpeed) missingFields.push("spindle max RPM");
  if (derivedFromDefaults.movingMass) missingFields.push("moving mass (kg)");
  if (derivedFromDefaults.rapidTraverse) missingFields.push("rapid traverse (m/min)");

  // Only a motor whose OWN inputs were defaulted loses its warnings: a
  // spindle that cannot reach the user's stated rpm must still say so even
  // when the feed mass / rapid were assumed.
  if (feed && (derivedFromDefaults.movingMass || derivedFromDefaults.rapidTraverse)) feed.warnings = [];
  if (spindle && (derivedFromDefaults.spindlePower || derivedFromDefaults.spindleSpeed)) spindle.warnings = [];
  if (missingFields.length > 0) {
    assumptions.push(
      `Selected mid-range default motors. Fill in ${missingFields.join(
        " · ",
      )} on the previous step to size for your actual machine.`,
    );
  }

  return {
    spindle,
    feed,
    derivedFromDefaults,
    assumptions,
  };
}
