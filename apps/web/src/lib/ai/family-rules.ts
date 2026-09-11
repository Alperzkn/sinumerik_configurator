/**
 * Deterministic selection rules that differ per SINUMERIK product line.
 * The AI decides the shape of the machine; these helpers turn that into
 * the catalog articles a given family actually offers.
 *
 * Sources: Catalog NC 82 (2025 + chapter 2 09/2026) and the 828D Smart
 * details PDF (09/2026) in docs/.
 */

import type {
  CncSoftware,
  ControlSystemFamily,
  ControlUnit,
  DriveComponent,
  HmiComponent,
  MachineType,
  SoftwareOption,
} from "@/types/catalog";
import { COMBI_LINE_REACTOR, COMBI_POWER_MODULES, COMBI_CONNECTION_KIT, type CombiPowerModule } from "@/data/drives-828d";

const ALL_828D = { PPU_260_5: "option", PPU_261_5: "option", PPU_270_5: "option", PPU_271_5: "option", PPU_290_5: "option", PU_272_5: "option" } as const;

/** Technology the SD-card software must carry, from the machine template. */
export function technologyFor(template: MachineType | string | null | undefined): "M" | "T" | "G" {
  if (template === "cnc_lathe") return "T";
  if (template === "grinding") return "G";
  return "M";
}

/**
 * Pick the PPU when the AI named none (template flow) or named a unit from
 * another family. Horizontal PPU for milling, vertical for turning /
 * grinding; PPU 290.5 when a 15.6" screen was requested (828D only).
 */
export function pickDefaultControlUnit(
  units: ControlUnit[],
  family: ControlSystemFamily,
  opts: { template?: MachineType | string | null; panelSizeInch?: number; totalAxes: number }
): ControlUnit | undefined {
  const byId = (id: string) => units.find((u) => u.id === id);
  if (family === "sinumerik_one") {
    return byId(opts.totalAxes > 20 ? "NCU_1750" : "NCU_1740");
  }
  const vertical = technologyFor(opts.template) !== "M";
  if (family === "828d_smart") return byId(vertical ? "PPU_260_5" : "PPU_261_5");
  if ((opts.panelSizeInch ?? 0) >= 15) return byId("PPU_290_5");
  return byId(vertical ? "PPU_270_5" : "PPU_271_5");
}

/** 828D SD-card software: newest generation the unit accepts, by technology. */
export function pickCncSoftware828d(
  list: CncSoftware[],
  family: ControlSystemFamily,
  template: MachineType | string | null | undefined
): CncSoftware | undefined {
  const tech = technologyFor(template);
  const generation = family === "828d_smart" ? "24x" : "28x";
  return list.find((s) => s.family === "828d" && s.technology === tech && s.swVersion === generation);
}

/**
 * 828D licences: 3 axes/spindles are included for turning and G-Tech, 4 for
 * milling; every further one is 0AC20. Rewrites whatever the AI produced.
 */
export function applyAxisLicences828d(
  options: SoftwareOption[],
  quantities: Record<string, number>,
  findOption: (code: string) => SoftwareOption | undefined,
  totalAxes: number,
  template: MachineType | string | null | undefined
): void {
  const base = technologyFor(template) === "M" ? 4 : 3;
  const existing = options.findIndex((o) => o.orderCode === "0AC20");
  if (existing >= 0) {
    delete quantities[options[existing].id];
    options.splice(existing, 1);
  }
  const extra = totalAxes - base;
  if (extra <= 0) return;
  const opt = findOption("0AC20");
  if (opt) {
    options.push(opt);
    quantities[opt.id] = extra;
  }
}

/**
 * Full 1FL2 ordering code for 828D Smart: trunk + brake digit + "1-" + plain
 * shaft (0) + multiturn 21+12-bit encoder (M) + metal circular connector (B).
 * Matches the sample BOM on 828D Smart details PDF p.48 (1FL2306-7AC01-0MB0
 * without brake, …AC11-0MB0 with brake) and the D 37.1 article legend.
 */
export function fl2FullMlfb(trunk: string, brake: boolean): string {
  return `${trunk}${brake ? "1" : "0"}1-0MB0`;
}

export interface CombiSelection {
  powerModule: CombiPowerModule;
  components: DriveComponent[];
  quantities: Record<string, number>;
  notes: string[];
}

/**
 * SINAMICS S120 Combi for 828D: one Power Module carries the infeed, the
 * spindle and 2 or 3 feed axes. A 5th/6th feed axis rides on booksize Motor
 * Modules through the connection kit. Returns null when the machine is
 * outside the Combi envelope (then the caller keeps S120 booksize).
 */
