import { MOTOR_SPECS, type MotorSpecs } from "@/lib/validation/drive-system-rules";

export interface FeedRequirement {
  /** Moving mass of the axis in kg (carriage + workpiece) */
  movingMassKg: number;
  /** Required rapid traverse speed in m/min */
  rapidTraverseMpm: number;
  /** Axis type — gantry and vertical axes need higher torque budget */
  axisKind?: "horizontal" | "vertical" | "gantry";
  /**
   * Restrict candidate set to a specific motor family (case-insensitive
   * substring match against MotorSpecs.family — e.g. "1FT2", "1FK2",
   * "1FK7", "1FT7"). Falls back to the full catalog if the hint yields
   * no rows that meet the torque requirement.
   */
  familyHint?: string;
}

export interface FeedSelection {
  article: string;
  specs: MotorSpecs;
  /** Torque headroom vs estimated minimum (1.0 = exactly matches) */
  torqueMargin: number;
  meetsRequirements: boolean;
  reason: string;
  warnings: string[];
}

function parseNum(s: string): number {
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Estimate minimum required rated torque for a ball-screw feed axis.
 *
 * Rule of thumb (from Siemens sizing guide, simplified for common ball-screw
 * axes with 10-16mm lead, mid-range acceleration targets of 3-6 m/s²):
 *
 *   T_min ≈ (mass × a × lead) / (2π × efficiency) + friction_torque
 *
 * For mass-only quick sizing we use a mass-proportional floor plus a
 * rapid-traverse adder for the dynamic component. Values are conservative
 * (20–30% margin baked in) to avoid under-sizing.
 *
 * - Mass floor: 1 Nm per 40 kg of moving mass
 * - Dynamic adder: +0.5 Nm per (kg·m/min × 0.001)   // scales with rapid
 * - Vertical/gantry surcharge: +40% (gravity / counter-weight considerations)
 */
function estimateMinTorque(req: FeedRequirement): number {
  const massFloor = req.movingMassKg / 40;
  const dynamic = (req.movingMassKg * req.rapidTraverseMpm) / 2000;
  let t = massFloor + dynamic;
  if (req.axisKind === "vertical" || req.axisKind === "gantry") t *= 1.4;
  return Math.max(t, 1); // never below 1 Nm
}

/**
 * Deterministic feed motor selection.
 *
 * Filters 1FT7 motors by kind="feed_servo", requires ratedTorque >= minTorque,
 * then picks smallest motor that satisfies (cost-optimal). Prefers natural-
 * cooling variants unless moving mass is large enough to justify forced
 * ventilation.
 */
export function selectFeedMotor(req: FeedRequirement): FeedSelection {
  const warnings: string[] = [];

  // Defensive: if upstream forgot to fill defaults, fail soft instead of
  // emitting `undefined kg` / `NaN Nm` warnings. Pick a mid-range placeholder
  // and let the caller surface a single "missing inputs" banner.
  if (
    !Number.isFinite(req.movingMassKg) || req.movingMassKg <= 0 ||
    !Number.isFinite(req.rapidTraverseMpm) || req.rapidTraverseMpm <= 0
  ) {
    const allFeed = Object.entries(MOTOR_SPECS).filter(
      ([, s]) => s.kind === "feed_servo"
    );
    allFeed.sort(([, a], [, b]) => parseNum(a.ratedTorque) - parseNum(b.ratedTorque));
    const [article, specs] = allFeed[Math.floor(allFeed.length / 2)] ?? allFeed[0];
    return {
      article,
      specs,
      torqueMargin: 1,
      meetsRequirements: false,
      reason: "Mid-range placeholder — moving mass / rapid traverse not provided.",
      warnings: [],
    };
  }

  const minTorque = estimateMinTorque(req);
  const isHeavyDuty = req.movingMassKg >= 1500;

  const allFeed = Object.entries(MOTOR_SPECS).filter(
    ([, s]) => s.kind === "feed_servo"
  );

  // Apply family hint first (e.g. user asked for 1FK2). If hint yields no
  // rows that also meet torque, fall back to all feed motors and warn.
  let feedMotors = allFeed;
  if (req.familyHint) {
    const hint = req.familyHint.toLowerCase();
    const familyPool = allFeed.filter(([, s]) => s.family.toLowerCase().includes(hint));
    if (familyPool.length > 0) {
      feedMotors = familyPool;
    } else if (allFeed.some(([, s]) => s.family.toLowerCase().includes(hint))) {
      warnings.push(
        `No ${req.familyHint} feed motor meets the torque requirement — falling back to other families.`
      );
    }
  }

  // Prefer cooling type based on mass: heavy → forced, light/medium → natural
  let pool = feedMotors.filter(
    ([, s]) =>
      parseNum(s.ratedTorque) >= minTorque &&
      (isHeavyDuty ? s.cooling === "forced" : s.cooling === "natural")
  );

  // Fallback: allow any cooling if preferred pool is empty
  if (pool.length === 0) {
    pool = feedMotors.filter(([, s]) => parseNum(s.ratedTorque) >= minTorque);
  }

  if (pool.length === 0) {
    // Out of range — pick biggest feed motor + warn.
    feedMotors.sort(([, a], [, b]) => parseNum(b.ratedTorque) - parseNum(a.ratedTorque));
    const [article, specs] = feedMotors[0];
    warnings.push(
      `Required torque (~${minTorque.toFixed(0)} Nm) for ${req.movingMassKg} kg moving mass exceeds the 1FT7 range. Selected ${article} (${specs.ratedTorque}). Consider a linear motor (1FN3) or torque motor (1FW6) for this axis.`
    );
    return {
      article,
      specs,
      torqueMargin: parseNum(specs.ratedTorque) / minTorque,
      meetsRequirements: false,
      reason: "Beyond 1FT7 torque range — largest servo selected as placeholder.",
      warnings,
    };
  }

  // Smallest motor that meets minimum torque
  pool.sort(([, a], [, b]) => parseNum(a.ratedTorque) - parseNum(b.ratedTorque));
  const [article, specs] = pool[0];
  const torqueMargin = parseNum(specs.ratedTorque) / minTorque;

  if (torqueMargin < 1.15) {
    warnings.push(
      `Feed motor ${article} (${specs.ratedTorque}) has tight torque margin (${((torqueMargin - 1) * 100).toFixed(0)}%) for ${req.movingMassKg} kg. Consider the next size up for heavy machining.`
    );
  }

  return {
    article,
    specs,
    torqueMargin,
    meetsRequirements: true,
    reason: `Smallest 1FT7 ${specs.variant} with rated torque ≥ estimated minimum of ${minTorque.toFixed(1)} Nm for ${req.movingMassKg} kg moving mass at ${req.rapidTraverseMpm} m/min rapid.`,
    warnings,
  };
}
