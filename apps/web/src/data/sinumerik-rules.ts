/**
 * SINUMERIK ONE Configuration Rules & Domain Knowledge
 * =====================================================
 * Source: Siemens NC63 Catalog, January 2026
 *
 * This file encodes all critical domain knowledge that the AI
 * and validation engine need to generate correct configurations.
 */

// ─────────────────────────────────────────────────────────────
// 1. BASE SCOPE — what's included with each NCU/PPU
// ─────────────────────────────────────────────────────────────

export const BASE_SCOPE = {
  /**
   * Every SINUMERIK ONE NCU/PPU includes:
   * - 1 machining channel
   * - 1 mode group
   * - 3 axes/spindles (CNC-controlled)
   * - Integrated SIMATIC S7-1500F PLC (standard PLC, NOT failsafe-enabled by default)
   * - Basic Safety: STO, SS1 (time-controlled), SBC
   * - PROFINET interfaces
   * - USB, Ethernet
   * - SINUMERIK Operate basic HMI functions
   */
  baseAxesSpindles: 3,
  baseChannels: 1,
  baseModeGroups: 1,
  basePlc: "S7-1500F (standard mode, failsafe requires option S60)",
  baseSafety: ["STO", "SS1", "SBC"],
} as const;

// ─────────────────────────────────────────────────────────────
// 2. AXIS LICENSING RULES
// ─────────────────────────────────────────────────────────────

export const AXIS_RULES = {
  /**
   * Base scope includes 3 axes/spindles.
   * Additional axes need license A01-A28 (6FC5800-0BA00-0YB0).
   * Each A-option adds 1 axis/spindle license.
   *
   * Example: 3-axis mill with 1 spindle = 4 total axes/spindles
   *   Base covers 3, so 1 additional license needed (A01).
   *
   * Example: 5-axis mill with 1 spindle = 6 total
   *   Base covers 3, so 3 additional licenses needed (A03).
   *
   * For positioning axes / auxiliary spindles, use B01-B28 instead.
   * These are cheaper and for non-interpolating axes only.
   */
  baseIncluded: 3,
  additionalAxisArticle: "6FC5800-0BA00-0YB0",
  additionalAxisOrderCodePrefix: "A",
  positioningAxisArticle: "6FC5800-0BB00-0YB0",
  positioningAxisOrderCodePrefix: "B",

  /**
   * Calculate how many additional axis licenses are needed.
   */
  calcAdditionalAxes(totalAxesNeeded: number): number {
    return Math.max(0, totalAxesNeeded - this.baseIncluded);
  },

  /**
   * Multi-axis package M10 expands to 31 axes and 10 channels.
   * Only needed if you exceed the base NCU limits AND want a single option.
   */
  multiAxisPackageArticle: "6FC5800-0BM10-0YB0",
  multiAxisPackageOrderCode: "M10",
} as const;

// ─────────────────────────────────────────────────────────────
// 3. CHANNEL & MODE GROUP RULES
// ─────────────────────────────────────────────────────────────

export const CHANNEL_RULES = {
  /**
   * Base scope includes 1 channel, 1 mode group.
   * Additional channels: C11-C19 (6FC5800-0BC10-0YB0)
   * Additional mode groups: C01-C09 (6FC5800-0BC00-0YB0)
   *
   * When to add channels:
   * - Mill-turn with simultaneous operations on different spindles
   * - Multi-slide machines
   * - Gantry machines with independent slides
   */
  baseChannels: 1,
  baseModeGroups: 1,
  additionalChannelArticle: "6FC5800-0BC10-0YB0",
  additionalModeGroupArticle: "6FC5800-0BC00-0YB0",
} as const;

// ─────────────────────────────────────────────────────────────
// 4. SAFETY RULES
// ─────────────────────────────────────────────────────────────

