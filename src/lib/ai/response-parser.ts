import type {
  GeneratedConfiguration,
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
  MOTOR_MODULE_SPECS,
} from "@/lib/validation/drive-system-rules";
import { sizeConfiguration, type UserSpecsInput } from "@/lib/sizing";

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
export function parseAiResponse(
  raw: AiRawResponse,
  specs?: UserSpecsInput,
  template?: string | null
): GeneratedConfiguration | null {
  if (!catalogData || raw.needsClarification) return null;

  const warnings: CompatibilityWarning[] = [];
  const notes: string[] = raw.notes ? [...raw.notes] : [];

  // ─── 1. Control unit ───
  const controlUnitId = (raw.controlUnit?.id || "NCU_1740") as ControlUnitVariant;
  const controlUnit = findControlUnit(controlUnitId);
  if (!controlUnit) {
    warnings.push({
      severity: "error",
      message: `Control unit ${controlUnitId} not found in catalog`,
      affectedComponents: ["controlUnit"],
    });
  }

  // ─── 2. CNC software ───
  const softwareVariant = (raw.cncSoftware?.variant || "export") as SoftwareVariant;
  const cncSoftware = findCncSoftware(
    softwareVariant,
    raw.cncSoftware?.swVersion || "6.25"
  );

  // ─── 3. Technology packages ───
  const technologyPackages: TechnologyPackage[] = [];
  const includedOptionCodes = new Set<string>();
  for (const pkg of raw.technologyPackages || []) {
    const found = findTechPackage(pkg.id);
    if (found) {
      technologyPackages.push(found);
      found.includedOptions.forEach((opt) => includedOptionCodes.add(opt));
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
  for (const opt of raw.additionalOptions || []) {
    if (includedOptionCodes.has(opt.orderCode)) continue;
    if (isSafetyCode(opt.orderCode)) {
      reroutedSafetyCodes.push(opt.orderCode.toUpperCase());
      continue;
    }
    const found = findOption(opt.orderCode);
    if (found) {
      softwareOptions.push(found);
      optionQuantities[found.id] = opt.quantity || 1;
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
  const arch = raw.driveArchitecture;
  const feedAxisCount = arch?.feedAxisCount ?? 3;
  const spindleCount = arch?.spindleCount ?? 1;
  const family = arch?.family || "S120_booksize";
  const preferActiveLineModule = arch?.preferActiveLineModule ?? false;

  // Run deterministic sizing against user specs
  const sized = sizeConfiguration({
    userSpecs: specs || {},
    template: (template as never) ?? null,
    preferHighSpeedSpindle: arch?.highSpeedSpindle,
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
  if (feedAxisCount > 0 && feedMotorModuleArticle) {
    const mmSpecs = MOTOR_MODULE_SPECS[feedMotorModuleArticle];
    const feedMm: DriveComponent = {
      id: `feed-mm-${feedMotorModuleArticle}`,
      articleNumber: feedMotorModuleArticle,
      name: `Motor Module ${feedMotorModuleArticle}`,
      driveFamily: family as DriveComponent["driveFamily"],
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
    const spindleMm: DriveComponent = {
      id: `spindle-mm-${spindleMotorModuleArticle}`,
      articleNumber: spindleMotorModuleArticle,
      name: `Motor Module ${spindleMotorModuleArticle}`,
      driveFamily: family as DriveComponent["driveFamily"],
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

  // Line Module (deterministic from motor module articles + counts)
  const lm = selectLineModule(
    feedMotorModuleArticle || "",
    feedAxisCount,
    spindleMotorModuleArticle,
    spindleCount,
    preferActiveLineModule
  );
  const lineDrive: DriveComponent = {
    id: `line-module-${lm.articleNumber}`,
    articleNumber: lm.articleNumber,
    name: lm.name,
    driveFamily: family as DriveComponent["driveFamily"],
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
      driveFamily: family as DriveComponent["driveFamily"],
      componentType: "interface_module",
      compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
      description: "Required for Active Line Module operation (Clean Power Filter)",
    };
    drives.push(ifm);
    driveQuantities[ifm.id] = 1;
  }

  // ─── 7. Motors — from sizing engine ───
  const motors: Motor[] = [];
  const motorQuantities: Record<string, number> = {};

  if (sized.feed && feedAxisCount > 0) {
    const fs = sized.feed.specs;
    const feedMotor: Motor = {
      id: `feed-${sized.feed.article}`,
      family: "SIMOTICS_S",
      series: "1FT7",
      name: `${fs.family} ${fs.variant}`,
      articleNumber: sized.feed.article,
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
    };
    motors.push(feedMotor);
    motorQuantities[feedMotor.id] = feedAxisCount;

    for (const w of sized.feed.warnings) {
      warnings.push({ severity: "warning", message: w, affectedComponents: [sized.feed.article] });
    }
  }

  if (sized.spindle && spindleCount > 0) {
    const ss = sized.spindle.specs;
    const spindleMotor: Motor = {
      id: `spindle-${sized.spindle.article}`,
      family: "SIMOTICS_M",
      series: "1PH8",
      name: `${ss.family} ${ss.variant}`,
      articleNumber: sized.spindle.article,
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
      const hhId = hh === "ht10" ? "handheld_ht10" : "handheld_ht2";
      const handheld = catalogData.hmiComponents.find((h) => h.id === hhId);
      if (handheld) hmiComponents.push(handheld);
    }
  }

  // ─── 10. Safety ───
  const safetyFunctions: SafetyFunction[] = [];
  const basicSafety = catalogData?.safetyFunctions.filter((sf) => sf.isBasicScope);
  if (basicSafety) safetyFunctions.push(...basicSafety);
  const safetyCodes = new Set<string>([
    ...(raw.safety?.options || []).map((c) => c.toUpperCase()),
    ...reroutedSafetyCodes,
  ]);
  for (const code of safetyCodes) {
    const sf = findSafetyFunction(code);
    if (sf && !sf.isBasicScope && !safetyFunctions.some((s) => s.id === sf.id)) {
      safetyFunctions.push(sf);
    }
  }

  // ─── 11. Cables — auto-select ───
  let cables: CableAccessory[] = [];
  if (catalogData?.selectCables) {
    cables = catalogData.selectCables({
      feedAxes: feedAxisCount,
      spindleAxes: spindleCount,
      controlUnitId,
      hmiCategory: hmiComponents[0]?.category,
      driveFamily: family,
      feedMotorShaftHeight: sized.feed?.specs.shaftHeight,
      spindleMotorShaftHeight: sized.spindle?.specs.shaftHeight,
      cableLengthMeters: specs?.cableLengthMeters,
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
    totalAxes: raw.totalAxes || feedAxisCount + spindleCount,
    totalChannels: raw.totalChannels || 1,
    warnings,
    notes,
    estimatedComplexity:
      (raw.estimatedComplexity as GeneratedConfiguration["estimatedComplexity"]) ||
      "standard",
  };

  return config;
}

/**
 * Kept for API compatibility — sizing now runs inside parseAiResponse
 * whenever userSpecs are passed in, so this wrapper is a no-op that returns
 * an empty array. Left exported so callers don't break during migration.
 */
export function validateAgainstUserSpecs(): CompatibilityWarning[] {
  return [];
}
