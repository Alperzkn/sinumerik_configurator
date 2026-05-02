import type { AiRawResponse } from "./recommendation-engine";
import type { MachineType } from "@/types/catalog";

/**
 * Pre-defined architectures (NO motor/drive article numbers — sized
 * deterministically by src/lib/sizing from the user's specs).
 *
 * Each key maps to a MachineType template. Used BOTH by the /api/recommend
 * mock fallback (when the Anthropic API key isn't set or fails) AND by the
 * direct template flow (which skips the AI round-trip entirely for known
 * machine types).
 */
export const TEMPLATE_ARCHITECTURES: Partial<Record<MachineType, AiRawResponse>> = {
  "3axis_mill": {
    controlUnit: { id: "NCU_1740", reason: "4 axes/spindles within NCU 1740 capacity" },
    cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
    technologyPackages: [
      { id: "S42", reason: "Dynamics 3 Axis Milling includes Advanced/Top Surface, measuring cycles, ShopMill" },
    ],
    additionalOptions: [
      { orderCode: "A01", name: "1 additional axis/spindle", quantity: 1, reason: "4 total - 3 base = 1 additional license" },
    ],
    driveArchitecture: {
      family: "S120_booksize",
      feedAxisCount: 3,
      spindleCount: 1,
      preferActiveLineModule: false,
      highSpeedSpindle: false,
      reason: "Standard 3-axis mill: Smart Line Module, conventional spindle",
    },
    hmi: { type: "thin_client", panelSizeInch: 15, reason: "15\" Thin Client for standard milling" },
    safety: { options: [], reason: "Basic safety (STO, SS1, SBC) sufficient" },
    totalAxes: 4,
    totalChannels: 1,
    notes: ["3 axes + 1 spindle = 4 total — 1 additional axis license beyond base 3"],
    estimatedComplexity: "standard",
  },

  "5axis_mill": {
    controlUnit: { id: "NCU_1750", reason: "5-axis simultaneous requires NCU 1750+ for Dynamics 5 Axis (S43)" },
    cncSoftware: { variant: "full_scope", swVersion: "6.25 SP1" },
    technologyPackages: [
      { id: "S43", reason: "Dynamics 5 Axis includes M30, M48, P18, S07, S17, S62, P28 and ShopMill" },
    ],
    additionalOptions: [
      { orderCode: "A03", name: "3 additional axes/spindles", quantity: 3, reason: "6 total (5 axes + 1 spindle) - 3 base = 3 additional licenses" },
    ],
    driveArchitecture: {
      family: "S120_booksize",
      feedAxisCount: 5,
      spindleCount: 1,
      preferActiveLineModule: true,
      highSpeedSpindle: true,
      reason: "5-axis HSC benefits from Active Line Module (regeneration) and high-speed spindle",
    },
    hmi: { type: "thin_client", panelSizeInch: 19, reason: "19\" Thin Client for NCU cabinet-based setup" },
    safety: { options: ["S60", "S61"], reason: "Extended safety recommended for 5-axis: S60 + S61" },
    totalAxes: 6,
    totalChannels: 1,
    notes: [
      "Base scope includes 3 axes — only 3 additional licenses needed for 6 total",
      "Full scope CNC software required (S43 not available in export version)",
      "Motors and drives are sized automatically from moving-mass and spindle requirements",
    ],
    estimatedComplexity: "advanced",
  },

  cnc_lathe: {
    controlUnit: { id: "NCU_1740", reason: "3 axes/spindles within NCU 1740 base scope" },
    cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
    technologyPackages: [
      { id: "S41", reason: "Dynamics Operate includes ShopTurn for conversational turning" },
    ],
    additionalOptions: [],
    driveArchitecture: {
      family: "S120_booksize",
      feedAxisCount: 2,
      spindleCount: 1,
      preferActiveLineModule: false,
      highSpeedSpindle: false,
      reason: "Standard turning: 2 linear axes + 1 main spindle; Smart Line Module sufficient",
    },
    hmi: { type: "thin_client", panelSizeInch: 15, reason: "15\" Thin Client — standard for lathe operation" },
    safety: { options: [], reason: "Basic safety (STO, SS1, SBC) sufficient for simple CNC lathe" },
    totalAxes: 3,
    totalChannels: 1,
    notes: [
      "2 axes + 1 spindle = 3 total — fully covered by base scope, no additional axis licenses",
      "Add C-axis for milling on lathe (1 extra axis license needed)",
    ],
    estimatedComplexity: "basic",
  },

  mill_turn: {
    controlUnit: { id: "NCU_1750", reason: "Mill-turn with 7 axes/spindles and 2 channels" },
    cncSoftware: { variant: "full_scope", swVersion: "6.25 SP1" },
    technologyPackages: [{ id: "S41", reason: "Dynamics Operate for ShopTurn/ShopMill programming" }],
    additionalOptions: [
      { orderCode: "A04", name: "4 additional axes/spindles", quantity: 4, reason: "7 total - 3 base = 4 additional" },
      { orderCode: "C11", name: "Additional machining channel", quantity: 1, reason: "2nd channel for simultaneous turning + milling" },
      { orderCode: "M30", name: "Machining package 5 axes", quantity: 1, reason: "B-axis milling head with 5-axis capability" },
      { orderCode: "M43", name: "Cross-mode actions ASUB", quantity: 1, reason: "Required for multi-channel synchronized operation" },
    ],
    driveArchitecture: {
      family: "S120_booksize",
      feedAxisCount: 5,
      spindleCount: 2,
      preferActiveLineModule: true,
      highSpeedSpindle: false,
      reason: "Dual-spindle mill-turn, Active Line Module",
    },
    hmi: { type: "thin_client", panelSizeInch: 19, reason: "19\" for complex mill-turn programming" },
    safety: { options: ["S60", "S61"], reason: "Extended safety with S60 + S61 for production mill-turn" },
    totalAxes: 7,
    totalChannels: 2,
    notes: ["7 total axes/spindles - 3 base = 4 additional licenses needed", "Full scope required for M30"],
    estimatedComplexity: "advanced",
  },

  grinding: {
    controlUnit: { id: "NCU_1740", reason: "4 axes/spindles within NCU 1740 capacity" },
    cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
    technologyPackages: [],
    additionalOptions: [
      { orderCode: "A01", name: "1 additional axis/spindle", quantity: 1, reason: "4 total (3 axes + 1 wheel spindle) - 3 base" },
      { orderCode: "M34", name: "Grinding oscillation functions", quantity: 1, reason: "Block-related, modal and asynchronous oscillation" },
      { orderCode: "S35", name: "Grinding Advanced", quantity: 1, reason: "Extended grinding functions including dressing cycles" },
    ],
    driveArchitecture: {
      family: "S120_booksize",
      feedAxisCount: 3,
      spindleCount: 1,
      preferActiveLineModule: false,
      highSpeedSpindle: false,
      reason: "3 feed axes + wheel spindle, Smart Line Module",
    },
    hmi: { type: "thin_client", panelSizeInch: 15, reason: "15\" Thin Client for grinding operation" },
    safety: { options: [], reason: "Basic safety sufficient for standard grinding machine" },
    totalAxes: 4,
    totalChannels: 1,
    notes: ["3 axes + 1 spindle = 4 total — 1 additional axis license needed beyond base 3"],
    estimatedComplexity: "standard",
  },

  laser: {
    controlUnit: { id: "NCU_1740", reason: "3 axes within NCU 1740 base scope" },
    cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
    technologyPackages: [],
    additionalOptions: [
      { orderCode: "M37", name: "Laser power control", quantity: 1, reason: "Path velocity-dependent analog output for laser power" },
      { orderCode: "M38", name: "Laser switching high-speed", quantity: 1, reason: "High-speed laser on/off switching signals" },
      { orderCode: "S07", name: "Advanced Surface", quantity: 1, reason: "Smooth path control for quality laser cuts" },
      { orderCode: "M43", name: "Cross-mode actions ASUB", quantity: 1, reason: "Required for synchronized laser control" },
    ],
    driveArchitecture: {
      family: "S120_booksize",
      feedAxisCount: 3,
      spindleCount: 0,
      preferActiveLineModule: true,
      highSpeedSpindle: false,
      reason: "High-dynamic feed axes, Active Line Module for regeneration during rapid direction changes",
    },
    hmi: { type: "thin_client", panelSizeInch: 19, reason: "19\" for laser program visualization" },
    safety: { options: ["S60", "S61"], reason: "Extended safety for laser: safe speed during door-open operation" },
    totalAxes: 3,
    totalChannels: 1,
    notes: ["3 axes = base scope — no additional axis licenses", "Laser source is external to SINUMERIK scope"],
    estimatedComplexity: "standard",
  },

  punching: {
    controlUnit: { id: "NCU_1740", reason: "2 axes + punching tool within NCU 1740 base scope" },
    cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
    technologyPackages: [],
    additionalOptions: [
      { orderCode: "M33", name: "Punching and nibbling", quantity: 1, reason: "Punch/nibble control for sheet-metal operations" },
      { orderCode: "M43", name: "Cross-mode actions ASUB", quantity: 1, reason: "Synchronized tool actions" },
    ],
    driveArchitecture: {
      family: "S120_booksize",
      feedAxisCount: 2,
      spindleCount: 0,
      preferActiveLineModule: true,
      highSpeedSpindle: false,
      reason: "High-dynamic XY axes with Active Line Module",
    },
    hmi: { type: "thin_client", panelSizeInch: 15, reason: "15\" Thin Client for punching operation" },
    safety: { options: ["S60", "S61"], reason: "Extended safety required for stamping / nibbling tool" },
    totalAxes: 2,
    totalChannels: 1,
    notes: ["2 axes within base scope — no additional axis licenses"],
    estimatedComplexity: "standard",
  },

  robot: {
    controlUnit: { id: "NCU_1750", reason: "6-axis robot requires NCU 1750 for multi-axis interpolation" },
    cncSoftware: { variant: "full_scope", swVersion: "6.25 SP1" },
    technologyPackages: [],
    additionalOptions: [
      { orderCode: "A03", name: "3 additional axes", quantity: 3, reason: "6 robot axes - 3 base = 3 additional" },
      { orderCode: "M15", name: "Multi-axis interpolation >4 axes", quantity: 1, reason: "Required for 6-axis robot interpolation" },
      { orderCode: "R05", name: "Run MyRobot /Direct Control ROBX AR", quantity: 1, reason: "Articulated arm robot transformation" },
      { orderCode: "M43", name: "Cross-mode actions ASUB", quantity: 1, reason: "Required for robot operation" },
      { orderCode: "S00", name: "SINUMERIK Operate /NCU", quantity: 1, reason: "Required for robot HMI" },
    ],
    driveArchitecture: {
      family: "S120_booksize",
      feedAxisCount: 6,
      spindleCount: 0,
      preferActiveLineModule: true,
      highSpeedSpindle: false,
      reason: "6 joint drives with Active Line Module for regeneration",
    },
    hmi: { type: "thin_client", panelSizeInch: 15, reason: "15\" Thin Client for robot teach/operate" },
    safety: { options: ["S60", "K06"], reason: "S60 enables F-PLC, K06 = 6 safe axes" },
    totalAxes: 6,
    totalChannels: 1,
    notes: ["6 axes - 3 base = 3 additional axis licenses needed", "Full scope CNC software required"],
    estimatedComplexity: "complex",
  },
};

export function getTemplateArchitecture(template: MachineType | null): AiRawResponse | null {
  if (!template || template === "custom") return null;
  return TEMPLATE_ARCHITECTURES[template] ?? null;
}
