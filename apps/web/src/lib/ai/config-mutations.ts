import type { GeneratedConfiguration, DriveComponent, Motor, ControlUnit, HmiComponent, SoftwareOption, TechnologyPackage } from "@/types/catalog";
import type { SwapCategory } from "@/components/configurator/component-swap-dialog";
import {
  MOTOR_MODULE_SPECS,
  S200_CONVERTER_SPECS,
  S210_CONVERTER_SPECS,
  getMotorSpecs,
  getLineModuleByArticle,
  isSingleAxisConverter,
  motorPlatform,
  driveCliqDeviceCount,
  selectLineModule,
  getMatchingMcp,
} from "@/lib/validation/drive-system-rules";
import { selectCables } from "@/data/cables";
import { selectCablesS200 } from "@/data/cables-s200";
import { resolveFeedAxisMlfbs, resolveFullMotorMlfb } from "@/lib/mlfb/per-axis";
import { fl2FullMlfb } from "./family-rules";
import { runCompatibilityRules } from "@/data/compatibility-rules";

interface SwapOpts {
  shaftHeight?: number;
  /** User's cable length preference (machine specs form); default 10 m. */
  cableLengthMeters?: string;
}

/**
 * Apply a component swap, then re-derive everything downstream of it in the
 * engineering order motor → drive → line module → cables → rule warnings.
 * A motor swap picks the converter the catalog pairs with the motor, a drive
 * swap re-sizes the Line Module, and cables are always rebuilt from the
 * resulting motor + drive set.
 */
export function applySwap(
  config: GeneratedConfiguration,
  category: SwapCategory,
  articleNumber: string,
  opts?: SwapOpts
): GeneratedConfiguration {
  const updated: GeneratedConfiguration = {
    ...config,
    drives: [...config.drives],
    motors: [...config.motors],
    hmiComponents: [...config.hmiComponents],
    driveQuantities: { ...config.driveQuantities },
    motorQuantities: { ...config.motorQuantities },
    warnings: [...config.warnings],
  };

  switch (category) {
    case "motor_feed":
      swapFeedMotor(updated, articleNumber, opts?.shaftHeight);
      autoSizeDrivesForMotors(updated);
      break;

    case "motor_spindle":
      swapSpindleMotor(updated, articleNumber, opts?.shaftHeight);
      autoSizeDrivesForMotors(updated);
      break;

    case "motor_module_feed":
      swapMotorModule(updated, "feed", articleNumber);
      autoSizeLineModule(updated);
      break;

    case "motor_module_spindle":
      swapMotorModule(updated, "spindle", articleNumber);
      autoSizeLineModule(updated);
      break;

    case "line_module":
      swapLineModule(updated, articleNumber);
      break;

    case "control_unit":
      swapControlUnit(updated, articleNumber);
      break;
  }

  // Cables always follow the motor + drive set that resulted from the swap
  // (cross-section, brake cables, OCC vs DRIVE-CLiQ vs S200 topology).
  const withCables = regenerateCablesFor(updated, { cableLengthMeters: opts?.cableLengthMeters });
  return { ...withCables, warnings: [...withCables.warnings, ...runCompatibilityRules(withCables)] };
}

/**
 * Re-run selectCables for the current motor / drive / HMI set so that
 * motor power-cable cross-section, encoder cable count, and OCC vs
 * DRIVE-CLiQ topology stay in sync after a swap.
 *
 * Exported so other mutations (e.g. AI modify with userSpecsOverride)
 * can request a refresh too.
 */