export const SAFETY_RULES = {
  /**
   * BASIC SAFETY (always included, no extra license):
   * - STO (Safe Torque Off) — via onboard terminals or PROFIsafe
   * - SS1 (Safe Stop 1) — time-controlled shutdown
   * - SBC (Safe Brake Control) — holding brake activation
   *
   * These are sufficient for basic machine safety with external
   * safety relay / safety PLC handling the safety logic.
   *
   * WHEN IS S60 (F-PLC) NEEDED?
   * S60 activates the FAILSAFE mode of the integrated S7-1500F PLC.
   * Without S60, the PLC operates in standard (non-safety) mode.
   *
   * S60 is needed when:
   * - You want to run safety programs directly on the NCU's PLC
   * - You need safe axis/spindle monitoring (K options or S61)
   * - You need PROFIsafe communication with ET 200 safety I/O
   * - You need safe speed monitoring (SLS), safe position (SLP), etc.
   *
   * S60 is NOT needed when:
   * - Basic STO/SS1/SBC is sufficient
   * - Safety logic runs on an external safety PLC
   * - Machine only needs emergency stop and door interlocking
   *   via external safety relay
   *
   * EXTENDED SAFETY (all require S60):
   * - K01-K09: Safety monitoring per individual axis (1 license each)
   * - S61: Safety multi-axis package (covers ALL axes, simpler ordering)
   * - Choose K-options for partial safety (e.g., only main axes)
   * - Choose S61 for full safety on all axes
   *
   * RULE: For most production machines, S60 + S61 is standard practice.
   * For simple machines (basic lathe, basic mill), basic safety may suffice.
   */
  basicSafety: ["STO", "SS1", "SBC"],
  fPlcArticle: "6FC5800-0BS60-0YB0",
  fPlcOrderCode: "S60",
  safetyPerAxisArticle: "6FC5800-0BK00-0YB0",
  safetyMultiAxisArticle: "6FC5800-0BS61-0YB0",
  safetyMultiAxisOrderCode: "S61",

  /**
   * Determine if extended safety is recommended.
   */
  needsExtendedSafety(machineType: string): boolean {
    // Production machines, 5-axis, robots always need extended safety
    const alwaysSafe = ["5axis_mill", "mill_turn", "robot"];
    return alwaysSafe.includes(machineType);
  },

  /**
   * Determine if basic safety is sufficient.
   */
  basicSafetySufficient(machineType: string): boolean {
    // Simple machines CAN work with basic safety only
    const canBeBasic = ["cnc_lathe", "3axis_mill", "grinding", "punching"];
    return canBeBasic.includes(machineType);
  },
} as const;

// ─────────────────────────────────────────────────────────────
// 5. CONTROL UNIT SELECTION RULES
// ─────────────────────────────────────────────────────────────

export const CONTROL_UNIT_RULES = {
  /**
   * PPU 1740: Panel-based (built-in 15" or 19" display)
   *   - Max 20 axes, 4 channels, 4 DRIVE-CLiQ ports
   *   - Good for: simple machines, compact design, standalone operation
   *   - Cannot add separate IPC (display is built-in)
   *   - Block change time: 0.7 ms
   *
   * NCU 1740: Cabinet-based, entry-level
   *   - Same specs as PPU 1740 but in cabinet form
   *   - Max 20 axes, 4 channels, 4 DRIVE-CLiQ ports
   *   - REQUIRES separate HMI panel (Thin Client, Panel PC, or Flat Panel + IPC)
   *   - Block change time: 0.7 ms
   *
   * NCU 1750: Cabinet-based, mid-range
   *   - Max 40 axes, 10 channels, 6 DRIVE-CLiQ ports
   *   - REQUIRED for: Dynamics 5 Axis (S43), 5-axis simultaneous
   *   - Good for: 5-axis mills, mill-turn centers, multi-channel machines
   *   - Block change time: 0.3 ms
   *
   * NCU 1760: Cabinet-based, high-end
   *   - Max 50 axes, 10 channels, 6 DRIVE-CLiQ ports
   *   - Best for: HSC (high-speed cutting), mold making, maximum performance
   *   - Block change time: 0.2 ms (fastest)
   *
   * SELECTION LOGIC:
   * 1. Total axes ≤ 20 → PPU 1740 or NCU 1740
   * 2. Total axes ≤ 40 or 5-axis needed → NCU 1750
   * 3. Total axes ≤ 50 or HSC/maximum performance → NCU 1760
   * 4. PPU if compact/standalone preferred, NCU if cabinet-based
   */
  ppuMaxAxes: 20,
  ncu1740MaxAxes: 20,
  ncu1750MaxAxes: 40,
  ncu1760MaxAxes: 50,

  selectControlUnit(params: {
    totalAxes: number;
    needs5Axis: boolean;
    needsHSC: boolean;
    prefersCompact: boolean;
    totalChannels: number;
  }): string {
    if (params.needs5Axis || params.totalAxes > 20 || params.totalChannels > 4) {
      if (params.needsHSC || params.totalAxes > 40) return "NCU_1760";
      return "NCU_1750";
    }
    if (params.prefersCompact) return "PPU_1740";
    return "NCU_1740";
  },
} as const;

