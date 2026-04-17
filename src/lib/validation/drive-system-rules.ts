/**
 * SINUMERIK ONE Drive System Sizing Rules
 * Based on Siemens D21.4 and NC63 catalogs
 *
 * These rules validate and correct drive system configurations:
 * - Line Module must cover total motor power
 * - DRIVE-CLiQ cable count based on actual topology
 * - Motor Module current must match motor rated current
 * - Cable cross-section matched to motor shaft height / current
 * - MCP size must match HMI panel size
 * - NCU DRIVE-CLiQ port limits
 */

// ─── Line Module Sizing ───
// Rule: Line Module rated power >= sum of all Motor Module rated powers
// With typical 70% simultaneity factor for machine tools

export interface LineModuleOption {
  articleNumber: string;
  ratedPower: number;
  type: "smart" | "active" | "basic";
  name: string;
  interfaceModule?: string;
}

const LINE_MODULES: LineModuleOption[] = [
  { articleNumber: "6SL3130-6AE15-0AB1", ratedPower: 5, type: "smart", name: "Smart Line Module 5kW" },
  { articleNumber: "6SL3130-6AE21-0AB1", ratedPower: 10, type: "smart", name: "Smart Line Module 10kW" },
  { articleNumber: "6SL3130-6TE23-6AA3", ratedPower: 36, type: "smart", name: "Smart Line Module 36kW" },
  { articleNumber: "6SL3130-6TE25-5AA3", ratedPower: 55, type: "smart", name: "Smart Line Module 55kW" },
  { articleNumber: "6SL3130-7TE21-6AA4", ratedPower: 16, type: "active", name: "Active Line Module 16kW", interfaceModule: "6SL3100-0BE21-6AB0" },
  { articleNumber: "6SL3130-7TE23-6AA3", ratedPower: 36, type: "active", name: "Active Line Module 36kW", interfaceModule: "6SL3100-0BE23-6AB0" },
  { articleNumber: "6SL3130-7TE25-5AA3", ratedPower: 55, type: "active", name: "Active Line Module 55kW", interfaceModule: "6SL3100-0BE25-5AB0" },
  { articleNumber: "6SL3130-7TE28-0AA3", ratedPower: 80, type: "active", name: "Active Line Module 80kW", interfaceModule: "6SL3100-0BE28-0AB0" },
  { articleNumber: "6SL3130-7TE31-2AA3", ratedPower: 120, type: "active", name: "Active Line Module 120kW", interfaceModule: "6SL3100-0BE31-2AB0" },
  { articleNumber: "6SL3130-1TE22-0AA0", ratedPower: 20, type: "basic", name: "Basic Line Module 20kW" },
  { articleNumber: "6SL3130-1TE24-0AA0", ratedPower: 40, type: "basic", name: "Basic Line Module 40kW" },
  { articleNumber: "6SL3130-1TE31-0AA0", ratedPower: 100, type: "basic", name: "Basic Line Module 100kW" },
];

// Motor Module specs by article number
export const MOTOR_MODULE_SPECS: Record<string, { power: number; current: number; voltage: string }> = {
  "6SL3120-1TE13-0AD0": { power: 1.6, current: 3, voltage: "DC 510-720V" },
  "6SL3120-1TE15-0AD0": { power: 2.7, current: 5, voltage: "DC 510-720V" },
  "6SL3120-1TE21-0AD0": { power: 4.8, current: 9, voltage: "DC 510-720V" },
  "6SL3120-1TE21-8AC0": { power: 9.7, current: 18, voltage: "DC 510-720V" },
  "6SL3120-1TE21-8AD0": { power: 9.7, current: 18, voltage: "DC 510-720V" },
  "6SL3120-1TE22-4AC0": { power: 12.9, current: 24, voltage: "DC 510-720V" },
  "6SL3120-1TE22-4AD0": { power: 12.9, current: 24, voltage: "DC 510-720V" },
  "6SL3120-1TE23-0AC0": { power: 16, current: 30, voltage: "DC 510-720V" },
  "6SL3120-1TE23-0AD0": { power: 16, current: 30, voltage: "DC 510-720V" },
  "6SL3120-1TE24-5AC0": { power: 24, current: 45, voltage: "DC 510-720V" },
  "6SL3120-1TE26-0AC0": { power: 32, current: 60, voltage: "DC 510-720V" },
  "6SL3120-1TE28-5AA3": { power: 46, current: 85, voltage: "DC 510-720V" },
  "6SL3120-1TE31-3AA3": { power: 71, current: 132, voltage: "DC 510-720V" },
  "6SL3120-1TE32-0AA4": { power: 107, current: 200, voltage: "DC 510-720V" },
};

