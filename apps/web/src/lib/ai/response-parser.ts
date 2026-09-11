import type {
  GeneratedConfiguration,
  ControlSystemFamily,
  ControlUnit,
  CncSoftware,
  TechnologyPackage,
  SoftwareOption,
  DriveComponent,
  Motor,
  MeasuringSystem,
  HmiComponent,
  SafetyFunction,
  CableAccessory,
  ControlUnitVariant,
  SoftwareVariant,
  CompatibilityWarning,
} from "@/types/catalog";
import type { AiRawResponse } from "./recommendation-engine";
import {
  selectLineModule,
  getMatchingMcp,
  isS200Converter,
  isSingleAxisConverter,
  MOTOR_MODULE_SPECS,
  S210_CONVERTER_SPECS,
  S200_CONVERTER_SPECS,
} from "@/lib/validation/drive-system-rules";
import { runCompatibilityRules } from "@/data/compatibility-rules";
import {
  applyAxisLicences828d,
  mcpFor828d,
  nxFor828d,
  pickCncSoftware828d,
  pickDefaultControlUnit,
  safetyFor828d,
  selectCombi,
  fl2FullMlfb,
} from "./family-rules";
import { selectCablesS200 } from "@/data/cables-s200";

/** The AI occasionally emits an object (or a string) where an array is expected. */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
import { sizeConfiguration, type UserSpecsInput } from "@/lib/sizing";
import { resolveFeedAxisMlfbs, resolveFullMotorMlfb } from "@/lib/mlfb/per-axis";

let catalogData: {
  controlUnits: ControlUnit[];
  cncSoftware: CncSoftware[];
  technologyPackages: TechnologyPackage[];
  softwareOptions: SoftwareOption[];
  driveComponents: DriveComponent[];
  motors: Motor[];
  measuringSystems: MeasuringSystem[];
  hmiComponents: HmiComponent[];
  safetyFunctions: SafetyFunction[];
  selectCables?: (config: {
    feedAxes: number;
    spindleAxes: number;
    controlUnitId: string;
    hmiCategory?: string;
    driveFamily?: string;
    feedMotorShaftHeight?: number;
    spindleMotorShaftHeight?: number;
    cableLengthMeters?: string;
  }) => CableAccessory[];
} | null = null;

export function setCatalogData(data: typeof catalogData) {
  catalogData = data;
}

function findControlUnit(id: string): ControlUnit | undefined {
  return catalogData?.controlUnits.find((cu) => cu.id === id);
}

function findCncSoftware(
  variant: SoftwareVariant,
  swVersion: string
): CncSoftware | undefined {
  return catalogData?.cncSoftware.find(
    (sw) =>
      sw.variant === variant &&
      sw.swVersion.includes(swVersion.replace(" SP1", ""))
  );
}

function findTechPackage(idOrCode: string): TechnologyPackage | undefined {
  return catalogData?.technologyPackages.find(
    (tp) => tp.id === idOrCode || tp.orderCode === idOrCode
  );
}

function findOption(orderCode: string): SoftwareOption | undefined {
  return catalogData?.softwareOptions.find(
    (opt) => opt.orderCode === orderCode || opt.id === orderCode
  );
}

function findHmiByCategoryAndSize(
  category: string,
  size: number
): HmiComponent | undefined {
  if (!catalogData) return undefined;
  const mapped = category === "thin_client" ? "thin_client" : category;
  const bySize = catalogData.hmiComponents.find(
    (h) => h.category === mapped && h.screenSize === size
  );
  return bySize ?? catalogData.hmiComponents.find((h) => h.category === mapped);
}

function findSafetyFunction(code: string): SafetyFunction | undefined {
  return catalogData?.safetyFunctions.find(
    (sf) => sf.orderCode === code || sf.id === code
  );
}

/**
 * Map the user-form safetyLevel to an explicit list of catalog order
 * codes. Used to override architecture defaults so picking "Extended" or
 * "Full" on the specs form actually shows up in the BOM, even on the
 * deterministic template path that never sees the AI prompt.
 */
function deriveSafetyCodes(
  level: "basic" | "extended" | "full" | string,
  totalAxes: number
): string[] {
  if (level === "basic") return [];
  if (level === "extended") return ["S60", "S61"];
  if (level === "full") {
    // K codes are per-axis monitoring. Cap at K09 (max in safety.ts).
    const n = Math.max(1, Math.min(9, totalAxes || 6));
    const kCodes = Array.from({ length: n }, (_, i) => `K0${i + 1}`);
    return ["S60", "S61", ...kCodes];
  }
  return [];
}

/**
 * Build a GeneratedConfiguration from (AI architecture + user specs).
 *
 * The AI response specifies high-level architecture only. All motor /
 * motor-module / line-module / cable article numbers are chosen
 * deterministically by the sizing engine based on user-provided specs.
 *
 * @param raw     AI response (architecture only)
 * @param specs   User-entered mechanical specs (spindle kW/rpm, mass, rapid)
 * @param template Selected machine template (for sensible sizing defaults)
 */
/**
 * Resolve the product line: explicit argument > AI recommendation > the
 * family of the control unit the AI named > SINUMERIK ONE.
 */
