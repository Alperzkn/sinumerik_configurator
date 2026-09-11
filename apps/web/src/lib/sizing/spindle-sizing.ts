import { MOTOR_SPECS, motorPlatform, type DrivePlatform, type MotorSpecs } from "@/lib/validation/drive-system-rules";

export interface SpindleRequirement {
  /** Required rated power in kW */
  requiredPowerKw: number;
  /** Required max rpm the spindle must reach */
  requiredMaxRpm: number;
  /** Optional preference for drive type: sync for high-speed/high-precision, async for general */
  preferSync?: boolean;
  /**
   * Restrict candidate set to a specific motor family (case-insensitive
   * substring match against MotorSpecs.family — e.g. "1PH8", "1PH3").
   * Falls back to the full catalog if the hint yields no matches that
   * meet the power / speed requirements.
   */
  familyHint?: string;
  /** Drive platforms allowed for this control system (default: all). */
  platforms?: DrivePlatform[];
}

export interface SpindleSelection {
  article: string;
  specs: MotorSpecs;
  /** Power margin vs requirement, e.g. 1.3 = 30% over-sized (good headroom) */
  powerMargin: number;
  /** Speed margin vs requirement */
  speedMargin: number;
  /** True if the selection fully meets power AND max-speed requirements */
  meetsRequirements: boolean;
  /** Explanation for UI */
  reason: string;
  /** Warnings to surface to the user if the selection is suboptimal */
  warnings: string[];
}