export function regenerateCablesFor(
  config: GeneratedConfiguration,
  ctx: { cableLengthMeters?: string } = {},
): GeneratedConfiguration {
  const feedMm = config.drives.find((d) => d.id.startsWith("feed-mm-"));
  const spindleMm = config.drives.find((d) => d.id.startsWith("spindle-mm-"));
  const feedMotor = config.motors.find((m) => m.motorType === "feed_servo_sync");
  const spindleMotor = config.motors.find(
    (m) => m.motorType === "main_spindle_async" || m.motorType === "main_spindle_sync"
  );
  // Axis counts: the motors that exist (motor modules fall back for older configs).
  const feedAxes = feedMotor
    ? config.motorQuantities[feedMotor.id] || feedMotor.perAxisMlfbs?.length || (feedMm ? config.driveQuantities[feedMm.id] : 0) || 0
    : 0;
  const spindleAxes = spindleMotor
    ? config.motorQuantities[spindleMotor.id] || (spindleMm ? config.driveQuantities[spindleMm.id] : 0) || 1
    : 0;
  const cableLengthMeters = ctx.cableLengthMeters || config.cables.find((c) => c.category === "power_cable" && c.length)?.length?.replace(/\s*m.*$/i, "");

  // Drive platform from the converter actually paired with the motor.
  const platform = feedMm ? motorPlatform({ motorModule: feedMm.articleNumber }) : spindleMm ? motorPlatform({ motorModule: spindleMm.articleNumber }) : "S120";

  if (platform === "S200") {
    const cables = selectCablesS200({
      feedAxes,
      spindleAxes,
      feedShaftHeight: feedMotor?.shaftHeight,
      feedPowerKw: feedMotor?.ratedPower ? parseFloat(feedMotor.ratedPower) : undefined,
      feedBrakeAxes: feedMotor?.perAxisMlfbs?.filter((a) => a.brake).length ?? 0,
      spindleArticle: spindleMotor?.articleNumber,
      cableLengthMeters,
    });
    return { ...config, cables };
  }

  const lineModule = config.drives.find(isLineModule);
  const driveFamily = platform === "S210" ? "S210" : lineModule?.driveFamily || feedMm?.driveFamily || "S120_booksize";
  const cables = selectCables({
    feedAxes,
    spindleAxes,
    controlUnitId: config.controlUnit.id,
    hmiCategory: config.hmiComponents[0]?.category,
    driveFamily,
    feedMotorShaftHeight: feedMotor?.shaftHeight,
    spindleMotorShaftHeight: spindleMotor?.shaftHeight,
    cableLengthMeters,
    driveCliqCount: driveCliqDeviceCount(config.drives, config.driveQuantities),
  });

  return { ...config, cables };
}