function resolveFamily(
  raw: AiRawResponse,
  requested: ControlSystemFamily | undefined
): ControlSystemFamily {
  if (requested) return requested;
  if (raw.controlSystem?.family) return raw.controlSystem.family;
  const cu = raw.controlUnit?.id ? findControlUnit(raw.controlUnit.id) : undefined;
  return cu?.family ?? "sinumerik_one";
}

/** Default axis labels when the AI / template gave none, so every axis gets its own MLFB. */
function defaultAxisNames(template: string | null | undefined, count: number): string[] {
  const pool =
    template === "cnc_lathe" || template === "mill_turn"
      ? ["X", "Z", "Y", "C", "B", "A", "U", "V", "W"]
      : template === "router"
        ? ["X1", "X2", "Y1", "Z1", "A", "C", "U", "V", "W"]
        : ["X", "Y", "Z", "A", "C", "B", "U", "V", "W"];
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)));
}

/** Vertical axes carry a holding brake unless the user explicitly said otherwise. */
const isVerticalAxis = (axis: string) => /^(Z|W)\d*$/i.test(axis.trim());

/**
 * Gantry pairs: what the AI reported plus any axis letter that appears twice
 * (X1 + X2, Y1 + Y2) — a portal machine must never lose its gantry licence.
 */
function detectGantryPairs(axisNames: string[], reported: unknown): string[][] {
  const pairs: string[][] = asArray<unknown>(reported)
    .filter((p): p is string[] => Array.isArray(p) && p.length === 2 && p.every((x) => typeof x === "string"))
    .map((p) => p.map((x) => x.trim()));
  const byLetter = new Map<string, string[]>();
  for (const a of axisNames) {
    const m = a.trim().match(/^([A-Z])\d+$/i);
    if (!m) continue;
    const key = m[1].toUpperCase();
    byLetter.set(key, [...(byLetter.get(key) ?? []), a.trim()]);
  }
  for (const names of byLetter.values()) {
    for (let i = 0; i + 1 < names.length; i += 2) {
      const pair = [names[i], names[i + 1]];
      if (!pairs.some((p) => p.includes(pair[0]) || p.includes(pair[1]))) pairs.push(pair);
    }
  }
  return pairs;
}

/**
 * SINUMERIK ONE ships 3 axes/spindles in the base scope; every further one
 * needs an A-option. When the user typed explicit axis counts we recompute
 * the licence instead of trusting the AI / template's arithmetic.
 */
function applyOneAxisLicences(
  softwareOptions: SoftwareOption[],
  optionQuantities: Record<string, number>,
  totalAxes: number,
  warnings: CompatibilityWarning[]
) {
  const isAxisCode = (o: SoftwareOption) => /^A\d{2}$/.test(o.orderCode);
  for (const o of softwareOptions.filter(isAxisCode)) delete optionQuantities[o.id];
  const kept = softwareOptions.filter((o) => !isAxisCode(o));
  softwareOptions.length = 0;
  softwareOptions.push(...kept);
  const extra = totalAxes - 3;
  if (extra <= 0) return;
  const code = `A${String(Math.min(extra, 99)).padStart(2, "0")}`;
  const found = findOption(code);
  if (found) {
    softwareOptions.push(found);
    optionQuantities[found.id] = 1;
  } else {
    warnings.push({
      severity: "warning",
      message: `${extra} additional axes/spindles need licence ${code}, which is not in the catalog data — add it manually.`,
      affectedComponents: [code],
    });
  }
}