// ─────────────────────────────────────────────────────────────
// 6. HMI RULES
// ─────────────────────────────────────────────────────────────

export const HMI_RULES = {
  /**
   * PPU 1740: Has built-in panel. NO separate HMI needed.
   *   - PPU 1740-1500: 15" (1366x768)
   *   - PPU 1740-1900: 19" (1920x1080)
   *
   * NCU 1740/1750/1760: REQUIRES separate HMI. Options:
   *
   * 1. SIMATIC Thin Client (ITC series):
   *    - Standalone display, connects via network
   *    - No local compute — runs SINUMERIK Operate from NCU
   *    - Simplest option, recommended for most machines
   *    - Sizes: 12", 15", 19", 22", 24"
   *
   * 2. SIMATIC Panel PC (IPC277G, IPC PX-39A):
   *    - Display with integrated Windows PC
   *    - Runs SINUMERIK Operate locally
   *    - Needed for: PCU base software (P86), custom apps, Edge computing
   *    - Sizes: 15", 19", 22", 24"
   *
   * 3. SIMATIC Flat Panel (IFP) + Cabinet IPC:
   *    - Display-only panel (no compute)
   *    - Requires separate IPC in cabinet (IPC227G, BX-39A)
   *    - For: large displays, remote mounting, multi-display setups
   *    - Sizes: 15", 19", 22", 24"
   *
   * RULE: For standard machine tools, Thin Client is the default recommendation.
   * Panel PC only when Edge apps or custom Windows software needed.
   */
  ppuHasBuiltInPanel: true,
  ncuRequiresExternalHmi: true,
  defaultHmiForNCU: "thin_client",
} as const;

// ─────────────────────────────────────────────────────────────
// 7. DRIVE SYSTEM RULES
// ─────────────────────────────────────────────────────────────

export const DRIVE_RULES = {
  /**
   * SINAMICS S120 booksize:
   *   - Standard for machine tools
   *   - Single/Double Motor Modules + Line Module
   *   - MLFBs are motor-specific — "See SiePortal" in catalog
   *   - Correct MLFB requires SIZER tool for exact sizing
   *   - Representative pattern: 6SL3120-1TE**-**A* (single), 6SL3120-2TE**-**A* (double)
   *
   * SINAMICS S220 booksize:
   *   - Next-generation, improved efficiency
   *   - Full MLFBs available in catalog (e.g., 6SL5120-1UE22-4AD0)
   *   - Recommended for new designs
   *
   * SINAMICS S120 Combi:
   *   - Compact 3/4-axis integrated units
   *   - Good for small machines (3-4 axes)
   *   - Full MLFBs available (e.g., 6SL3111-3VE21-6FC1)
   *
   * SINAMICS S120 chassis:
   *   - For high-power applications (>90kW motors)
   *   - Pattern: 6SL3320-1TE3*-*AA3 (motor module), 6SL3330-7TE3*-*AA* (line module)
   *
   * EACH AXIS NEEDS:
   * - 1x Motor Module (or share in Double/Combi)
   * - 1x Motor (SIMOTICS)
   * - DRIVE-CLiQ cables for connection
   * - Motor power cable
   * - Encoder signal cable (if external encoder)
   *
   * THE SYSTEM ALSO NEEDS:
   * - 1x Line Module (power infeed) — shared by all motor modules on same DC bus
   * - 1x 24V DC power supply for NCU/PPU
   * - DRIVE-CLiQ cables between NCU and each drive component
   * - PROFINET cable for HMI connection
   *
   * DRIVE-CLiQ CABLE COUNT (approximate):
   * - 1 cable from NCU to first Motor Module
   * - 1 cable per additional Motor Module (daisy-chain or star via hub)
   * - 1 cable to Line Module
   * - Total ≈ number_of_motor_modules + 2
   */
  dcliqCablesNeeded(motorModules: number): number {
    return motorModules + 2;
  },

  motorCablesNeeded(totalAxes: number): number {
    return totalAxes; // 1 power cable per motor
  },

  encoderCablesNeeded(totalAxes: number): number {
    return totalAxes; // 1 encoder cable per axis (for external encoders)
  },
} as const;

