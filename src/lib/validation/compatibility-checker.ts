import type {
  GeneratedConfiguration,
  CompatibilityWarning,
} from "@/types/catalog";

export function runCompatibilityChecks(
  config: GeneratedConfiguration
): CompatibilityWarning[] {
  const warnings: CompatibilityWarning[] = [];

  // 1. Axis limit check
  if (config.totalAxes > config.controlUnit.maxAxesSpindles) {
    warnings.push({
      severity: "error",
      message: `Total axes (${config.totalAxes}) exceeds ${config.controlUnit.name} maximum of ${config.controlUnit.maxAxesSpindles}`,
      affectedComponents: ["controlUnit", "axes"],
      suggestion: `Consider upgrading to ${config.controlUnit.maxAxesSpindles < 40 ? "NCU 1750 (40 axes)" : "NCU 1760 (50 axes)"}`,
    });
  }

  // 2. Channel limit check
  if (config.totalChannels > config.controlUnit.maxChannels) {
    warnings.push({
      severity: "error",
      message: `Total channels (${config.totalChannels}) exceeds ${config.controlUnit.name} maximum of ${config.controlUnit.maxChannels}`,
      affectedComponents: ["controlUnit", "channels"],
      suggestion: "Upgrade to NCU 1750 or NCU 1760 for up to 10 channels",
    });
  }

  // 3. 5-axis control unit check
  const has5Axis = [
    ...config.technologyPackages.map((p) => p.id),
    ...config.softwareOptions.map((o) => o.orderCode),
  ].some((id) => ["S43", "M30", "M15"].includes(id));

  if (
    has5Axis &&
    (config.controlUnit.id === "PPU_1740" ||
      config.controlUnit.id === "NCU_1740")
  ) {
    warnings.push({
      severity: "error",
      message:
        "5-axis machining (S43/M30/M15) requires NCU 1750 or NCU 1760",
      affectedComponents: ["controlUnit", "S43", "M30"],
      suggestion: "Upgrade to NCU 1750 for 5-axis capability",
    });
  }

  // 4. Export version restrictions
  if (config.softwareVariant === "export") {
    const nonExportOptions = config.softwareOptions.filter(
      (o) => !o.exportAvailable
    );
    const nonExportPackages = config.technologyPackages.filter(
      (p) => !p.exportAvailable
    );

    for (const opt of nonExportOptions) {
      warnings.push({
        severity: "error",
        message: `Option ${opt.orderCode} (${opt.name}) is not available in export version`,
        affectedComponents: [opt.orderCode],
        suggestion: "Switch to full scope CNC software (requires export license)",
      });
    }
    for (const pkg of nonExportPackages) {
      warnings.push({
        severity: "error",
        message: `Package ${pkg.orderCode} (${pkg.name}) is not available in export version`,
        affectedComponents: [pkg.orderCode],
        suggestion: "Switch to full scope CNC software (requires export license)",
      });
    }

    if (config.totalAxes > 4) {
      warnings.push({
        severity: "warning",
        message:
          "Export version limits simultaneous traversing axes to 4. Total configured axes exceed this limit.",
        affectedComponents: ["cncSoftware"],
        suggestion:
          "Not all axes can move simultaneously in export version. Switch to full scope if needed.",
      });
    }
  }

  // 5. Safety dependency check
  const safetyIds = config.safetyFunctions.map(
    (s) => s.orderCode || s.id
  );
  const hasKOptions = safetyIds.some(
    (id) => id && /^K\d+/.test(id)
  );
  const hasS61 = safetyIds.includes("S61");
  const hasS60 = safetyIds.includes("S60");

  if ((hasKOptions || hasS61) && !hasS60) {
    warnings.push({
      severity: "error",
      message:
        "Safety Integrated axis monitoring (K options / S61) requires Safety Integrated F-PLC (S60)",
      affectedComponents: ["S60", "safety"],
      suggestion: "Add S60 (Safety Integrated F-PLC) to the configuration",
    });
  }

  // 6. HMI pairing check
  const isNCU =
    config.controlUnit.id !== "PPU_1740";
  const hasExternalHmi = config.hmiComponents.some(
    (h) => h.category !== "ppu_panel"
  );

  if (isNCU && config.hmiComponents.length === 0) {
    warnings.push({
      severity: "warning",
      message:
        "Cabinet-based NCU requires a separate HMI panel (Thin Client, Flat Panel, or Panel PC)",
      affectedComponents: ["hmi"],
      suggestion: "Add a SIMATIC Thin Client or Panel PC for operator interface",
    });
  }

  if (!isNCU && hasExternalHmi) {
    warnings.push({
      severity: "info",
      message:
        "PPU 1740 has a built-in panel. External HMI panels are optional additional displays.",
      affectedComponents: ["hmi"],
    });
  }

  // 7. Technology package deduplication
  const packagedOptions = new Set<string>();
  for (const pkg of config.technologyPackages) {
    for (const opt of pkg.includedOptions) {
      packagedOptions.add(opt);
    }
  }

  for (const opt of config.softwareOptions) {
    if (packagedOptions.has(opt.orderCode)) {
      warnings.push({
        severity: "info",
        message: `Option ${opt.orderCode} (${opt.name}) is already included in a technology package and doesn't need to be ordered separately`,
        affectedComponents: [opt.orderCode],
      });
    }
  }

  return warnings;
}
