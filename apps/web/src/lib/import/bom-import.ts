/**
 * Import an existing bill of materials (rows of article number + qty)
 * into a GeneratedConfiguration by matching every article against the
 * local Siemens catalog data. Unmatched rows are reported, never guessed.
 *
 * Input rows come from the same parser the 808D converter uses
 * (`lib/convert-808d/parser.ts`), so paste and xlsx upload both work.
 */

import type {
  CncSoftware,
  ControlUnit,
  DriveComponent,
  GeneratedConfiguration,
  HmiComponent,
  Motor,
  SafetyFunction,
  SoftwareOption,
  TechnologyPackage,
} from "@/types/catalog";
import type { InputRow } from "@/lib/convert-808d/types";
import { cablesCatalog, safetyFunctions, technologyPackages } from "@/data";
import { catalogBundle } from "@/data/catalog-bundle";
const { controlUnits, cncSoftware: cncSoftwareOptions, softwareOptions, driveComponents, hmiComponents } = catalogBundle;
import {
  MOTOR_MODULE_SPECS,
  S210_CONVERTER_SPECS,
  getLineModuleByArticle,
  getLineModuleForInterfaceModule,
  getMotorSpecs,
} from "@/lib/validation/drive-system-rules";
import { runCompatibilityRules } from "@/data/compatibility-rules";

export interface BomImportResult {
  configuration: GeneratedConfiguration;
  /** Rows that mapped to a catalog entry. */
  matched: number;
  /** Rows with no catalog match (kept so the UI can show them). */
  unmatched: InputRow[];
  /** Human-readable notes about assumptions made during import. */
  notes: string[];
}