export function selectCombi(args: {
  feedAxes: number;
  spindles: number;
  spindleCurrentA: number | undefined;
  feedCurrentA: number | undefined;
  feedMotorModuleArticle: string | undefined;
  feedMotorModuleName: string | undefined;
}): CombiSelection | null {
  const { feedAxes, spindles } = args;
  // A "3-axis" Combi = spindle + 2 feed axes, a "4-axis" one = spindle + 3 feed
  // axes; up to 2 more feed axes ride on booksize Motor Modules (NC 82 p.4/3).
  if (spindles !== 1 || feedAxes < 1 || feedAxes > 5) return null;
  const spindleA = args.spindleCurrentA ?? 18;
  const feedA = args.feedCurrentA ?? 9;
  const wantedAxes: 3 | 4 = feedAxes <= 2 ? 3 : 4;
  const onModule = wantedAxes - 1;
  const extraAxes = Math.max(0, feedAxes - onModule);
  // All feed axes share one sized motor, so every feed power unit must carry it.
  const candidates = COMBI_POWER_MODULES.filter(
    (m) => m.axes === wantedAxes && m.spindleCurrentA >= spindleA && Math.min(...m.feedCurrentsA) >= feedA
  ).sort((a, b) => a.spindleCurrentA - b.spindleCurrentA || a.ratedPowerKw - b.ratedPowerKw);
  const pm = candidates[0];
  if (!pm) return null;

  const components: DriveComponent[] = [];
  const quantities: Record<string, number> = {};
  const notes: string[] = [];
  components.push({
    id: `combi-${pm.articleNumber}`,
    articleNumber: pm.articleNumber,
    name: pm.name,
    driveFamily: "S120_combi",
    componentType: pm.axes === 3 ? "power_module_3axis" : "power_module_4axis",
    ratedPower: `${pm.ratedPowerKw}kW`,
    ratedCurrent: `${pm.spindleCurrentA}A spindle / ${pm.feedCurrentsA.join("/")}A feed`,
    frameType: pm.frameType,
    compatibility: ALL_828D,
    description: `SINAMICS S120 Combi Power Module: regenerative infeed + spindle + ${pm.axes - 1} feed axes in one unit (NC 82 p.4/3)`,
  });
  quantities[`combi-${pm.articleNumber}`] = 1;
  const reactor = COMBI_LINE_REACTOR[pm.ratedPowerKw === 20 ? 20 : 16];
  components.push({
    id: `combi-reactor-${pm.ratedPowerKw}`,
    articleNumber: reactor.articleNumber,
    name: reactor.name,
    driveFamily: "S120_combi",
    componentType: "interface_module",
    compatibility: ALL_828D,
    description: "Power Modules cannot operate without a line reactor (NC 82 p.4/8)",
  });
  quantities[`combi-reactor-${pm.ratedPowerKw}`] = 1;
  notes.push(`SINAMICS S120 Combi ${pm.frameType}: spindle ${pm.spindleCurrentA} A, feed ${pm.feedCurrentsA.join("/")} A — line reactor ${reactor.articleNumber} is mandatory.`);

  if (extraAxes > 0) {
    components.push({
      id: "combi-connection-kit",
      articleNumber: COMBI_CONNECTION_KIT.articleNumber,
      name: COMBI_CONNECTION_KIT.name,
      driveFamily: "S120_combi",
      componentType: "hub_module",
      compatibility: ALL_828D,
      description: "Required to attach booksize Motor Modules for the 5th / 6th axis (NC 82 p.4/3)",
    });
    quantities["combi-connection-kit"] = 1;
    if (args.feedMotorModuleArticle) {
      const id = `feed-mm-${args.feedMotorModuleArticle}`;
      components.push({
        id,
        articleNumber: args.feedMotorModuleArticle,
        name: args.feedMotorModuleName ?? `Motor Module ${args.feedMotorModuleArticle}`,
        driveFamily: "S120_booksize",
        componentType: "motor_module_single",
        compatibility: ALL_828D,
        description: `Booksize Motor Module for expansion axis ${onModule + 1}${extraAxes > 1 ? `-${feedAxes}` : ""} on the Combi Power Module`,
      });
      quantities[id] = extraAxes;
    }
    notes.push(`${extraAxes} expansion axis/axes on booksize Motor Modules via the Combi connection kit (CNC SW ≥ V4.95).`);
  }
  return { powerModule: pm, components, quantities, notes };
}

/** NX extension for 828D when the PPU's 6 onboard drive axes are exceeded (NC 82 p.3/20). */
export function nxFor828d(drives: DriveComponent[], totalDriveAxes: number): { component: DriveComponent; note: string } | { error: string } | null {
  if (totalDriveAxes <= 6) return null;
  const nx = totalDriveAxes <= 9 ? drives.find((d) => d.id === "nx10-3") : totalDriveAxes <= 12 ? drives.find((d) => d.id === "nx15-3") : undefined;
  if (!nx) return { error: `${totalDriveAxes} drive axes exceed what a PPU + NX15.3 can control (12) — split the machine or move to SINUMERIK ONE.` };
  return { component: nx, note: `${nx.name} added: the PPU controls 6 drive axes on its own, ${totalDriveAxes} were configured.` };
}

/** MCP 1200U matches the PPU orientation; the 15.6" PPU 290.5 pairs with MCP 1500U (NC 82 / Smart PDF p.12). */
export function mcpFor828d(hmi: HmiComponent[], controlUnit: ControlUnit): HmiComponent | undefined {
  const id =
    controlUnit.id === "PPU_290_5" ? "hmi828-mcp_1500u" : controlUnit.orientation === "vertical" ? "hmi828-mcp_1200u_v" : "hmi828-mcp_1200u_h";
  return hmi.find((h) => h.id === id);
}

/**
 * 828D Safety Integrated: one option per CNC axis/spindle (0AC50, 828D only)
 * plus a TM54F per PPU/NX. Not available on 828D Smart.
 */
export function safetyFor828d(
  family: ControlSystemFamily,
  level: string | undefined,
  totalAxes: number,
  findOption: (code: string) => SoftwareOption | undefined
): { option?: SoftwareOption; quantity?: number; note?: string; warning?: string } {
  if (!level || level === "basic") return {};
  if (family === "828d_smart") {
    return { warning: "Extended Safety Integrated functions (SLS/SOS/SLP…) are not available on 828D Smart — only the S200 STO. Choose 828D or SINUMERIK ONE for safe axis monitoring." };
  }
  const opt = findOption("0AC50");
  if (!opt) return {};
  return {
    option: opt,
    quantity: totalAxes,
    note: `Safety Integrated extended functions licensed per axis/spindle (0AC50 × ${totalAxes}); a SINAMICS TM54F terminal module (6SL3055-0AA00-3BA0) is required per PPU/NX (NC 82 p.2/40).`,
  };
}