function swapFeedMotor(config: GeneratedConfiguration, article: string, shaftHeight?: number) {
  const specs = getMotorSpecs(article);
  const existing = config.motors.findIndex((m) => m.motorType === "feed_servo_sync");
  const previous = existing >= 0 ? config.motors[existing] : undefined;

  // The axis layout (names, which axes carry a brake) belongs to the machine,
  // not to the motor — carry it over and rebuild the per-axis MLFBs.
  const axisNames = previous?.perAxisMlfbs?.map((a) => a.axis) ?? [];
  const brakeAxes = previous?.perAxisMlfbs?.filter((a) => a.brake).map((a) => a.axis) ?? [];
  const resolved = resolveFullMotorMlfb(article);
  let perAxisMlfbs: Motor["perAxisMlfbs"];
  if (article.startsWith("1FL2")) {
    resolved.mlfb = fl2FullMlfb(article, false);
    resolved.completeness = "verified";
    if (axisNames.length) {
      perAxisMlfbs = axisNames.map((axis) => ({
        axis,
        mlfb: fl2FullMlfb(article, brakeAxes.includes(axis)),
        brake: brakeAxes.includes(axis),
        completeness: "verified" as const,
      }));
    }
  } else if (axisNames.length) {
    perAxisMlfbs = resolveFeedAxisMlfbs({ baseArticle: article, axisNames, brakeAxes });
  }

  const updated: Motor = {
    id: `feed-${article}`,
    family: article.includes("1PH") ? "SIMOTICS_M" : "SIMOTICS_S",
    series: article.substring(0, 5),
    name: `${specs?.family || "Servo motor"} SH${specs?.shaftHeight || shaftHeight || "?"}`,
    articleNumber: resolved.mlfb,
    motorType: "feed_servo_sync",
    connectionType: "standard",
    compatibility: previous?.compatibility ?? { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
    description: `${specs?.family || "Feed servo motor"} ${specs?.variant || ""}`.trim(),
    shaftHeight: specs?.shaftHeight || shaftHeight,
    ratedPower: specs?.ratedPower,
    ratedTorque: specs?.ratedTorque,
    ratedSpeed: specs?.ratedSpeed,
    maxTorque: specs?.maxTorque,
    maxSpeed: specs?.maxSpeed,
    ratedCurrent: specs?.ratedCurrent,
    perAxisMlfbs,
    mlfbCompleteness: resolved.completeness,
  };

  if (existing >= 0) {
    const oldQty = config.motorQuantities[config.motors[existing].id] || 1;
    delete config.motorQuantities[config.motors[existing].id];
    config.motors[existing] = updated;
    config.motorQuantities[updated.id] = oldQty;
  } else {
    config.motors.unshift(updated);
    config.motorQuantities[updated.id] = 1;
  }
}

function swapSpindleMotor(config: GeneratedConfiguration, article: string, shaftHeight?: number) {
  const specs = getMotorSpecs(article);
  const existing = config.motors.findIndex(
    (m) => m.motorType === "main_spindle_async" || m.motorType === "main_spindle_sync"
  );

  const previous = existing >= 0 ? config.motors[existing] : undefined;
  const updated: Motor = {
    id: `spindle-${article}`,
    family: "SIMOTICS_M",
    compatibility: previous?.compatibility ?? { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
    series: article.substring(0, 5),
    name: `${specs?.family || "Spindle motor"} SH${specs?.shaftHeight || shaftHeight || "?"}`,
    articleNumber: article,
    motorType: specs?.kind === "spindle_sync" ? "main_spindle_sync" : "main_spindle_async",
    connectionType: "standard",
    description: `${specs?.family || "Main spindle motor"} ${specs?.variant || ""}`.trim(),
    mlfbCompleteness: resolveFullMotorMlfb(article).completeness,
    shaftHeight: specs?.shaftHeight || shaftHeight,
    ratedPower: specs?.ratedPower,
    ratedTorque: specs?.ratedTorque,
    ratedSpeed: specs?.ratedSpeed,
    maxTorque: specs?.maxTorque,
    maxSpeed: specs?.maxSpeed,
    ratedCurrent: specs?.ratedCurrent,
  };

  if (existing >= 0) {
    const oldQty = config.motorQuantities[config.motors[existing].id] || 1;
    delete config.motorQuantities[config.motors[existing].id];
    config.motors[existing] = updated;
    config.motorQuantities[updated.id] = oldQty;
  } else {
    config.motors.push(updated);
    config.motorQuantities[updated.id] = 1;
  }
}

function swapMotorModule(config: GeneratedConfiguration, kind: "feed" | "spindle", article: string) {
  const specs = MOTOR_MODULE_SPECS[article];
  const s200 = S200_CONVERTER_SPECS[article];
  const s210 = S210_CONVERTER_SPECS[article];
  const platform = motorPlatform({ motorModule: article });
  const idPrefix = `${kind}-mm-`;
  const existing = config.drives.findIndex((d) => d.id.startsWith(idPrefix));
  const previous = existing >= 0 ? config.drives[existing] : undefined;

  const updated: DriveComponent = {
    id: `${kind}-mm-${article}`,
    articleNumber: article,
    name: s200
      ? `SINAMICS S200 ${/1EE/.test(article) ? "Spindle " : "PN 400 V "}converter ${s200.frame}, ${s200.power} kW`
      : s210
        ? `SINAMICS S210 converter ${s210.frame} ${s210.voltage}`
        : `Motor Module ${article}`,
    driveFamily: platform === "S200" ? "S200" : platform === "S210" ? "S210" : "S120_booksize",
    componentType: "motor_module_single",
    ratedCurrent: s200 ? `${s200.current}A` : specs ? `${specs.current}A` : undefined,
    ratedPower: s200 ? `${s200.power}kW` : s210 ? `${s210.power}kW` : specs ? `${specs.power}kW` : undefined,
    frameType: s200?.frame ?? s210?.frame,
    compatibility: previous?.compatibility ?? { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
    description: s200
      ? "SINAMICS S200 PN servo converter with STO and integrated braking resistor"
      : s210
        ? `Single-axis servo converter with integrated infeed | ${s210.power}kW | ${s210.voltage}`
        : specs
          ? `Single Motor Module booksize | ${specs.current}A rated | ${specs.power}kW | ${specs.voltage}`
          : `${kind} Motor Module`,
  };

  if (existing >= 0) {
    const oldQty = config.driveQuantities[config.drives[existing].id] || 1;
    delete config.driveQuantities[config.drives[existing].id];
    config.drives[existing] = updated;
    config.driveQuantities[updated.id] = oldQty;
  } else {
    config.drives.unshift(updated);
    config.driveQuantities[updated.id] = 1;
  }
}

const isLineModule = (d: DriveComponent) =>
  d.componentType === "line_module_active" ||
  d.componentType === "line_module_smart" ||
  d.componentType === "line_module_basic";

/** Drop the Line Module and any Active Interface Module (S210-only configs need neither). */
function removeLineModule(config: GeneratedConfiguration) {
  for (const d of config.drives) {
    if (isLineModule(d) || d.componentType === "interface_module") delete config.driveQuantities[d.id];
  }
  config.drives = config.drives.filter((d) => !isLineModule(d) && d.componentType !== "interface_module");
}

/**
 * Replace the Line Module and keep the mandatory Active Interface Module
 * in sync: an Active Line Module always needs its Clean Power Filter,
 * a Smart/Basic one never does.
 */
function swapLineModule(config: GeneratedConfiguration, article: string) {
  const catalog = getLineModuleByArticle(article);
  const existing = config.drives.findIndex(isLineModule);

  const type = catalog?.type ?? (article.includes("7TE") ? "active" : article.includes("1TE") ? "basic" : "smart");
  const updated: DriveComponent = {
    id: `line-module-${article}`,
    articleNumber: article,
    name: catalog?.name ?? `Line Module ${article}`,
    driveFamily: "S120_booksize",
    componentType: type === "active" ? "line_module_active" : type === "basic" ? "line_module_basic" : "line_module_smart",
    ratedPower: catalog ? `${catalog.ratedPower}kW` : undefined,
    compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
    description: catalog
      ? `Shared DC bus power supply — ${catalog.ratedPower}kW rated, sized for feed+spindle motor total`
      : "Shared DC bus power supply",
  };

  if (existing >= 0) {
    delete config.driveQuantities[config.drives[existing].id];
    config.drives[existing] = updated;
  } else {
    config.drives.push(updated);
  }
  config.driveQuantities[updated.id] = 1;

  // Interface module: remove any stale one, then add the matching one if required.
  for (const d of config.drives) {
    if (d.componentType === "interface_module") delete config.driveQuantities[d.id];
  }
  config.drives = config.drives.filter((d) => d.componentType !== "interface_module");
  if (catalog?.interfaceModule) {
    const lmIndex = config.drives.findIndex(isLineModule);
    const ifm: DriveComponent = {
      id: `interface-module-${catalog.interfaceModule}`,
      articleNumber: catalog.interfaceModule,
      name: "Active Interface Module",
      driveFamily: "S120_booksize",
      componentType: "interface_module",
      compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
      description: "Required for Active Line Module operation (Clean Power Filter)",
    };
    config.drives.splice(lmIndex + 1, 0, ifm);
    config.driveQuantities[ifm.id] = 1;
  }
}

function swapControlUnit(config: GeneratedConfiguration, article: string) {
  const cuMap: Record<string, Partial<ControlUnit>> = {
    "6FC5317-4AA00-1CA0": { id: "PPU_1740", name: "PPU 1740 (15\" panel)", maxAxesSpindles: 20, maxChannels: 4, driveCliqPorts: 4 },
    "6FC5317-4AA00-1DA0": { id: "PPU_1740", name: "PPU 1740 (19\" panel)", maxAxesSpindles: 20, maxChannels: 4, driveCliqPorts: 4 },
    "6FC5317-4AA00-0AA0": { id: "NCU_1740", name: "NCU 1740", maxAxesSpindles: 20, maxChannels: 4, driveCliqPorts: 4 },
    "6FC5317-5AA00-0AA1": { id: "NCU_1750", name: "NCU 1750", maxAxesSpindles: 40, maxChannels: 10, driveCliqPorts: 6 },
    "6FC5317-6AA00-0AA0": { id: "NCU_1760", name: "NCU 1760 (HSC)", maxAxesSpindles: 50, maxChannels: 10, driveCliqPorts: 6 },
  };

  const partial = cuMap[article];
  if (partial) {
    config.controlUnit = { ...config.controlUnit, ...partial, articleNumber: article } as ControlUnit;
  }
}

function autoSizeDrivesForMotors(config: GeneratedConfiguration) {
  // If motor changed, update Motor Module to match current draw
  const feedMotor = config.motors.find((m) => m.motorType === "feed_servo_sync");
  const spindleMotor = config.motors.find(
    (m) => m.motorType === "main_spindle_async" || m.motorType === "main_spindle_sync"
  );

  // The converter the catalog pairs with the motor wins (this is what makes
  // 1FK2 → S210 and 1FL2 → S200 work); a current match is the fallback.
  const moduleFor = (motor: Motor | undefined) => {
    if (!motor) return undefined;
    const paired = getMotorSpecs(motor.articleNumber ?? "")?.motorModule;
    if (paired) return paired;
    return motor.ratedCurrent ? findMotorModuleForCurrent(parseFloat(motor.ratedCurrent)) : undefined;
  };
  const feedTarget = moduleFor(feedMotor);
  if (feedTarget) swapMotorModule(config, "feed", feedTarget);
  const spindleTarget = moduleFor(spindleMotor);
  if (spindleTarget) swapMotorModule(config, "spindle", spindleTarget);

  autoSizeLineModule(config);

  // Re-select MCP if control unit is NCU
  if (config.controlUnit.id.startsWith("NCU")) {
    const hmiPanel = config.hmiComponents.find(
      (h) => h.category === "thin_client" || h.category === "flat_panel" || h.category === "panel_pc"
    );
    const panelSize = hmiPanel?.screenSize || 15;
    const mcp = getMatchingMcp(panelSize);
    const existingMcpIdx = config.hmiComponents.findIndex((h) => h.category === "mcp");
    const mcpComponent: HmiComponent = {
      id: mcp.mcpId,
      articleNumber: mcp.mcpArticle,
      name: mcp.mcpName,
      category: "mcp",
      compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
      description: `Machine Control Panel matching ${panelSize}" display`,
    };
    if (existingMcpIdx >= 0) {
      config.hmiComponents[existingMcpIdx] = mcpComponent;
    } else {
      config.hmiComponents.push(mcpComponent);
    }
  }
}

function findMotorModuleForCurrent(amps: number): string | undefined {
  // Find smallest Motor Module whose rated current >= required
  const sorted = Object.entries(MOTOR_MODULE_SPECS).sort(
    ([, a], [, b]) => a.current - b.current
  );
  for (const [article, specs] of sorted) {
    if (specs.current >= amps) return article;
  }
  return sorted[sorted.length - 1]?.[0];
}

/** Add a software option (A01-A28, M-, P-, S-codes) if not already present. */
export function addSoftwareOption(
  config: GeneratedConfiguration,
  option: SoftwareOption,
  quantity: number = 1
): GeneratedConfiguration {
  // If already present, bump quantity
  const existing = config.softwareOptions.find((o) => o.id === option.id);
  if (existing) {
    return {
      ...config,
      optionQuantities: {
        ...config.optionQuantities,
        [existing.id]: (config.optionQuantities[existing.id] || 1) + quantity,
      },
    };
  }
  return {
    ...config,
    softwareOptions: [...config.softwareOptions, option],
    optionQuantities: { ...config.optionQuantities, [option.id]: quantity },
  };
}

/** Remove a software option by id OR order code (e.g. "opt-A03" or "A03"). */
export function removeSoftwareOption(
  config: GeneratedConfiguration,
  identifier: string
): GeneratedConfiguration {
  const target = config.softwareOptions.find(
    (o) => o.id === identifier || o.orderCode === identifier
  );
  if (!target) return config;
  const { [target.id]: _dropped, ...rest } = config.optionQuantities;
  void _dropped;
  return {
    ...config,
    softwareOptions: config.softwareOptions.filter((o) => o.id !== target.id),
    optionQuantities: rest,
  };
}

/**
 * Add a non-basic safety function. Basic safety (STO/SS1/SBC) is always
 * present and not addable separately.
 */
export function addSafetyFunction(
  config: GeneratedConfiguration,
  safetyFn: import("@/types/catalog").SafetyFunction
): GeneratedConfiguration {
  if (safetyFn.isBasicScope) return config;
  if (config.safetyFunctions.some((s) => s.id === safetyFn.id)) return config;
  return {
    ...config,
    safetyFunctions: [...config.safetyFunctions, safetyFn],
  };
}

/**
 * Remove a non-basic safety function (e.g. S60, S61, K-axis). Basic safety
 * (STO/SS1/SBC, marked isBasicScope) cannot be removed because it is part of
 * the integrated control unit hardware.
 *
 * Accepts the safety function's id, orderCode, or a substring of either.
 * Removing S60 (F-PLC) also drops every option that depends on it (S61, K*).
 */
export function removeSafetyFunctions(
  config: GeneratedConfiguration,
  identifiers: string[]
): GeneratedConfiguration {
  const wanted = identifiers.map((s) => s.toLowerCase());
  const keptInitial = config.safetyFunctions.filter((sf) => {
    if (sf.isBasicScope) return true; // never remove basic scope
    const code = (sf.orderCode || "").toLowerCase();
    const id = sf.id.toLowerCase();
    return !wanted.some((w) => code === w || id === w || id.includes(w) || code.includes(w));
  });

  // If S60 was removed, cascade-remove anything that requires it
  const removingS60 = config.safetyFunctions.some(
    (sf) => !sf.isBasicScope && (sf.orderCode === "S60" || sf.id.toLowerCase().includes("s60"))
  ) && !keptInitial.some(
    (sf) => sf.orderCode === "S60" || sf.id.toLowerCase().includes("s60")
  );

  const kept = removingS60
    ? keptInitial.filter((sf) => {
        if (sf.isBasicScope) return true;
        const code = (sf.orderCode || "").toUpperCase();
        // S61 (multi-axis) and K* (per-axis) all require S60
        return code !== "S61" && !/^K\d/.test(code);
      })
    : keptInitial;

  return { ...config, safetyFunctions: kept };
}

/** Add a technology package (bundles options). */
export function addTechnologyPackage(
  config: GeneratedConfiguration,
  pkg: TechnologyPackage
): GeneratedConfiguration {
  if (config.technologyPackages.some((p) => p.id === pkg.id)) return config;
  // Remove any individual options that are now bundled in the package
  const bundled = new Set(pkg.includedOptions);
  return {
    ...config,
    technologyPackages: [...config.technologyPackages, pkg],
    softwareOptions: config.softwareOptions.filter((o) => !bundled.has(o.orderCode)),
  };
}

/** Remove a technology package by id or order code. */
export function removeTechnologyPackage(
  config: GeneratedConfiguration,
  identifier: string
): GeneratedConfiguration {
  const target = config.technologyPackages.find(
    (p) => p.id === identifier || p.orderCode === identifier
  );
  if (!target) return config;
  return {
    ...config,
    technologyPackages: config.technologyPackages.filter((p) => p.id !== target.id),
  };
}

/**
 * Switch the CNC software variant (export ↔ full_scope) by finding a matching
 * catalog entry of the same SW version. Caller must pass in the catalog so we
 * stay decoupled from data imports here.
 */
export function setCncSoftwareVariant(
  config: GeneratedConfiguration,
  variant: "export" | "full_scope",
  catalog: import("@/types/catalog").CncSoftware[]
): GeneratedConfiguration {
  if (config.softwareVariant === variant) return config;
  const currentVersion = config.cncSoftware.swVersion;
  const matching = catalog.find(
    (sw) => sw.variant === variant && sw.swVersion === currentVersion
  ) ?? catalog.find((sw) => sw.variant === variant);
  if (!matching) return config;
  return { ...config, cncSoftware: matching, softwareVariant: variant };
}

/**
 * Replace the HMI panel and matching MCP based on a target panel size in inches.
 * For NCU control units this also re-derives the matching MCP. For PPU control
 * units (panel-based) this is a no-op since the HMI is built in.
 */
export function setHmiPanelSize(
  config: GeneratedConfiguration,
  panelSizeInch: number,
  catalog: HmiComponent[]
): GeneratedConfiguration {
  if (config.controlUnit.id === "PPU_1740") return config;

  const currentHmi = config.hmiComponents.find(
    (h) =>
      h.category === "thin_client" ||
      h.category === "panel_pc" ||
      h.category === "flat_panel"
  );
  const category = currentHmi?.category ?? "thin_client";
  const newHmi =
    catalog.find((h) => h.category === category && h.screenSize === panelSizeInch) ??
    catalog.find((h) => h.category === category);

  const mcpMatch = getMatchingMcp(panelSizeInch);
  const mcpFromCatalog = catalog.find(
    (h) => h.category === "mcp" && h.articleNumber === mcpMatch.mcpArticle
  );
  const mcpComponent: HmiComponent =
    mcpFromCatalog ?? {
      id: mcpMatch.mcpId,
      articleNumber: mcpMatch.mcpArticle,
      name: mcpMatch.mcpName,
      category: "mcp",
      compatibility: { PPU_1740: "option", NCU_1740: "option", NCU_1750: "option", NCU_1760: "option" },
      description: `Machine Control Panel matching ${panelSizeInch}" display`,
    };

  const next = config.hmiComponents.filter(
    (h) => h.category !== "mcp" && h.category !== category
  );
  if (newHmi) next.push(newHmi);
  next.push(mcpComponent);
  return { ...config, hmiComponents: next };
}

/** Replace the operator HMI by article number; MCP is re-matched to the new size. */
export function swapHmi(
  config: GeneratedConfiguration,
  hmiArticle: string,
  catalog: HmiComponent[]
): GeneratedConfiguration {
  const newHmi = catalog.find((h) => h.articleNumber === hmiArticle);
  if (!newHmi) return config;
  if (newHmi.category === "mcp") return swapMcp(config, hmiArticle, catalog);
  // Re-derive MCP for the new panel size
  return setHmiPanelSize(config, newHmi.screenSize ?? 15, catalog);
}

/** Replace the MCP only, leaving the HMI panel unchanged. */
export function swapMcp(
  config: GeneratedConfiguration,
  mcpArticle: string,
  catalog: HmiComponent[]
): GeneratedConfiguration {
  const newMcp = catalog.find((h) => h.category === "mcp" && h.articleNumber === mcpArticle);
  if (!newMcp) return config;
  const next = config.hmiComponents.filter((h) => h.category !== "mcp");
  next.push(newMcp);
  return { ...config, hmiComponents: next };
}

/**
 * Set or remove the handheld terminal.
 *
 * Auto-bundles the catalog accessories without which the handheld is
 * physically unusable:
 *   "ht2"  → SINUMERIK HT 2 (6FC5303-0AA00-2AA0)
 *            + Basic PN connection module (6FC5303-0AA01-1AA0)
 *            + Spiral connection cable 1.5–3.5 m (6FC5348-0AA08-3AA0)
 *   "ht10" → SINUMERIK HT 10 (6FC5303-0AF20-2AA0)
 *            + Connection cable 5 m (6XV1440-4BH50)  [user can swap length]
 *   "none" → drop the handheld AND any handheld accessories
 *
 * Accessories from a previous handheld choice are removed first so we
 * don't end up with HT 2 cables alongside an HT 10.
 */
export function setHandheldTerminal(
  config: GeneratedConfiguration,
  choice: "none" | "ht2" | "ht10",
  catalog: HmiComponent[]
): GeneratedConfiguration {
  // Drop any current handheld + handheld accessories
  const next = config.hmiComponents.filter(
    (h) => h.category !== "handheld_terminal" && h.category !== "handheld_accessory"
  );

  if (choice !== "none") {
    const handheldId = choice === "ht10" ? "handheld_ht10" : "handheld_ht2";
    const handheld = catalog.find((h) => h.id === handheldId);
    if (handheld) next.push(handheld);

    const accessoryIds =
      choice === "ht2"
        ? ["ht2_basic_pn_module", "ht2_spiral_cable"]
        : ["ht10_cable_5m"];

    for (const id of accessoryIds) {
      const acc = catalog.find((h) => h.id === id);
      if (acc) next.push(acc);
    }
  }

  return { ...config, hmiComponents: next };
}

/**
 * Set or remove the machine I/O module.
 *   "pp_72_48" → PP 72/48 D PN (default for NCU)
 *   "et200sp"  → ET 200SP CPU + (caller can add DI/DQ modules separately)
 *   "none"     → remove any current I/O module
 */
export function setIoModule(
  config: GeneratedConfiguration,
  choice: "none" | "pp_72_48" | "et200sp",
  catalog: HmiComponent[]
): GeneratedConfiguration {
  // Drop any existing io_module entries (PP 72/48, ET200SP CPU, DI/DQ modules)
  const next = config.hmiComponents.filter((h) => h.category !== "io_module");
  if (choice !== "none") {
    const id = choice === "et200sp" ? "io_et200sp_cpu" : "io_pp_72_48";
    const io = catalog.find((h) => h.id === id);
    if (io) next.push(io);
  }
  return { ...config, hmiComponents: next };
}

function autoSizeLineModule(config: GeneratedConfiguration) {
  const feedMm = config.drives.find((d) => d.id.startsWith("feed-mm-"));
  const spindleMm = config.drives.find((d) => d.id.startsWith("spindle-mm-"));
  const feedQty = feedMm ? config.driveQuantities[feedMm.id] || 1 : 0;
  const spindleQty = spindleMm ? config.driveQuantities[spindleMm.id] || 1 : 0;

  const lineModule = config.drives.find(isLineModule);
  const preferActive = lineModule?.componentType === "line_module_active";

  // S210 / S200 converters carry their own infeed. If every motor module is
  // such a unit there is nothing for a Line Module to feed.
  const s120Feed = feedMm && !isSingleAxisConverter(feedMm.articleNumber);
  const s120Spindle = spindleMm && !isSingleAxisConverter(spindleMm.articleNumber);
  if (!s120Feed && !s120Spindle) {
    removeLineModule(config);
    return;
  }

  const correctLm = selectLineModule(
    feedMm?.articleNumber || "",
    feedQty,
    spindleMm?.articleNumber,
    spindleQty,
    preferActive
  );

  if (correctLm && (!lineModule || lineModule.articleNumber !== correctLm.articleNumber)) {
    swapLineModule(config, correctLm.articleNumber);
  }
}
