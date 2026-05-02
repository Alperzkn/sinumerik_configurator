// ============================================================
// SINUMERIK ONE Compatibility Rules
// Validation rules for configuration checks
// ============================================================

import type { CompatibilityRule, CompatibilityWarning, GeneratedConfiguration } from "@/types/catalog";

export const compatibilityRules: CompatibilityRule[] = [
  {
    id: "axis-limit-check",
    name: "Axis/Spindle Limit Check",
    description: "Validates that total axes and spindles do not exceed the control unit maximum.",
    check: (config: GeneratedConfiguration): CompatibilityWarning | null => {
      const maxAxes = config.controlUnit.maxAxesSpindles;
      if (config.totalAxes > maxAxes) {
        return {
          severity: "error",
          message: `Total axes/spindles (${config.totalAxes}) exceeds the ${config.controlUnit.name} maximum of ${maxAxes}.`,
          affectedComponents: [config.controlUnit.id],
          suggestion: `Reduce the number of axes or upgrade to a higher-performance control unit (e.g., NCU 1750 or NCU 1760).`,
        };
      }
      return null;
    },
  },
  {
    id: "five-axis-control-unit-check",
    name: "5-Axis Control Unit Check",
    description:
      "Ensures that 5-axis packages and options are only used with compatible control units (NCU 1750/1760).",
    check: (config: GeneratedConfiguration): CompatibilityWarning | null => {
      const fiveAxisCodes = ["M30", "S43", "M15"];
      const controlUnit = config.controlUnit.id;

      if (controlUnit === "PPU_1740" || controlUnit === "NCU_1740") {
        const fiveAxisPackage = config.technologyPackages.find((pkg) =>
          fiveAxisCodes.includes(pkg.orderCode)
        );
        const fiveAxisOption = config.softwareOptions.find((opt) =>
          fiveAxisCodes.includes(opt.orderCode)
        );
        const found = fiveAxisPackage || fiveAxisOption;

        if (found) {
          const code = fiveAxisPackage?.orderCode ?? fiveAxisOption?.orderCode ?? "";
          return {
            severity: "error",
            message: `Option ${code} requires 5-axis capability which is not available on ${config.controlUnit.name}.`,
            affectedComponents: [config.controlUnit.id, code],
            suggestion: "Upgrade to NCU 1750 or NCU 1760 for 5-axis machining support.",
          };
        }
      }
      return null;
    },
  },
  {
    id: "export-restriction-check",
    name: "Export Restriction Check",
    description:
      "Validates that no export-restricted options are included when the software variant is set to export.",
    check: (config: GeneratedConfiguration): CompatibilityWarning | null => {
      if (config.softwareVariant !== "export") {
        return null;
      }

      const restricted = config.softwareOptions.filter((opt) => !opt.exportAvailable);
      const restrictedPkgs = config.technologyPackages.filter((pkg) => !pkg.exportAvailable);
      const allRestricted = [
        ...restricted.map((o) => o.orderCode),
        ...restrictedPkgs.map((p) => p.orderCode),
      ];

      if (allRestricted.length > 0) {
        return {
          severity: "error",
          message: `The following options are not available in the export version: ${allRestricted.join(", ")}.`,
          affectedComponents: allRestricted,
          suggestion:
            "Remove the restricted options or switch to the full-scope software variant (requires export approval).",
        };
      }
      return null;
    },
  },
  {
    id: "safety-dependency-check",
    name: "Safety Dependency Check",
    description:
      "Ensures that Safety Integrated F-PLC (S60) is present when safety axis options (K01-K09) or multi-axis safety (S61) are selected.",
    check: (config: GeneratedConfiguration): CompatibilityWarning | null => {
      const safetyAxisCodes = ["K01", "K02", "K03", "K04", "K05", "K06", "K07", "K08", "K09", "S61"];
      const hasS60 = config.softwareOptions.some((opt) => opt.orderCode === "S60");
      const safetyCodes = config.softwareOptions
        .filter((opt) => safetyAxisCodes.includes(opt.orderCode))
        .map((opt) => opt.orderCode);

      if (safetyCodes.length > 0 && !hasS60) {
        return {
          severity: "error",
          message: `Safety options ${safetyCodes.join(", ")} require Safety Integrated F-PLC (S60) which is not in the configuration.`,
          affectedComponents: ["S60", ...safetyCodes],
          suggestion: "Add option S60 (Safety Integrated F-PLC) to the configuration.",
        };
      }
      return null;
    },
  },
  {
    id: "hmi-pairing-check",
    name: "HMI Pairing Check",
    description:
      "Warns if an NCU-based configuration has no HMI component, or if a PPU configuration has an external HMI selected.",
    check: (config: GeneratedConfiguration): CompatibilityWarning | null => {
      const controlUnit = config.controlUnit.id;
      const hasHmi = config.hmiComponents.length > 0;

      if (
        (controlUnit === "NCU_1740" || controlUnit === "NCU_1750" || controlUnit === "NCU_1760") &&
        !hasHmi
      ) {
        return {
          severity: "warning",
          message: `NCU-based configuration (${config.controlUnit.name}) has no HMI component selected. An operator panel or thin client is required for operation.`,
          affectedComponents: [config.controlUnit.id],
          suggestion:
            "Add a thin client (ITC series), Panel PC (IPC series), or flat panel (IFP series) to the configuration.",
        };
      }

      if (controlUnit === "PPU_1740" && hasHmi) {
        const externalHmi = config.hmiComponents.some(
          (hmi) => hmi.category !== "ppu_panel" && hmi.category !== "mcp" && hmi.category !== "handwheel"
        );
        if (externalHmi) {
          return {
            severity: "info",
            message:
              "PPU configurations include a built-in panel. External HMI components are typically not needed unless used as a secondary display.",
            affectedComponents: [
              config.controlUnit.id,
              ...config.hmiComponents.map((h) => h.id),
            ],
            suggestion:
              "Verify that the external HMI is intended as a secondary display. For standalone operation, the built-in PPU panel is sufficient.",
          };
        }
      }
      return null;
    },
  },
  {
    id: "channel-limit-check",
    name: "Channel Limit Check",
    description: "Validates that total channels do not exceed the control unit maximum.",
    check: (config: GeneratedConfiguration): CompatibilityWarning | null => {
      const maxChannels = config.controlUnit.maxChannels;
      if (config.totalChannels > maxChannels) {
        return {
          severity: "error",
          message: `Total channels (${config.totalChannels}) exceeds the ${config.controlUnit.name} maximum of ${maxChannels}.`,
          affectedComponents: [config.controlUnit.id],
          suggestion: `Reduce the number of channels or upgrade to a control unit with more channel capacity.`,
        };
      }
      return null;
    },
  },
  {
    id: "s210-mixing-check",
    name: "S210 Drive Mixing Check",
    description:
      "Warns about mixing S210 drives with S120/S220 drives in the same configuration, as they use different interpolation groups.",
    check: (config: GeneratedConfiguration): CompatibilityWarning | null => {
      const hasS210 = config.drives.some((d) => d.driveFamily === "S210");
      const hasS120orS220 = config.drives.some(
        (d) => d.driveFamily === "S120_booksize" || d.driveFamily === "S120_chassis" || d.driveFamily === "S220"
      );

      if (hasS210 && hasS120orS220) {
        return {
          severity: "warning",
          message:
            "Configuration mixes S210 and S120/S220 drives. These operate in separate interpolation groups and require careful configuration of the drive topology.",
          affectedComponents: config.drives.map((d) => d.id),
          suggestion:
            "Ensure the drive topology is correctly configured with separate interpolation groups for S210 and S120/S220 drives. Consult the SINUMERIK commissioning guide.",
        };
      }
      return null;
    },
  },
  {
    id: "tech-package-dedup",
    name: "Technology Package Deduplication",
    description:
      "Informs if a technology package already includes an option that is also listed separately, causing redundancy.",
    check: (config: GeneratedConfiguration): CompatibilityWarning | null => {
      const redundant: string[] = [];

      for (const pkg of config.technologyPackages) {
        for (const opt of config.softwareOptions) {
          if (pkg.includedOptions.includes(opt.orderCode)) {
            redundant.push(opt.orderCode);
          }
        }
      }

      if (redundant.length > 0) {
        const unique = [...new Set(redundant)];
        return {
          severity: "info",
          message: `The following options are already included in a technology package and do not need to be ordered separately: ${unique.join(", ")}.`,
          affectedComponents: unique,
          suggestion:
            "Remove the individually listed options that are already covered by the technology package to simplify the order and reduce cost.",
        };
      }
      return null;
    },
  },
  {
    id: "nx-expansion-check",
    name: "NX Expansion Module Check",
    description:
      "Warns if the number of drive axes may exceed available DRIVE-CLiQ ports and no NX expansion is configured.",
    check: (config: GeneratedConfiguration): CompatibilityWarning | null => {
      const driveCliqPorts = config.controlUnit.driveCliqPorts;
      const totalDriveAxes = config.drives.length;

      if (totalDriveAxes > driveCliqPorts && config.controlUnit.maxNX > 0) {
        const hasNX = config.drives.some(
          (d) => d.name.toLowerCase().includes("nx") || d.componentType === "interface_module"
        );
        if (!hasNX) {
          return {
            severity: "warning",
            message: `Configuration has ${totalDriveAxes} drive components but only ${driveCliqPorts} DRIVE-CLiQ ports on the ${config.controlUnit.name}. An NX expansion module may be required.`,
            affectedComponents: [config.controlUnit.id],
            suggestion: `Add an NX expansion module (up to ${config.controlUnit.maxNX} supported) to provide additional DRIVE-CLiQ ports.`,
          };
        }
      }
      return null;
    },
  },
];