const MOTOR_MODULE_POWER: Record<string, number> = Object.fromEntries(
  Object.entries(MOTOR_MODULE_SPECS).map(([k, v]) => [k, v.power])
);

/**
 * Select the correct Line Module based on total motor power.
 * Applies 70% simultaneity factor for machine tools.
 */
export function selectLineModule(
  feedMotorModuleArticle: string,
  feedModuleCount: number,
  spindleMotorModuleArticle: string | undefined,
  spindleModuleCount: number,
  preferActive: boolean = false
): LineModuleOption {
  const feedPower = (MOTOR_MODULE_POWER[feedMotorModuleArticle] || 10) * feedModuleCount;
  const spindlePower = spindleMotorModuleArticle
    ? (MOTOR_MODULE_POWER[spindleMotorModuleArticle] || 20) * spindleModuleCount
    : 0;
  const totalPower = feedPower + spindlePower;
  const simultaneousPower = totalPower * 0.7;

  const type = preferActive ? "active" : "smart";
  const candidates = LINE_MODULES
    .filter((lm) => lm.type === type && lm.ratedPower >= simultaneousPower)
    .sort((a, b) => a.ratedPower - b.ratedPower);

  if (candidates.length > 0) return candidates[0];

  // Fallback: try any type
  const allCandidates = LINE_MODULES
    .filter((lm) => lm.ratedPower >= simultaneousPower)
    .sort((a, b) => a.ratedPower - b.ratedPower);

  return allCandidates[0] || LINE_MODULES[LINE_MODULES.length - 1];
}

// ─── DRIVE-CLiQ Cable Count ───
// Actual topology for S120 booksize on SINUMERIK ONE:
//
// NCU/PPU has 4 or 6 DRIVE-CLiQ ports (X100-X103 or X100-X105)
// Port X100: → Line Module → [daisy-chain to Motor Modules]
// Port X101: → Sensor Modules for external encoders (if any)
// Port X102: → TM Terminal Modules (if any)
// Port X103: → Reserved / additional
//
// DRIVE-CLiQ cables needed:
// 1. NCU to Line Module: 1 cable
// 2. Line Module to first Motor Module: 1 cable
// 3. Between Motor Modules (daisy-chain): (N-1) cables where N = motor modules
// 4. Motor Modules to motors with DRIVE-CLiQ encoder: 0 (integrated in motor)
//    OR Motor Modules to Sensor Modules: 1 per external encoder
//
// For SIMOTICS S-1FT7 / 1FK7 with integrated DRIVE-CLiQ encoder:
//   No separate encoder cable needed — encoder data travels over DRIVE-CLiQ
//
// For SIMOTICS M-1PH8 with motor-integrated sensor module:
//   DRIVE-CLiQ is motor-integrated — no separate sensor module cable
//
// Total DRIVE-CLiQ cables for booksize with integrated encoder motors:
//   = 1 (NCU→LM) + 1 (LM→MM1) + (N-1) (between MMs) = N + 1
//   where N = total number of Motor Modules

export function calculateDriveCliqCables(
  feedModules: number,
  spindleModules: number,
  hasExternalEncoders: boolean = false
): number {
  const totalMotorModules = feedModules + spindleModules;
  // NCU→LineModule (1) + LineModule→MM1 (1) + MM-to-MM daisy chain (N-1)
  let cables = totalMotorModules + 1;

  // If external encoders (non-DRIVE-CLiQ motors), add Sensor Module cables
  // Typically 1 per axis with external encoder
  if (hasExternalEncoders) {
    cables += totalMotorModules;
  }

  return cables;
}

// ─── Motor Cable Cross-Section ───
// Based on motor rated current:
// ≤ 5A (SH 20-48 small): 4x1.0mm² → MOTION-CONNECT 300
// ≤ 16A (SH 48-80): 4x1.5mm² → MOTION-CONNECT 500
// ≤ 30A (SH 80-100): 4x2.5mm² → MOTION-CONNECT 500
// ≤ 60A (SH 100-132): 4x6mm² → MOTION-CONNECT 500
// ≤ 85A (SH 132+): 4x10mm² → MOTION-CONNECT 800

export function getMotorCableSize(shaftHeight: number): string {
  if (shaftHeight <= 48) return "1.5mm²";
  if (shaftHeight <= 100) return "2.5mm²";
  return "6mm²";
}