const ALL_OPTION = { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" } as const;

/** Article without any "-Z …" order-option suffix, upper-cased. */
function base(article: string): string {
  return article.toUpperCase().split("-Z")[0].trim();
}

function motorFromSpecs(article: string, kind: "feed" | "spindle"): Motor {
  const specs = getMotorSpecs(article);
  const isSpindle = kind === "spindle";
  return {
    id: isSpindle ? "spindle-motor" : "feed-motor",
    family: isSpindle ? "SIMOTICS_M" : "SIMOTICS_S",
    series: article.substring(0, 5),
    name: `${specs?.family || (isSpindle ? "Spindle motor" : "Servo motor")} SH${specs?.shaftHeight ?? "?"}`,
    articleNumber: article,
    motorType: isSpindle
      ? specs?.kind === "spindle_sync"
        ? "main_spindle_sync"
        : "main_spindle_async"
      : "feed_servo_sync",
    connectionType: "standard",
    compatibility: ALL_OPTION,
    description: `${specs?.family || ""} ${specs?.variant || ""}`.trim() || "Imported motor",
    shaftHeight: specs?.shaftHeight,
    ratedPower: specs?.ratedPower,
    ratedTorque: specs?.ratedTorque,
    ratedSpeed: specs?.ratedSpeed,
    maxTorque: specs?.maxTorque,
    maxSpeed: specs?.maxSpeed,
    ratedCurrent: specs?.ratedCurrent,
    mlfbCompleteness: /-[0-9][A-Z0-9]{3}$/.test(article) ? "verified" : "trunk-only",
  };
}

export function importBomRows(rows: InputRow[]): BomImportResult {
  const notes: string[] = [];
  const unmatched: InputRow[] = [];
  let matched = 0;

  let controlUnit: ControlUnit | undefined;
  let cncSoftware: CncSoftware | undefined;
  const packages: TechnologyPackage[] = [];
  const options: SoftwareOption[] = [];
  const optionQuantities: Record<string, number> = {};
  const safety: SafetyFunction[] = [];
  const hmi: HmiComponent[] = [];
  const drives: DriveComponent[] = [];
  const driveQuantities: Record<string, number> = {};
  const motors: Motor[] = [];
  const motorQuantities: Record<string, number> = {};
  const cables: GeneratedConfiguration["cables"] = [];

  const pushDrive = (d: DriveComponent, qty: number) => {
    const existing = drives.find((x) => x.id === d.id);
    if (existing) {
      driveQuantities[d.id] = (driveQuantities[d.id] || 0) + qty;
    } else {
      drives.push(d);
      driveQuantities[d.id] = qty;
    }
  };

  let motorModuleCount = 0;

  for (const r of rows) {
    const art = base(r.mlfb);
    const qty = Math.max(1, r.qty);

    const cu = controlUnits.find((c) => c.articleNumber.toUpperCase() === art);
    if (cu) {
      if (controlUnit && controlUnit.id !== cu.id) notes.push(`Several control units listed — kept ${cu.name}.`);
      controlUnit = cu;
      matched++;
      continue;
    }
    const sw = cncSoftwareOptions.find((c) => c.articleNumber.toUpperCase() === art);
    if (sw) {
      cncSoftware = sw;
      matched++;
      continue;
    }
    const pkg = technologyPackages.find((p) => p.articleNumber.toUpperCase() === art);
    if (pkg) {
      if (!packages.some((p) => p.id === pkg.id)) packages.push(pkg);
      matched++;
      continue;
    }
    const opt = softwareOptions.find((o) => o.articleNumber.toUpperCase() === art);
    if (opt) {
      if (!options.some((o) => o.id === opt.id)) options.push(opt);
      optionQuantities[opt.id] = (optionQuantities[opt.id] || 0) + qty;
      matched++;
      continue;
    }
    const sf = safetyFunctions.find(
      (s) => s.articleNumber?.toUpperCase() === art || (s.orderCode && s.orderCode.toUpperCase() === art),
    );
    if (sf) {
      if (!safety.some((s) => s.id === sf.id)) safety.push(sf);
      matched++;
      continue;
    }
    const h = hmiComponents.find((x) => x.articleNumber.toUpperCase() === art);
    if (h) {
      if (!hmi.some((x) => x.id === h.id)) hmi.push(h);
      matched++;
      continue;
    }

    // Drives — motor modules / S210 converters / line + interface modules / catalog drives
    const mm = MOTOR_MODULE_SPECS[art];
    const s210 = S210_CONVERTER_SPECS[art];
    if (mm || s210) {
      // First distinct motor module is treated as the feed module, the
      // second as the spindle module — the user can swap them afterwards.
      const kind = motorModuleCount === 0 ? "feed" : "spindle";
      motorModuleCount++;
      pushDrive(
        {
          id: `${kind}-mm-${art}`,
          articleNumber: art,
          name: s210 ? `SINAMICS S210 converter ${s210.frame} ${s210.voltage}` : `Motor Module ${art}`,
          driveFamily: s210 ? "S210" : "S120_booksize",
          componentType: "motor_module_single",
          ratedCurrent: mm ? `${mm.current}A` : undefined,
          ratedPower: mm ? `${mm.power}kW` : s210 ? `${s210.power}kW` : undefined,
          frameType: s210?.frame,
          compatibility: ALL_OPTION,
          description: mm
            ? `Single Motor Module booksize | ${mm.current}A rated | ${mm.power}kW | ${mm.voltage}`
            : `Single-axis servo converter with integrated infeed | ${s210?.power}kW | ${s210?.voltage}`,
        },
        qty,
      );
      matched++;
      continue;
    }
    const lm = getLineModuleByArticle(art);
    if (lm) {
      pushDrive(
        {
          id: `line-module-${art}`,
          articleNumber: art,
          name: lm.name,
          driveFamily: "S120_booksize",
          componentType: lm.type === "active" ? "line_module_active" : lm.type === "basic" ? "line_module_basic" : "line_module_smart",
          ratedPower: `${lm.ratedPower}kW`,
          compatibility: ALL_OPTION,
          description: `Shared DC bus power supply — ${lm.ratedPower}kW rated`,
        },
        qty,
      );
      matched++;
      continue;
    }
    if (getLineModuleForInterfaceModule(art)) {
      pushDrive(
        {
          id: `interface-module-${art}`,
          articleNumber: art,
          name: "Active Interface Module",
          driveFamily: "S120_booksize",
          componentType: "interface_module",
          compatibility: ALL_OPTION,
          description: "Required for Active Line Module operation (Clean Power Filter)",
        },
        qty,
      );
      matched++;
      continue;
    }
    const dc = driveComponents.find((d) => d.articleNumber.toUpperCase() === art);
    if (dc) {
      pushDrive(dc, qty);
      matched++;
      continue;
    }

    // Motors
    const specs = getMotorSpecs(art);
    if (specs) {
      const isSpindle = specs.kind !== "feed_servo" && specs.kind !== "linear" && specs.kind !== "torque";
      const motor = motorFromSpecs(art, isSpindle ? "spindle" : "feed");
      if (motors.some((m) => m.id === motor.id)) {
        // A second motor of the same role: keep it as an extra row.
        motor.id = `${motor.id}-${motors.length + 1}`;
      }
      motors.push(motor);
      motorQuantities[motor.id] = qty;
      matched++;
      continue;
    }

    // Cables
    const cable = cablesCatalog.find((c) => c.articleNumber.toUpperCase() === art);
    if (cable) {
      const existing = cables.find((c) => c.id === cable.id);
      if (existing) existing.quantity += qty;
      else cables.push({ ...cable, quantity: qty });
      matched++;
      continue;
    }

    unmatched.push(r);
  }

  if (!controlUnit) {
    controlUnit = controlUnits.find((c) => c.id === "NCU_1740") ?? controlUnits[0];
    notes.push(`No control unit in the list — ${controlUnit.name} assumed.`);
  }
  if (!cncSoftware) {
    const cuId = controlUnit.id;
    cncSoftware =
      cncSoftwareOptions.find((s) => s.variant === "export" && s.compatibility[cuId] !== "not_available") ??
      cncSoftwareOptions[0];
    notes.push(`No CNC software in the list — ${cncSoftware.description} assumed.`);
  }

  const feedMotor = motors.find((m) => m.motorType === "feed_servo_sync");
  const spindleMotors = motors.filter((m) => m.motorType !== "feed_servo_sync");
  const feedAxes = feedMotor ? motorQuantities[feedMotor.id] || 0 : 0;
  const spindles = spindleMotors.reduce((n, m) => n + (motorQuantities[m.id] || 0), 0);

  if (unmatched.length) {
    notes.push(
      `${unmatched.length} line(s) had no catalog match and were left out: ${unmatched
        .slice(0, 8)
        .map((u) => u.mlfb)
        .join(", ")}${unmatched.length > 8 ? ", …" : ""}.`,
    );
  }

  const configuration: GeneratedConfiguration = {
    controlUnit,
    cncSoftware,
    softwareVariant: cncSoftware.variant,
    technologyPackages: packages,
    softwareOptions: options,
    optionQuantities,
    drives,
    driveQuantities,
    motors,
    motorQuantities,
    measuringSystems: [],
    hmiComponents: hmi,
    safetyFunctions: safety,
    cables,
    totalAxes: feedAxes + spindles,
    totalChannels: 1,
    warnings: [],
    notes: [`Imported from an existing bill of materials (${matched} of ${rows.length} lines matched the catalog).`, ...notes],
    estimatedComplexity: "standard",
  };
  configuration.warnings = runCompatibilityRules(configuration, []);

  return { configuration, matched, unmatched, notes };
}