function parseKw(s: string): number {
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function parseRpm(s: string): number {
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Deterministic spindle motor selection.
 *
 * Algorithm:
 *   1. Filter 1PH8 entries (async + sync) by kind.
 *   2. Keep only those where ratedPower >= requiredPower AND maxSpeed >= requiredRpm.
 *   3. If sync preference: prefer sync variants; if none, fall back to async.
 *   4. Sort by ratedPower ASC and pick smallest (cost-optimal).
 *   5. If no candidate meets both, pick the one closest to requirements
 *      and emit warnings.
 */
export function selectSpindleMotor(req: SpindleRequirement): SpindleSelection {
  const warnings: string[] = [];

  const allSpindles = Object.entries(MOTOR_SPECS).filter(
    ([, s]) =>
      (s.kind === "spindle_async" || s.kind === "spindle_sync") &&
      (!req.platforms || req.platforms.includes(motorPlatform(s)))
  );

  // Defensive: missing inputs → pick a mid-range placeholder, no warnings.
  // Caller (sizing/index.ts) shows one consolidated "fill in specs" banner.
  if (
    !Number.isFinite(req.requiredPowerKw) || req.requiredPowerKw <= 0 ||
    !Number.isFinite(req.requiredMaxRpm) || req.requiredMaxRpm <= 0
  ) {
    const sorted = [...allSpindles].sort(
      ([, a], [, b]) => parseKw(a.ratedPower) - parseKw(b.ratedPower)
    );
    const [article, specs] = sorted[Math.floor(sorted.length / 2)] ?? sorted[0];
    return {
      article,
      specs,
      powerMargin: 1,
      speedMargin: 1,
      meetsRequirements: false,
      reason: "Mid-range placeholder — spindle power / max RPM not provided.",
      warnings: [],
    };
  }

  const fullyQualified = allSpindles.filter(([, s]) => {
    const p = parseKw(s.ratedPower);
    const maxRpm = parseRpm(s.maxSpeed);
    return p >= req.requiredPowerKw && maxRpm >= req.requiredMaxRpm;
  });

  let pool = fullyQualified;

  // User asked for a specific family — narrow if any qualified candidates
  // remain; otherwise fall back to all qualified (and warn).
  if (req.familyHint) {
    const hint = req.familyHint.toLowerCase();
    const familyPool = pool.filter(([, s]) => s.family.toLowerCase().includes(hint));
    if (familyPool.length > 0) {
      pool = familyPool;
    } else if (allSpindles.some(([, s]) => s.family.toLowerCase().includes(hint))) {
      warnings.push(
        `No ${req.familyHint} spindle motor meets ${req.requiredPowerKw} kW @ ${req.requiredMaxRpm} rpm — falling back to other families.`
      );
    }
  }

  if (req.preferSync) {
    const sync = pool.filter(([, s]) => s.kind === "spindle_sync");
    if (sync.length > 0) pool = sync;
  }

  if (pool.length > 0) {
    // Smallest motor that satisfies both constraints
    pool.sort(([, a], [, b]) => parseKw(a.ratedPower) - parseKw(b.ratedPower));
    const [article, specs] = pool[0];
    const powerMargin = parseKw(specs.ratedPower) / req.requiredPowerKw;
    const speedMargin = parseRpm(specs.maxSpeed) / req.requiredMaxRpm;
    return {
      article,
      specs,
      powerMargin,
      speedMargin,
      meetsRequirements: true,
      reason: `Smallest ${specs.family} ${specs.variant} that meets both ${req.requiredPowerKw} kW and ${req.requiredMaxRpm} rpm.`,
      warnings,
    };
  }

  // No full match — degrade gracefully.
  // Split: can we meet power alone? can we meet speed alone?
  const meetsPower = allSpindles.filter(
    ([, s]) => parseKw(s.ratedPower) >= req.requiredPowerKw
  );
  const meetsSpeed = allSpindles.filter(
    ([, s]) => parseRpm(s.maxSpeed) >= req.requiredMaxRpm
  );

  // Prefer the candidate that meets power (torque/kW is harder to work around
  // than speed — speed can be increased via gearbox, power cannot).
  const fallbackPool = meetsPower.length > 0 ? meetsPower : meetsSpeed;

  if (fallbackPool.length === 0) {
    // Last resort: biggest motor we have.
    allSpindles.sort(([, a], [, b]) => parseKw(b.ratedPower) - parseKw(a.ratedPower));
    const [article, specs] = allSpindles[0];
    warnings.push(
      `Requirements (${req.requiredPowerKw} kW @ ${req.requiredMaxRpm} rpm) exceed the SINAMICS S120 1PH8 catalog. Selected the largest available motor; consider a motor spindle (1FE1/1FE2 built-in) or external spindle drive.`
    );
    return {
      article,
      specs,
      powerMargin: parseKw(specs.ratedPower) / req.requiredPowerKw,
      speedMargin: parseRpm(specs.maxSpeed) / req.requiredMaxRpm,
      meetsRequirements: false,
      reason: "Beyond catalog range — largest 1PH8 selected as placeholder.",
      warnings,
    };
  }

  fallbackPool.sort(([, a], [, b]) => {
    // Prefer smallest that still covers the MET dimension
    return parseKw(a.ratedPower) - parseKw(b.ratedPower);
  });

  const [article, specs] = fallbackPool[0];
  const powerMargin = parseKw(specs.ratedPower) / req.requiredPowerKw;
  const speedMargin = parseRpm(specs.maxSpeed) / req.requiredMaxRpm;

  if (powerMargin < 1) {
    warnings.push(
      `No 1PH8 motor reaches ${req.requiredPowerKw} kW at ${req.requiredMaxRpm} rpm. Selected ${article} (${specs.ratedPower}) which is UNDER-RATED on power. Consider a larger motor or motor spindle.`
    );
  }
  if (speedMargin < 1) {
    warnings.push(
      `No 1PH8 motor with maxSpeed ≥ ${req.requiredMaxRpm} rpm at this power level. Selected ${article} (max ${specs.maxSpeed}). For higher rpm, consider a high-speed motor spindle (1FE1/1FE2).`
    );
  }

  return {
    article,
    specs,
    powerMargin,
    speedMargin,
    meetsRequirements: false,
    reason: `Best-fit from catalog — exact requirements not achievable with standard 1PH8.`,
    warnings,
  };
}