export function parseAiResponse(
  raw: AiRawResponse,
  specs?: UserSpecsInput,
  template?: string | null,
  requestedFamily?: ControlSystemFamily
): GeneratedConfiguration | null {
  if (!catalogData || raw.needsClarification) return null;
  const family = resolveFamily(raw, requestedFamily);

  const warnings: CompatibilityWarning[] = [];
  const notes: string[] = asArray<string>(raw.notes).filter((n) => typeof n === "string");

  // ─── 0. Axis / spindle counts (explicit form values win over AI / template) ───
  const arch = raw.driveArchitecture;
  const feedAxisCount = specs?.feedAxisCount ?? arch?.feedAxisCount ?? 3;
  const spindleCount = specs?.spindleCount ?? arch?.spindleCount ?? 1;
  const countsFromUser = specs?.feedAxisCount !== undefined || specs?.spindleCount !== undefined;
  const totalAxes = feedAxisCount + spindleCount;

  // ─── 1. Control unit ───
  let controlUnit = raw.controlUnit?.id ? findControlUnit(raw.controlUnit.id) : undefined;
  if (controlUnit && controlUnit.family !== family) {
    notes.push(`AI proposed ${controlUnit.name}, which belongs to another product line — replaced by the matching ${family === "828d_smart" ? "828D Smart" : family === "828d" ? "828D" : "SINUMERIK ONE"} unit.`);
    controlUnit = undefined;
  }
  if (!controlUnit) {
    controlUnit = pickDefaultControlUnit(catalogData.controlUnits, family, {
      template,
      panelSizeInch: raw.hmi?.panelSizeInch,
      totalAxes,
    });
  }
  if (!controlUnit) {
    warnings.push({
      severity: "error",
      message: `Control unit ${raw.controlUnit?.id ?? "(none)"} not found in catalog`,
      affectedComponents: ["controlUnit"],
    });
  }
  const controlUnitId = (controlUnit?.id ?? "NCU_1740") as ControlUnitVariant;
  const is828 = family !== "sinumerik_one";

  // ─── 2. CNC software ───
  // ONE: export / full-scope variant + version. 828D: technology-specific SD card
  // (newest generation the unit runs; 828D Smart is fixed to SW 24x).
  const softwareVariant = (is828 ? "export" : raw.cncSoftware?.variant || "export") as SoftwareVariant;
  const cncSoftware = is828
    ? pickCncSoftware828d(catalogData.cncSoftware, family, template)
    : findCncSoftware(softwareVariant, raw.cncSoftware?.swVersion || "6.25");

  // ─── 3. Technology packages ───
  const technologyPackages: TechnologyPackage[] = [];
  const includedOptionCodes = new Set<string>();
  for (const pkg of asArray<{ id?: string }>(raw.technologyPackages)) {
    if (!pkg?.id) continue;
    if (is828) {
      notes.push(`Technology package ${pkg.id} is a SINUMERIK ONE product and does not exist on 828D — dropped.`);
      continue;
    }
    const found = findTechPackage(pkg.id);
    if (found) {
      technologyPackages.push(found);
      found.includedOptions.forEach((opt) => includedOptionCodes.add(opt));
    } else {
      warnings.push({
        severity: "warning",
        message: `Technology package "${pkg.id}" suggested by the AI is not in the catalog and was dropped.`,
        affectedComponents: [pkg.id],
      });
    }
  }

  // ─── 4. Software options with quantities ───
  // Safety codes (S60/S61/K01..K09) canonically live in safetyFunctions.
  // Collect any that the AI routed through additionalOptions so they can
  // be merged into raw.safety.options in step 10 below.
  const isSafetyCode = (code: string) => /^(S60|S61|K0\d)$/i.test(code);
  const reroutedSafetyCodes: string[] = [];

  const softwareOptions: SoftwareOption[] = [];
  const optionQuantities: Record<string, number> = {};
  for (const opt of asArray<{ orderCode?: string; name?: string; quantity?: number }>(raw.additionalOptions)) {
    if (!opt?.orderCode) continue;
    if (includedOptionCodes.has(opt.orderCode)) continue;
    if (isSafetyCode(opt.orderCode)) {
      reroutedSafetyCodes.push(opt.orderCode.toUpperCase());
      continue;
    }
    const found = findOption(opt.orderCode);
    if (found) {
      softwareOptions.push(found);
      optionQuantities[found.id] = opt.quantity || 1;
    } else {
      warnings.push({
        severity: "warning",
        message: `Option ${opt.orderCode}${opt.name ? ` (${opt.name})` : ""} suggested by the AI is not in the catalog and was dropped.`,
        affectedComponents: [opt.orderCode],
      });
    }
  }

  // Auto-include SINUMERIK Operate /NCU (S00) for every NCU-based config.
  // Operate runs on the NCU and is the HMI software that the thin client /
  // panel PC connects to. Without it, the thin client displays nothing.
  // PPU has Operate baked in (panel-based), so no separate license needed.
  if (controlUnitId.startsWith("NCU") && !includedOptionCodes.has("S00")) {
    const operate = findOption("S00");
    if (operate && !softwareOptions.some((o) => o.id === operate.id)) {
      softwareOptions.push(operate);
      optionQuantities[operate.id] = 1;
    }
  }

  // ─── 5. Drive architecture from AI, then size deterministically ───
  const driveFamilyName: DriveComponent["driveFamily"] =
    family === "828d_smart" ? "S200" : family === "828d" ? "S120_booksize" : (arch?.family as DriveComponent["driveFamily"]) || "S120_booksize";
  if (is828) {
    // 828D licences are always recomputed: 3 (T/G) or 4 (M) axes in the base scope, 0AC20 per extra.
    applyAxisLicences828d(softwareOptions, optionQuantities, findOption, totalAxes, template);
  } else if (countsFromUser) {
    applyOneAxisLicences(softwareOptions, optionQuantities, totalAxes, warnings);
  }
  const preferActiveLineModule = arch?.preferActiveLineModule ?? false;

  // Honour AI-detected user preferences (motor family, cable length).
  // These live on raw.userPreferences and are mirrored into UserSpecsInput
  // so the sizing engine filters motor selection accordingly. We do NOT
  // overwrite values the user explicitly typed in the form — those win.
  const prefs = raw.userPreferences;
  const sizingSpecs: UserSpecsInput = { ...(specs || {}) };
  if (prefs?.feedMotorFamily && !sizingSpecs.feedMotorFamily) {
    sizingSpecs.feedMotorFamily = prefs.feedMotorFamily;
  }
  if (prefs?.spindleMotorFamily && !sizingSpecs.spindleMotorFamily) {
    sizingSpecs.spindleMotorFamily = prefs.spindleMotorFamily;
  }
  if (prefs?.cableLengthMeters && !sizingSpecs.cableLengthMeters) {
    sizingSpecs.cableLengthMeters = String(prefs.cableLengthMeters);
  }
  // Power / speed / mass / rapid mentioned in free-text take precedence
  // over the machine-size-class defaults the sizing engine would
  // otherwise apply. The form's values still win when present (the form
  // is more deliberate than free-text extraction).
  if (prefs?.spindlePowerKw && !sizingSpecs.spindlePowerKw) {
    sizingSpecs.spindlePowerKw = prefs.spindlePowerKw;
  }
  if (prefs?.spindleMaxRpm && !sizingSpecs.spindleMaxRpm) {
    sizingSpecs.spindleMaxRpm = prefs.spindleMaxRpm;
  }
  if (prefs?.movingMassKg && !sizingSpecs.movingMassKg) {
    sizingSpecs.movingMassKg = prefs.movingMassKg;
  }
  if (prefs?.rapidTraverseMpm && !sizingSpecs.rapidTraverseMpm) {
    sizingSpecs.rapidTraverseMpm = prefs.rapidTraverseMpm;
  }
  // feedPowerKw doesn't have a direct sizing-engine slot — but a
  // declared feed power gives the engine a reasonable mass derivation:
  // 1 kW ≈ 100 kg moving mass for typical machine-tool ball-screw axes.
  // Only apply when the user didn't give us a real mass.
  if (prefs?.feedPowerKw && !sizingSpecs.movingMassKg && !prefs.movingMassKg) {
    sizingSpecs.movingMassKg = prefs.feedPowerKw * 100;
  }
  if (prefs?.feedPowerKw && !sizingSpecs.feedPowerKw) {
    sizingSpecs.feedPowerKw = prefs.feedPowerKw;
  }

  // Run deterministic sizing against user specs
  const sized = sizeConfiguration({
    userSpecs: sizingSpecs,
    template: (template as never) ?? null,
    preferHighSpeedSpindle: arch?.highSpeedSpindle,
    controlFamily: family,
  });

  // Surface sizing assumptions as notes so the user sees them
  for (const assumption of sized.assumptions) {
    notes.push(`[Auto-assumed] ${assumption}`);
  }

  // ─── 6. Build drive components (motor modules + line module + interface) ───
  const drives: DriveComponent[] = [];
  const driveQuantities: Record<string, number> = {};

  // Feed Motor Module (deterministically chosen from feed motor)
  const feedMotorModuleArticle = sized.feed?.specs.motorModule;
  const feedIsS210 = isSingleAxisConverter(feedMotorModuleArticle);
  if (feedAxisCount > 0 && feedMotorModuleArticle) {
    const mmSpecs = MOTOR_MODULE_SPECS[feedMotorModuleArticle];
    const s210 = S210_CONVERTER_SPECS[feedMotorModuleArticle];
    const s200 = S200_CONVERTER_SPECS[feedMotorModuleArticle];
    const feedMm: DriveComponent = s200
      ? {
          // SINAMICS S200 (828D Smart): one PROFINET converter per 1FL2 motor, integrated braking resistor.
          id: `feed-mm-${feedMotorModuleArticle}`,
          articleNumber: feedMotorModuleArticle,
          name: `SINAMICS S200 PN 400 V converter ${s200.frame}, ${s200.power} kW`,
          driveFamily: "S200",
          componentType: "motor_module_single",
          ratedPower: `${s200.power}kW`,
          ratedCurrent: `${s200.current}A`,
          frameType: s200.frame,
          compatibility: { PPU_260_5: "option", PPU_261_5: "option" },
          description: `SINAMICS S200 PN servo converter with STO and integrated braking resistor, option T80 — paired with ${sized.feed?.article} (828D Smart PDF p.27)`,
        }
      : feedIsS210
      ? {
          // SINAMICS S210: one single-axis converter per 1FK2 motor, own infeed.
          id: `feed-mm-${feedMotorModuleArticle}`,
          articleNumber: feedMotorModuleArticle,
          name: `SINAMICS S210 converter ${s210 ? `${s210.frame} ${s210.voltage}` : feedMotorModuleArticle}`,
          driveFamily: "S210",
          componentType: "motor_module_single",
          ratedPower: s210 ? `${s210.power}kW` : undefined,
          frameType: s210?.frame,
          compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
          description: s210
            ? `Single-axis servo converter with integrated infeed | ${s210.power}kW | ${s210.voltage} | paired with ${sized.feed?.article} via OCC`
            : `Single-axis servo converter paired with ${sized.feed?.article}`,
        }
      : {
          id: `feed-mm-${feedMotorModuleArticle}`,
          articleNumber: feedMotorModuleArticle,
          name: `Motor Module ${feedMotorModuleArticle}`,
          driveFamily: driveFamilyName as DriveComponent["driveFamily"],
          componentType: "motor_module_single",
          ratedCurrent: mmSpecs ? `${mmSpecs.current}A` : undefined,
          ratedPower: mmSpecs ? `${mmSpecs.power}kW` : undefined,
          compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
          description: mmSpecs
            ? `Single Motor Module booksize | ${mmSpecs.current}A rated | ${mmSpecs.power}kW | ${mmSpecs.voltage} | paired with ${sized.feed?.article}`
            : `Feed axis Motor Module`,
        };
    drives.push(feedMm);
    driveQuantities[feedMm.id] = feedAxisCount;
  }

  // Spindle Motor Module (deterministically chosen from spindle motor)
  const spindleMotorModuleArticle = sized.spindle?.specs.motorModule;
  if (spindleCount > 0 && spindleMotorModuleArticle) {
    const mmSpecs = MOTOR_MODULE_SPECS[spindleMotorModuleArticle];
    const s200s = S200_CONVERTER_SPECS[spindleMotorModuleArticle];
    const spindleMm: DriveComponent = s200s
      ? {
          id: `spindle-mm-${spindleMotorModuleArticle}`,
          articleNumber: spindleMotorModuleArticle,
          name: `SINAMICS S200 Spindle converter ${s200s.frame}, ${s200s.power} kW`,
          driveFamily: "S200",
          componentType: "motor_module_single",
          ratedPower: `${s200s.power}kW`,
          ratedCurrent: `${s200s.current}A`,
          frameType: s200s.frame,
          compatibility: { PPU_260_5: "option", PPU_261_5: "option" },
          description: `SINAMICS S200 Spindle converter, PROFINET — paired with ${sized.spindle?.article}; external braking resistor mandatory (828D Smart PDF p.35/p.47)`,
        }
      : {
      id: `spindle-mm-${spindleMotorModuleArticle}`,
      articleNumber: spindleMotorModuleArticle,
      name: `Motor Module ${spindleMotorModuleArticle}`,
      driveFamily: driveFamilyName as DriveComponent["driveFamily"],
      componentType: "motor_module_single",
      ratedCurrent: mmSpecs ? `${mmSpecs.current}A` : undefined,
      ratedPower: mmSpecs ? `${mmSpecs.power}kW` : undefined,
      compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
      description: mmSpecs
        ? `Single Motor Module booksize | ${mmSpecs.current}A rated | ${mmSpecs.power}kW | ${mmSpecs.voltage} | paired with ${sized.spindle?.article}`
        : `Spindle Motor Module`,
    };
    drives.push(spindleMm);
    driveQuantities[spindleMm.id] = spindleCount;
  }

  // Line Module (deterministic from motor module articles + counts).
  // S210 converters bring their own infeed, so they neither need a Line
  // Module nor count towards its sizing.
  const spindleIsS210 = isSingleAxisConverter(spindleMotorModuleArticle);
  const s120FeedCount = feedIsS210 ? 0 : feedAxisCount;
  const s120SpindleCount = spindleIsS210 ? 0 : spindleCount;
  const needsLineModule =
    (s120FeedCount > 0 && !!feedMotorModuleArticle) || (s120SpindleCount > 0 && !!spindleMotorModuleArticle);
  if (!needsLineModule && (feedIsS210 || spindleIsS210)) {
    notes.push(
      isS200Converter(feedMotorModuleArticle) || isS200Converter(spindleMotorModuleArticle)
        ? "SINAMICS S200 converters have an integrated infeed — no Line Module is required; the S200 Spindle converter needs an external braking resistor."
        : "SINAMICS S210 converters have an integrated infeed — no Line Module or Active Interface Module is required."
    );
  }
  const lm = needsLineModule
    ? selectLineModule(
        feedIsS210 ? "" : feedMotorModuleArticle || "",
        s120FeedCount,
        spindleIsS210 ? undefined : spindleMotorModuleArticle,
        s120SpindleCount,
        preferActiveLineModule
      )
    : null;
  if (lm) {
  const lineDrive: DriveComponent = {
    id: `line-module-${lm.articleNumber}`,
    articleNumber: lm.articleNumber,
    name: lm.name,
    driveFamily: driveFamilyName as DriveComponent["driveFamily"],
    componentType: lm.type === "active" ? "line_module_active" : lm.type === "basic" ? "line_module_basic" : "line_module_smart",
    ratedPower: `${lm.ratedPower}kW`,
    compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
    description: `Shared DC bus power supply — ${lm.ratedPower}kW rated, sized for feed+spindle motor total`,
  };
  drives.push(lineDrive);
  driveQuantities[lineDrive.id] = 1;

  // Interface Module (only if Active Line Module)
  if (lm.interfaceModule) {
    const ifm: DriveComponent = {
      id: `interface-module-${lm.interfaceModule}`,
      articleNumber: lm.interfaceModule,
      name: `Active Interface Module`,
      driveFamily: driveFamilyName as DriveComponent["driveFamily"],
      componentType: "interface_module",
      compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
      description: "Required for Active Line Module operation (Clean Power Filter)",
    };
    drives.push(ifm);
    driveQuantities[ifm.id] = 1;
  }
  }

  // ─── 6b. 828D: prefer the S120 Combi Power Module, then NX extensions ───
  if (family === "828d") {
    const parseA = (s?: string) => (s ? parseFloat(s) : undefined);
    const combi = selectCombi({
      feedAxes: feedAxisCount,
      spindles: spindleCount,
      spindleCurrentA: parseA(sized.spindle?.specs.ratedCurrent),
      feedCurrentA: parseA(sized.feed?.specs.ratedCurrent),
      feedMotorModuleArticle,
      feedMotorModuleName: feedMotorModuleArticle ? `Motor Module ${feedMotorModuleArticle}` : undefined,
    });
    if (combi) {
      // Replace booksize modules + line module with the Combi line-up.
      for (const d of drives) delete driveQuantities[d.id];
      drives.length = 0;
      drives.push(...combi.components);
      Object.assign(driveQuantities, combi.quantities);
      notes.push(...combi.notes);
    } else {
      notes.push("Outside the SINAMICS S120 Combi envelope (more than 6 feed axes, several spindles or higher currents) — S120 booksize with a Line Module selected instead (NC 82 p.1/6).");
    }
    const nx = nxFor828d(catalogData.driveComponents, totalAxes);
    if (nx && "component" in nx) {
      drives.push(nx.component);
      driveQuantities[nx.component.id] = 1;
      notes.push(nx.note);
    } else if (nx && "error" in nx) {
      warnings.push({ severity: "error", message: nx.error, affectedComponents: ["controlUnit"] });
    }
  }
  if (family === "828d_smart" && totalAxes > 5) {
    warnings.push({
      severity: "error",
      message: `${totalAxes} axes/spindles exceed the 828D Smart limit of 5 (NC 82 ch.2 p.2/4) — choose SINUMERIK 828D instead.`,
      affectedComponents: ["controlUnit"],
    });
  }

  // ─── 7. Motors — from sizing engine ───
  const motors: Motor[] = [];
  const motorQuantities: Record<string, number> = {};

  if (sized.feed && feedAxisCount > 0) {
    const fs = sized.feed.specs;

    // Per-axis MLFB expansion: when the AI captured axis names + brake
    // preferences, resolve each axis to its own full MLFB. The BOM
    // displays one row per axis. Falls back to legacy "qty N" when no
    // axis-level info is available.
    const namedAxes = asArray<string>(prefs?.axisNames).filter((a) => typeof a === "string");
    const axisNames = namedAxes.length > 0 ? namedAxes : defaultAxisNames(template, feedAxisCount);
    const brakeAxes = asArray<string>(prefs?.brakeAxes).filter((a) => typeof a === "string");
    // Rule: vertical axes always get a holding brake.
    const verticalWithoutBrake = axisNames.filter((a) => isVerticalAxis(a) && !brakeAxes.some((b) => b.toLowerCase() === a.toLowerCase()));
    if (verticalWithoutBrake.length > 0) {
      brakeAxes.push(...verticalWithoutBrake);
      notes.push(`Holding brake added on vertical axis ${verticalWithoutBrake.join(", ")} — a vertical axis must not drop when power is removed.`);
    }
    let perAxisMlfbs;
    if (axisNames.length > 0) {
      // Truncate / pad to the architecturally-determined feedAxisCount
      // so we never produce more axes than the AI sized for.
      const names = axisNames.slice(0, feedAxisCount);
      perAxisMlfbs = resolveFeedAxisMlfbs({
        baseArticle: sized.feed.article,
        axisNames: names,
        brakeAxes,
      });
    }

    // Resolve a complete-as-we-can-honestly-emit MLFB for the BOM line.
    // For verified families (1FT7) the catalog stores the full article;
    // for trunk-only families (1FT2 / 1FK2 / 1FK7) we emit the trunk
    // and the BOM badges it "partner completes suffix" — better than
    // shipping a speculative suffix.
    const feedResolved = resolveFullMotorMlfb(sized.feed.article);
    // 1FL2 (828D Smart): the ordering code is fully determined by the D 37.1
    // legend, so emit a complete MLFB (plain shaft, multiturn encoder) instead
    // of the catalog trunk, per axis when the user named brake axes.
    const isFl2 = sized.feed.article.startsWith("1FL2");
    if (isFl2) {
      feedResolved.mlfb = fl2FullMlfb(sized.feed.article, false);
      feedResolved.completeness = "verified";
      if (axisNames.length > 0) {
        perAxisMlfbs = axisNames.slice(0, feedAxisCount).map((axis) => ({
          axis,
          mlfb: fl2FullMlfb(sized.feed!.article, brakeAxes.includes(axis)),
          brake: brakeAxes.includes(axis),
          completeness: "verified" as const,
          decoded: [
            { label: "Holding brake", code: brakeAxes.includes(axis) ? "1" : "0", choiceLabel: brakeAxes.includes(axis) ? "with brake" : "without brake" },
            { label: "Shaft", code: "0", choiceLabel: "plain shaft" },
            { label: "Encoder", code: "M", choiceLabel: "absolute 21-bit + 12-bit multiturn" },
            { label: "Connector", code: "B", choiceLabel: "metal circular connector" },
          ],
        }));
      }
    }

    const feedMotor: Motor = {
      id: `feed-${sized.feed.article}`,
      family: "SIMOTICS_S",
      series: fs.family.includes("1FT2") ? "1FT2" : fs.family.includes("1FK2") ? "1FK2" : fs.family.includes("1FK7") ? "1FK7" : "1FT7",
      name: `${fs.family} ${fs.variant}`,
      articleNumber: feedResolved.mlfb,
      mlfbCompleteness: feedResolved.completeness,
      motorType: "feed_servo_sync",
      connectionType: "2_cable",
      compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
      description: sized.feed.reason,
      shaftHeight: fs.shaftHeight,
      ratedPower: fs.ratedPower,
      ratedTorque: fs.ratedTorque,
      ratedSpeed: fs.ratedSpeed,
      ratedCurrent: fs.ratedCurrent,
      maxSpeed: fs.maxSpeed,
      maxTorque: fs.maxTorque,
      perAxisMlfbs,
    };
    motors.push(feedMotor);
    motorQuantities[feedMotor.id] = feedAxisCount;

    for (const w of sized.feed.warnings) {
      warnings.push({ severity: "warning", message: w, affectedComponents: [sized.feed.article] });
    }
  }

  if (sized.spindle && spindleCount > 0) {
    const ss = sized.spindle.specs;
    // 1PH8 entries in MOTOR_SPECS already carry the full MLFB; the
    // resolver is a no-op for them. Run it for consistency / future-
    // proofing if 1PH3 / 1FE1 / 1FE2 spindles get added.
    const spindleResolved = resolveFullMotorMlfb(sized.spindle.article);
    const spindleMotor: Motor = {
      id: `spindle-${sized.spindle.article}`,
      family: "SIMOTICS_M",
      series: "1PH8",
      name: `${ss.family} ${ss.variant}`,
      articleNumber: spindleResolved.mlfb,
      mlfbCompleteness: spindleResolved.completeness,
      motorType: ss.kind === "spindle_sync" ? "main_spindle_sync" : "main_spindle_async",
      connectionType: "standard",
      compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
      description: sized.spindle.reason,
      shaftHeight: ss.shaftHeight,
      ratedPower: ss.ratedPower,
      ratedTorque: ss.ratedTorque,
      ratedSpeed: ss.ratedSpeed,
      ratedCurrent: ss.ratedCurrent,
      maxSpeed: ss.maxSpeed,
    };
    motors.push(spindleMotor);
    motorQuantities[spindleMotor.id] = spindleCount;

    for (const w of sized.spindle.warnings) {
      warnings.push({ severity: "warning", message: w, affectedComponents: [sized.spindle.article] });
    }
  }

  // ─── 7b. Gantry pairs → gantry licence (ONE M02 / 828D 0AS51) ───
  {
    const names = asArray<string>(prefs?.axisNames).filter((a) => typeof a === "string");
    const gantryPairs = detectGantryPairs(names.length ? names : defaultAxisNames(template, feedAxisCount), prefs?.gantryPairs);
    if (gantryPairs.length > 0) {
      const code = is828 ? "0AS51" : "M02";
      const opt = findOption(code);
      if (opt) {
        if (!softwareOptions.some((o) => o.id === opt.id)) softwareOptions.push(opt);
        optionQuantities[opt.id] = gantryPairs.length;
        notes.push(`Gantry: ${gantryPairs.map((p) => p.join("/")).join(", ")} run as synchronized pair(s) — option ${code} × ${gantryPairs.length}.`);
      }
      if (family === "828d_smart" && gantryPairs.length > 1) {
        warnings.push({ severity: "warning", message: "828D Smart supports at most one gantry pair (NC 82 ch.2).", affectedComponents: ["0AS51"] });
      }
    }
  }

  // ─── 8. Measuring systems (default) ───
  const measuringSystems: MeasuringSystem[] =
    catalogData?.measuringSystems.slice(0, 2) || [];

  // ─── 9. HMI + MCP — deterministic match ───
  const hmiComponents: HmiComponent[] = [];
  const panelSize = raw.hmi?.panelSizeInch ?? 15;
  if (raw.hmi && raw.hmi.type !== "built_in_ppu") {
    const hmi = findHmiByCategoryAndSize(raw.hmi.type, panelSize);
    if (hmi) hmiComponents.push(hmi);
  }

  if (is828 && controlUnit) {
    const mcp = mcpFor828d(catalogData.hmiComponents, controlUnit);
    if (mcp) hmiComponents.push(mcp);
  }

  if (controlUnitId.startsWith("NCU") && catalogData) {
    const mcpMatch = getMatchingMcp(panelSize);
    const mcp = catalogData.hmiComponents.find(
      (h) => h.category === "mcp" && h.articleNumber === mcpMatch.mcpArticle
    ) || catalogData.hmiComponents.find((h) => h.category === "mcp" && h.id === mcpMatch.mcpId);
    if (mcp) hmiComponents.push(mcp);
  }

  // ─── 9b. I/O module (user-selectable, default PP 72/48 for NCU) ───
  // "" (empty string) = use default, "none" = explicitly no I/O module,
  // "pp_72_48" or "et200sp" = user choice.
  if (catalogData && controlUnitId.startsWith("NCU")) {
    const ioChoice = specs?.ioModule ?? "";
    if (ioChoice !== "none") {
      const ioId = ioChoice === "et200sp" ? "io_et200sp_cpu" : "io_pp_72_48";
      const io = catalogData.hmiComponents.find((h) => h.id === ioId);
      if (io) hmiComponents.push(io);
    }
  }

  // ─── 9c. Handheld terminal (fully optional) ───
  if (catalogData) {
    const hh = specs?.handheldUnit;
    if (hh === "ht2" || hh === "ht10") {
      const hhId = is828 ? (hh === "ht10" ? "hmi828-ht10" : null) : hh === "ht10" ? "handheld_ht10" : "handheld_ht2";
      const handheld = hhId ? catalogData.hmiComponents.find((h) => h.id === hhId) : undefined;
      if (handheld) hmiComponents.push(handheld);
      else if (is828) notes.push(family === "828d_smart" ? "HT 10 is not available for 828D Smart (NC 82 ch.2)." : "HT 2 is not listed for 828D; use HT 10 or the mini handheld unit.");
    }
  }

  // ─── 10. Safety ───
  // User-form safetyLevel (when set) deterministically OVERRIDES whatever
  // the AI/template returned. Otherwise we honour the architecture's
  // safety.options + any rerouted codes from step 4.
  const userSafetyLevel = specs?.safetyLevel || "";
  const totalAxesForSafety = raw.totalAxes ?? feedAxisCount + spindleCount;

  const safetyFunctions: SafetyFunction[] = [];
  const basicSafety = catalogData?.safetyFunctions.filter((sf) => sf.isBasicScope);
  if (basicSafety) safetyFunctions.push(...basicSafety);

  let safetyCodes: Set<string>;
  if (is828) {
    // 828D has its own Safety Integrated licence; ONE codes (S60/S61/K0x) do not apply.
    const s = safetyFor828d(family, userSafetyLevel || (asArray<string>(raw.safety?.options).length ? "extended" : ""), totalAxes, findOption);
    if (s.option) {
      softwareOptions.push(s.option);
      optionQuantities[s.option.id] = s.quantity ?? 1;
    }
    if (s.note) notes.push(s.note);
    if (s.warning) warnings.push({ severity: "warning", message: s.warning, affectedComponents: ["safety"] });
    safetyCodes = new Set<string>();
  } else if (userSafetyLevel) {
    safetyCodes = new Set(
      deriveSafetyCodes(userSafetyLevel, totalAxesForSafety)
    );
    notes.push(
      `[User override] Safety level: ${userSafetyLevel}${
        safetyCodes.size > 0 ? ` → ${Array.from(safetyCodes).join(", ")}` : " (basic only — STO/SS1/SBC hardware)"
      }`
    );
  } else {
    safetyCodes = new Set<string>([
      ...asArray<string>(raw.safety?.options).filter((c) => typeof c === "string").map((c) => c.toUpperCase()),
      ...reroutedSafetyCodes,
    ]);
  }
  for (const code of safetyCodes) {
    const sf = findSafetyFunction(code);
    if (sf && !sf.isBasicScope && !safetyFunctions.some((s) => s.id === sf.id)) {
      safetyFunctions.push(sf);
    }
  }

  // ─── 11. Cables — auto-select ───
  // Use `sizingSpecs.cableLengthMeters` (not `specs?.cableLengthMeters`)
  // so we pick up the AI-extracted length from userPreferences when the
  // user typed it in the description rather than filling the form. The
  // earlier merge step mirrors prefs.cableLengthMeters into sizingSpecs.
  let cables: CableAccessory[] = [];
  if (family === "828d_smart") {
    cables = selectCablesS200({
      feedAxes: feedAxisCount,
      spindleAxes: spindleCount,
      feedShaftHeight: sized.feed?.specs.shaftHeight,
      feedPowerKw: sized.feed ? parseFloat(sized.feed.specs.ratedPower) : undefined,
      feedBrakeAxes: asArray<string>(prefs?.brakeAxes).length,
      spindleArticle: sized.spindle?.article,
      cableLengthMeters: sizingSpecs.cableLengthMeters,
    });
  } else if (catalogData?.selectCables) {
    cables = catalogData.selectCables({
      feedAxes: feedAxisCount,
      spindleAxes: spindleCount,
      controlUnitId,
      hmiCategory: hmiComponents[0]?.category,
      driveFamily: driveFamilyName,
      feedMotorShaftHeight: sized.feed?.specs.shaftHeight,
      spindleMotorShaftHeight: sized.spindle?.specs.shaftHeight,
      cableLengthMeters: sizingSpecs.cableLengthMeters,
    });
  }

  // ─── 12. Sizing reasoning as notes ───
  if (sized.feed) {
    notes.push(
      `Feed motor: ${sized.feed.article} (${sized.feed.specs.ratedPower}, ${sized.feed.specs.ratedTorque}, SH${sized.feed.specs.shaftHeight}) — ${sized.feed.reason}`
    );
  }
  if (sized.spindle) {
    notes.push(
      `Spindle motor: ${sized.spindle.article} (${sized.spindle.specs.ratedPower}, max ${sized.spindle.specs.maxSpeed}) — ${sized.spindle.reason}`
    );
  }

  const config: GeneratedConfiguration = {
    controlUnit: controlUnit || catalogData!.controlUnits[0],
    cncSoftware: cncSoftware || catalogData!.cncSoftware[0],
    softwareVariant,
    technologyPackages,
    softwareOptions,
    optionQuantities,
    drives,
    driveQuantities,
    motors,
    motorQuantities,
    measuringSystems,
    hmiComponents,
    safetyFunctions,
    cables,
    family,
    totalAxes: countsFromUser || is828 ? totalAxes : raw.totalAxes || totalAxes,
    totalChannels: raw.totalChannels || 1,
    warnings,
    notes,
    estimatedComplexity:
      (raw.estimatedComplexity as GeneratedConfiguration["estimatedComplexity"]) ||
      "standard",
  };

  // ─── 13. Catalog compatibility rules (axis/channel limits, export scope, safety deps, …) ───
  config.warnings.push(...runCompatibilityRules(config));

  return config;
}