// ─── MCP-HMI Matching ───
export const MCP_PANEL_MATCHING: Record<number, { mcpId: string; mcpArticle: string; mcpName: string }> = {
  12: { mcpId: "mcp_1500", mcpArticle: "6FC5303-0AP01-0AA0", mcpName: "MCP 1500 (15\")" },
  15: { mcpId: "mcp_1500", mcpArticle: "6FC5303-0AP01-0AA0", mcpName: "MCP 1500 (15\")" },
  19: { mcpId: "mcp_1900", mcpArticle: "6FC5303-0AP02-0AA0", mcpName: "MCP 1900 (19\")" },
  22: { mcpId: "mcp_2200", mcpArticle: "6FC5303-0AP03-0AA0", mcpName: "MCP 2200 (22\")" },
  24: { mcpId: "mcp_2400", mcpArticle: "6FC5303-0AP04-0AA0", mcpName: "MCP 2400 (24\")" },
};

export function getMatchingMcp(panelSizeInch: number): typeof MCP_PANEL_MATCHING[number] {
  const sizes = [12, 15, 19, 22, 24];
  const closest = sizes.reduce((prev, curr) =>
    Math.abs(curr - panelSizeInch) < Math.abs(prev - panelSizeInch) ? curr : prev
  );
  return MCP_PANEL_MATCHING[closest];
}

// ─── NCU DRIVE-CLiQ Port Check ───
export function checkDriveCliqPorts(
  controlUnitId: string,
  totalMotorModules: number,
  hasNx: boolean = false
): { ok: boolean; message?: string } {
  const portMap: Record<string, number> = {
    PPU_1740: 4,
    NCU_1740: 4,
    NCU_1750: 6,
    NCU_1760: 6,
  };
  const ports = portMap[controlUnitId] || 4;
  // Each DRIVE-CLiQ port can serve a daisy chain of up to ~6 components
  // Practical limit: max 6 Motor Modules per DRIVE-CLiQ port chain
  const maxPerChain = 6;
  const chainsNeeded = Math.ceil(totalMotorModules / maxPerChain);

  // Reserve 1 port for Line Module chain, rest for expansion
  if (chainsNeeded > ports) {
    return {
      ok: false,
      message: `${totalMotorModules} Motor Modules need ${chainsNeeded} DRIVE-CLiQ chains but ${controlUnitId} only has ${ports} ports. Consider NX extension.`,
    };
  }

  return { ok: true };
}

// ─── Comprehensive Validation ───
export interface DriveSystemValidation {
  lineModuleOk: boolean;
  lineModuleSuggestion?: LineModuleOption;
  driveCliqOk: boolean;
  driveCliqMessage?: string;
  mcpMatch: boolean;
  mcpSuggestion?: string;
  warnings: string[];
}

export function validateDriveSystem(config: {
  feedMotorModuleArticle?: string;
  feedModuleCount: number;
  spindleMotorModuleArticle?: string;
  spindleModuleCount: number;
  lineModuleArticle?: string;
  controlUnitId: string;
  hmiPanelSize?: number;
  mcpArticle?: string;
}): DriveSystemValidation {
  const warnings: string[] = [];

  // Line Module check
  const recommended = selectLineModule(
    config.feedMotorModuleArticle || "",
    config.feedModuleCount,
    config.spindleMotorModuleArticle,
    config.spindleModuleCount,
    false
  );

  const currentLm = LINE_MODULES.find((lm) => lm.articleNumber === config.lineModuleArticle);
  const lineModuleOk = currentLm ? currentLm.ratedPower >= recommended.ratedPower : false;
  if (!lineModuleOk && currentLm) {
    warnings.push(
      `Line Module ${currentLm.name} (${currentLm.ratedPower}kW) may be undersized. Recommended: ${recommended.name} (${recommended.ratedPower}kW).`
    );
  }

  // DRIVE-CLiQ port check
  const totalMm = config.feedModuleCount + config.spindleModuleCount;
  const portCheck = checkDriveCliqPorts(config.controlUnitId, totalMm);
  if (!portCheck.ok) {
    warnings.push(portCheck.message!);
  }

  // MCP match
  let mcpMatch = true;
  let mcpSuggestion: string | undefined;
  if (config.hmiPanelSize && config.mcpArticle) {
    const expected = getMatchingMcp(config.hmiPanelSize);
    if (expected.mcpArticle !== config.mcpArticle) {
      mcpMatch = false;
      mcpSuggestion = `MCP should match HMI panel size. Expected ${expected.mcpName} (${expected.mcpArticle}) for ${config.hmiPanelSize}" panel.`;
      warnings.push(mcpSuggestion);
    }
  }

  return {
    lineModuleOk,
    lineModuleSuggestion: lineModuleOk ? undefined : recommended,
    driveCliqOk: portCheck.ok,
    driveCliqMessage: portCheck.message,
    mcpMatch,
    mcpSuggestion,
    warnings,
  };
}