// ─────────────────────────────────────────────────────────────
// 8. EXPORT VERSION RESTRICTIONS
// ─────────────────────────────────────────────────────────────

export const EXPORT_RULES = {
  /**
   * Export version (6FC5852-1YG25-1YA0):
   * - No export license needed
   * - Max 4 simultaneously traversing axes
   * - No multi-axis interpolation >4 (M15)
   * - No 5-axis machining package (M30, S43)
   * - No handling transformations (M31)
   * - Limited coupling packages
   * - Limited compensation options
   *
   * Full scope version (6FC5852-1XG25-1YA0):
   * - Requires export license
   * - All functionality available
   * - Required for: 5-axis, robots, complex multi-axis
   */
  maxSimultaneousAxesExport: 4,
  restrictedOptions: [
    "M15", "M25", "M30", "M31", "M44", "M46", "M51",
    "M57", "M68", "M71", "M80", "M81", "M82", "M83", "M84",
    "N04", "N06", "N10", "N11", "N15", "N16", "N17", "N18",
    "N22", "N26", "N31", "N36", "N37", "N38", "N41", "N42",
    "N43", "N44", "N45", "N46", "N47", "N48", "N51", "N54",
    "N62", "N63", "N66", "N68", "N75", "N77", "N82", "N83", "N84",
    "R03", "R04", "R05", "R10", "S01", "S31", "S43",
  ],

  needsFullScope(options: string[]): boolean {
    return options.some((opt) => (this.restrictedOptions as readonly string[]).includes(opt));
  },
} as const;

// ─────────────────────────────────────────────────────────────
// 9. TECHNOLOGY PACKAGE CONTENTS (what's included)
// ─────────────────────────────────────────────────────────────

export const PACKAGE_CONTENTS = {
  S41: {
    name: "Dynamics Operate",
    includes: ["P17", "P56", "P13", "P25", "P22", "M27", "P75"],
    description: "Job shop milling/turning package",
  },
  S42: {
    name: "Dynamics 3 Axis Milling",
    includes: ["P17", "P56", "P13", "P25", "P22", "M27", "S07", "S17", "S62", "P28", "P12", "P75"],
    description: "3-axis production milling package with surface optimization",
  },
  S43: {
    name: "Dynamics 5 Axis Milling",
    includes: ["M30", "M48", "P18", "P17", "P56", "P13", "P25", "P22", "M27", "S07", "S17", "S62", "P28", "P12", "P75"],
    description: "5-axis simultaneous milling (NCU 1750/1760 only, not export)",
  },
} as const;

// ─────────────────────────────────────────────────────────────
// 10. COMPLETE CONFIGURATION CHECKLIST
// ─────────────────────────────────────────────────────────────

export const CONFIG_CHECKLIST = {
  /**
   * Every valid configuration MUST have:
   * 1. Control unit (NCU or PPU) — 1x
   * 2. CNC software on SD card — 1x
   * 3. Additional axis licenses for axes beyond base 3
   * 4. Technology package OR individual options
   * 5. Drive system: Line Module + Motor Modules
   * 6. Motors: feed motors + spindle motor(s)
   * 7. HMI (external for NCU, built-in for PPU)
   * 8. Safety options (at minimum basic STO/SS1/SBC is included)
   * 9. Cables: DRIVE-CLiQ, motor power, encoder, network
   *
   * OPTIONAL but common:
   * - Additional channels (for multi-channel machines)
   * - Extended safety (S60 + K-options or S61)
   * - Measuring cycles (P28)
   * - Compensation options (M53, M54, M55)
   * - NX expansion (if DRIVE-CLiQ ports insufficient)
   */
  required: [
    "controlUnit",
    "cncSoftware",
    "drives",
    "motors",
    "hmi",
    "cables",
  ],
  optional: [
    "additionalAxes",
    "additionalChannels",
    "technologyPackage",
    "extendedSafety",
    "measuringCycles",
    "compensations",
    "nxExpansion",
  ],
} as const;
