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
import { selectLineModule, validateDriveSystem, getMatchingMcp, MOTOR_MODULE_SPECS } from "@/lib/validation/drive-system-rules";

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

function findTechPackage(id: string): TechnologyPackage | undefined {
  return catalogData?.technologyPackages.find((tp) => tp.id === id);
}

function findOption(orderCode: string): SoftwareOption | undefined {
  return catalogData?.softwareOptions.find(
    (opt) => opt.orderCode === orderCode || opt.id === orderCode
  );
}

function findHmiPanel(type: string, model?: string): HmiComponent | undefined {
  const categoryMap: Record<string, string> = {
    thin_client: "thin_client",
    panel_pc: "panel_pc",
    flat_panel_with_ipc: "flat_panel",
    built_in_ppu: "ppu_panel",
  };
  const category = categoryMap[type] || type;

  // Try to match by model name first (e.g., "ITC1500 V3 15\"")
  if (model && catalogData) {
    const byModel = catalogData.hmiComponents.find(
      (h) => h.category === category && h.name.includes(model.replace(/"/g, "").split(" ")[0])
    );
    if (byModel) return byModel;

    // Try matching by screen size extracted from model string
    const sizeMatch = model.match(/(\d+)["\s]/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      const bySize = catalogData.hmiComponents.find(
        (h) => h.category === category && h.screenSize === size
      );
      if (bySize) return bySize;
    }
  }

  // Fallback: first in category
  return catalogData?.hmiComponents.find((h) => h.category === category);
}

function findSafetyFunction(code: string): SafetyFunction | undefined {
  return catalogData?.safetyFunctions.find(
    (sf) => sf.orderCode === code || sf.id === code
  );
}

export function parseAiResponse(
  raw: AiRawResponse
): GeneratedConfiguration | null {
  if (!catalogData || raw.needsClarification) return null;

  const warnings: CompatibilityWarning[] = [];

  // 1. Control unit
  const controlUnitId = (raw.controlUnit?.id || "NCU_1740") as ControlUnitVariant;
  const controlUnit = findControlUnit(controlUnitId);
  if (!controlUnit) {
    warnings.push({
      severity: "error",
      message: `Control unit ${controlUnitId} not found in catalog`,
      affectedComponents: ["controlUnit"],
    });
  }

  // 2. CNC software
  const softwareVariant = (raw.cncSoftware?.variant || "export") as SoftwareVariant;
  const cncSoftware = findCncSoftware(
    softwareVariant,
    raw.cncSoftware?.swVersion || "6.25"
  );

  // 3. Technology packages
  const technologyPackages: TechnologyPackage[] = [];
  const includedOptionCodes = new Set<string>();

  for (const pkg of raw.technologyPackages || []) {
    const found = findTechPackage(pkg.id);
    if (found) {
      technologyPackages.push(found);
      found.includedOptions.forEach((opt) => includedOptionCodes.add(opt));
    }
  }

  // 4. Software options WITH quantities
  const softwareOptions: SoftwareOption[] = [];
  const optionQuantities: Record<string, number> = {};

  for (const opt of raw.additionalOptions || []) {
    if (!includedOptionCodes.has(opt.orderCode)) {
      const found = findOption(opt.orderCode);
      if (found) {
        softwareOptions.push(found);
        optionQuantities[found.id] = opt.quantity || 1;
      }
    }
  }

  // 5. Drives with quantities — use AI-provided specific article numbers
  const drives: DriveComponent[] = [];
  const driveQuantities: Record<string, number> = {};
  const feedModules = raw.drives?.feedMotorModules || 0;
  const spindleModules = raw.drives?.spindleMotorModules || 0;

  if (raw.drives) {
    const family = raw.drives.mainFamily || "S120_booksize";

    // Feed Motor Modules — with specs from lookup
    if (feedModules > 0) {
      const feedMmArticle = raw.drives.feedMotorModuleArticle;
      const feedSpecs = feedMmArticle ? MOTOR_MODULE_SPECS[feedMmArticle] : undefined;
      const feedDrive: DriveComponent = {
        id: `feed-mm-${feedMmArticle || "generic"}`,
        articleNumber: feedMmArticle || `${family} Motor Module`,
        name: feedMmArticle
          ? `Motor Module ${feedMmArticle}`
          : `${family} Motor Module (feed)`,
        driveFamily: family as DriveComponent["driveFamily"],
        componentType: "motor_module_single",
        ratedCurrent: feedSpecs ? `${feedSpecs.current}A` : undefined,
        ratedPower: feedSpecs ? `${feedSpecs.power}kW` : undefined,
        compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
        description: feedSpecs
          ? `Single Motor Module booksize | ${feedSpecs.current}A rated | ${feedSpecs.power}kW | ${feedSpecs.voltage}`
          : `Feed axis Motor Module`,
      };
      drives.push(feedDrive);
      driveQuantities[feedDrive.id] = feedModules;
    }

    // Spindle Motor Module — with specs
    if (spindleModules > 0) {
      const spindleMmArticle = raw.drives.spindleMotorModuleArticle || raw.drives.feedMotorModuleArticle;
      const spindleSpecs = spindleMmArticle ? MOTOR_MODULE_SPECS[spindleMmArticle] : undefined;
      const spindleDrive: DriveComponent = {
        id: `spindle-mm-${spindleMmArticle || "generic"}`,
        articleNumber: spindleMmArticle || `${family} Motor Module`,
        name: spindleMmArticle
          ? `Motor Module ${spindleMmArticle}`
          : `${family} Motor Module (spindle)`,
        driveFamily: family as DriveComponent["driveFamily"],
        componentType: "motor_module_single",
        ratedCurrent: spindleSpecs ? `${spindleSpecs.current}A` : undefined,
        ratedPower: spindleSpecs ? `${spindleSpecs.power}kW` : undefined,
        compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
        description: spindleSpecs
          ? `Single Motor Module booksize | ${spindleSpecs.current}A rated | ${spindleSpecs.power}kW | ${spindleSpecs.voltage}`
          : `Spindle Motor Module`,
      };
      drives.push(spindleDrive);
      driveQuantities[spindleDrive.id] = spindleModules;
    }

    // Line Module — validate sizing against total motor power
    const feedMmArt = raw.drives.feedMotorModuleArticle || "";
    const spindleMmArt = raw.drives.spindleMotorModuleArticle;
    const preferActive = (raw.drives.lineModule || "").toLowerCase().includes("active");
    const correctLm = selectLineModule(feedMmArt, feedModules, spindleMmArt, spindleModules, preferActive);

    // Use AI-provided article if valid, otherwise use calculated correct one
    const aiLineArticle = raw.drives.lineModuleArticle;
    const lineModuleArticle = aiLineArticle || correctLm.articleNumber;
    const lineModuleName = aiLineArticle ? (raw.drives.lineModule || correctLm.name) : correctLm.name;

    const lineDrive: DriveComponent = {
      id: `line-module-${lineModuleArticle}`,
      articleNumber: lineModuleArticle,
      name: lineModuleName,
      driveFamily: family as DriveComponent["driveFamily"],
      componentType: lineModuleName.toLowerCase().includes("active")
        ? "line_module_active"
        : lineModuleName.toLowerCase().includes("basic")
        ? "line_module_basic"
        : "line_module_smart",
      compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
      description: `Shared DC bus power supply — ${correctLm.ratedPower}kW rated`,
    };
    drives.push(lineDrive);
    driveQuantities[lineDrive.id] = 1;

    // Add Active Interface Module if Active Line Module selected
    if (correctLm.interfaceModule) {
      const ifm: DriveComponent = {
        id: `interface-module-${correctLm.interfaceModule}`,
        articleNumber: correctLm.interfaceModule,
        name: `Active Interface Module`,
        driveFamily: family as DriveComponent["driveFamily"],
        componentType: "interface_module",
        compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
        description: "Required for Active Line Module operation (Clean Power Filter)",
      };
      drives.push(ifm);
      driveQuantities[ifm.id] = 1;
    }

    // Validate drive system and add warnings
    const validation = validateDriveSystem({
      feedMotorModuleArticle: feedMmArt,
      feedModuleCount: feedModules,
      spindleMotorModuleArticle: spindleMmArt,
      spindleModuleCount: spindleModules,
      lineModuleArticle,
      controlUnitId,
      hmiPanelSize: undefined,
      mcpArticle: raw.mcp?.articleNumber,
    });
    for (const w of validation.warnings) {
      warnings.push({ severity: "warning", message: w, affectedComponents: ["drives"] });
    }
  }

  // 6. Motors with quantities — use AI-provided article numbers
  const motors: Motor[] = [];
  const motorQuantities: Record<string, number> = {};

  if (raw.motors && catalogData) {
    // Feed motors — with shaft height and specs from AI reason text
    const feedMotorMatch = catalogData.motors.find(
      (m) =>
        m.motorType === "feed_servo_sync" &&
        raw.motors!.feedMotors.includes(m.series)
    );
    if (feedMotorMatch) {
      const sh = raw.motors.feedMotorShaftHeight;
      const feedMotor = {
        ...feedMotorMatch,
        articleNumber: raw.motors.feedMotorArticle || feedMotorMatch.articleNumber,
        name: raw.motors.feedMotorArticle
          ? `${feedMotorMatch.name} (${raw.motors.feedMotorArticle})`
          : feedMotorMatch.name,
        description: sh
          ? `${feedMotorMatch.description} | SH${sh} | ${raw.motors.reason}`
          : feedMotorMatch.description,
      };
      motors.push(feedMotor);
      motorQuantities[feedMotor.id] = feedModules;
    }

    // Spindle motors — with specs
    if (raw.motors.spindleMotors && spindleModules > 0) {
      const spindleMatch = catalogData.motors.find(
        (m) =>
          (m.motorType === "main_spindle_async" ||
            m.motorType === "main_spindle_sync") &&
          raw.motors!.spindleMotors.includes(m.series)
      );
      if (spindleMatch) {
        const sh = raw.motors.spindleMotorShaftHeight;
        const spindleMotor = {
          ...spindleMatch,
          articleNumber: raw.motors.spindleMotorArticle || spindleMatch.articleNumber,
          name: raw.motors.spindleMotorArticle
            ? `${spindleMatch.name} (${raw.motors.spindleMotorArticle})`
            : spindleMatch.name,
          description: sh
            ? `${spindleMatch.description} | SH${sh} | ${raw.motors.reason}`
            : spindleMatch.description,
        };
        motors.push(spindleMotor);
        motorQuantities[spindleMotor.id] = spindleModules;
      }
    }
  }

  // 7. Measuring systems
  const measuringSystems: MeasuringSystem[] =
    catalogData?.measuringSystems.slice(0, 2) || [];

  // 8. HMI + MCP
  const hmiComponents: HmiComponent[] = [];
  if (raw.hmi) {
    const hmi = findHmiPanel(raw.hmi.type, raw.hmi.model);
    if (hmi) hmiComponents.push(hmi);
  }

  // Add MCP — must match HMI panel size
  if (controlUnitId.startsWith("NCU") && catalogData) {
    const hmiPanel = hmiComponents[0];
    const hmiSize = hmiPanel?.screenSize || 15;

    // MCP size must match panel size. Rules:
    // 12" panel → MCP 1500 (15", closest available)
    // 15" panel → MCP 1500 (15")
    // 19" panel → MCP 1900 (19")
    // 22" panel → MCP 2200 (22")
    // 24" panel → MCP 2400 (24")
    const mcpSizeMap: Record<number, string> = {
      12: "mcp_1500",
      15: "mcp_1500",
      19: "mcp_1900",
      22: "mcp_2200",
      24: "mcp_2400",
    };
    const closestSize = [12, 15, 19, 22, 24].reduce((prev, curr) =>
      Math.abs(curr - hmiSize) < Math.abs(prev - hmiSize) ? curr : prev
    );
    const mcpId = mcpSizeMap[closestSize];

    if (raw.mcp?.articleNumber) {
      const exactMcp = catalogData.hmiComponents.find(
        (h) => h.category === "mcp" && h.articleNumber === raw.mcp!.articleNumber
      );
      if (exactMcp) {
        hmiComponents.push(exactMcp);
      }
    } else {
      const matchedMcp = catalogData.hmiComponents.find(
        (h) => h.id === mcpId
      ) || catalogData.hmiComponents.find(
        (h) => h.category === "mcp"
      );
      if (matchedMcp) hmiComponents.push(matchedMcp);
    }
  }

  // 9. Safety
  const safetyFunctions: SafetyFunction[] = [];
  const basicSafety = catalogData?.safetyFunctions.filter(
    (sf) => sf.isBasicScope
  );
  if (basicSafety) safetyFunctions.push(...basicSafety);

  for (const code of raw.safety?.options || []) {
    const sf = findSafetyFunction(code);
    if (sf && !sf.isBasicScope) {
      safetyFunctions.push(sf);
    }
  }

  // 10. Auto-select cables
  let cables: CableAccessory[] = [];
  if (catalogData?.selectCables) {
    cables = catalogData.selectCables({
      feedAxes: feedModules,
      spindleAxes: spindleModules,
      controlUnitId: controlUnitId,
      hmiCategory: hmiComponents[0]?.category,
    });
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
    totalAxes: raw.totalAxes || 3,
    totalChannels: raw.totalChannels || 1,
    warnings,
    notes: raw.notes || [],
    estimatedComplexity:
      (raw.estimatedComplexity as GeneratedConfiguration["estimatedComplexity"]) ||
      "standard",
  };

  return config;
}
