import type { DriveComponent } from "@/types/catalog";
import { MOTOR_MODULE_SPECS } from "@/lib/validation/drive-system-rules";

const allUnitsOption = {
  PPU_1740: "option" as const,
  NCU_1740: "option" as const,
  NCU_1750: "option" as const,
  NCU_1760: "option" as const,
};

/**
 * SINAMICS S120 booksize Single Motor Modules — generated from
 * MOTOR_MODULE_SPECS so the catalog is automatically self-consistent
 * with the BOM output. Each entry carries a real orderable MLFB.
 */
const s120BooksizeSingleMotorModules: DriveComponent[] = Object.entries(
  MOTOR_MODULE_SPECS,
).map(([articleNumber, specs]) => ({
  id: `s120-smm-${articleNumber}`,
  articleNumber,
  name: `Single Motor Module booksize ${specs.current}A (${specs.power}kW)`,
  driveFamily: "S120_booksize" as const,
  componentType: "motor_module_single" as const,
  variant: articleNumber.endsWith("AC0") || articleNumber.endsWith("AC3")
    ? "C type (cold plate)"
    : "D type (internal air)",
  ratedCurrent: `${specs.current}A`,
  ratedPower: `${specs.power}kW`,
  coolingType: articleNumber.endsWith("AC0") || articleNumber.endsWith("AC3")
    ? ("cold_plate" as const)
    : ("internal_air" as const),
  compatibility: allUnitsOption,
  description: `SINAMICS S120 booksize Single Motor Module ${specs.current}A / ${specs.power}kW (${specs.voltage}). Drives one axis.`,
}));

/**
 * SINAMICS S120 booksize Line Modules — Smart, Active, and Basic
 * variants. MLFBs sourced from LINE_MODULES in drive-system-rules.
 */
const s120BooksizeLineModules: DriveComponent[] = [
  {
    id: "s120-slm-5kw",
    articleNumber: "6SL3130-6AE15-0AB1",
    name: "Smart Line Module booksize 5 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_smart",
    ratedPower: "5 kW",
    coolingType: "cold_plate",
    compatibility: allUnitsOption,
    description: "Non-regenerative infeed with integrated braking chopper.",
  },
  {
    id: "s120-slm-10kw",
    articleNumber: "6SL3130-6AE21-0AB1",
    name: "Smart Line Module booksize 10 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_smart",
    ratedPower: "10 kW",
    coolingType: "cold_plate",
    compatibility: allUnitsOption,
    description: "Non-regenerative infeed with integrated braking chopper.",
  },
  {
    id: "s120-slm-36kw",
    articleNumber: "6SL3130-6TE23-6AA3",
    name: "Smart Line Module booksize 36 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_smart",
    ratedPower: "36 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "Non-regenerative infeed for medium-power machine tools.",
  },
  {
    id: "s120-slm-55kw",
    articleNumber: "6SL3130-6TE25-5AA3",
    name: "Smart Line Module booksize 55 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_smart",
    ratedPower: "55 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "Non-regenerative infeed for high-power machine tools.",
  },
  {
    id: "s120-alm-16kw",
    articleNumber: "6SL3130-7TE21-6AA4",
    name: "Active Line Module booksize 16 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_active",
    ratedPower: "16 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "Regenerative infeed with unity power factor and low harmonics.",
  },
  {
    id: "s120-alm-36kw",
    articleNumber: "6SL3130-7TE23-6AA3",
    name: "Active Line Module booksize 36 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_active",
    ratedPower: "36 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "Regenerative infeed for medium-power applications.",
  },
  {
    id: "s120-alm-55kw",
    articleNumber: "6SL3130-7TE25-5AA3",
    name: "Active Line Module booksize 55 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_active",
    ratedPower: "55 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "Regenerative infeed for high-power applications.",
  },
  {
    id: "s120-alm-80kw",
    articleNumber: "6SL3130-7TE28-0AA3",
    name: "Active Line Module booksize 80 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_active",
    ratedPower: "80 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "Regenerative infeed for very-high-power applications.",
  },
  {
    id: "s120-alm-120kw",
    articleNumber: "6SL3130-7TE31-2AA3",
    name: "Active Line Module booksize 120 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_active",
    ratedPower: "120 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "Regenerative infeed at the top of the booksize range.",
  },
  {
    id: "s120-blm-20kw",
    articleNumber: "6SL3130-1TE22-0AA0",
    name: "Basic Line Module booksize 20 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_basic",
    ratedPower: "20 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "Diode-rectifier infeed (cheapest, no regen, no braking chopper).",
  },
  {
    id: "s120-blm-40kw",
    articleNumber: "6SL3130-1TE24-0AA0",
    name: "Basic Line Module booksize 40 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_basic",
    ratedPower: "40 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "Diode-rectifier infeed for medium-power systems.",
  },
  {
    id: "s120-blm-100kw",
    articleNumber: "6SL3130-1TE31-0AA0",
    name: "Basic Line Module booksize 100 kW",
    driveFamily: "S120_booksize",
    componentType: "line_module_basic",
    ratedPower: "100 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "Diode-rectifier infeed for very-high-power systems.",
  },
];

/**
 * Static entries — control units, sensor modules, terminal modules,
 * and other ancillaries with concrete MLFBs sourced directly from the
 * Siemens catalog (D21.4 part 1 + NC63).
 */
const staticDriveComponents: DriveComponent[] = [
  // ── SINAMICS S120 chassis (high-power, frame size G+) ───────────────
  {
    id: "s120-mm-chassis-260a",
    articleNumber: "6SL3320-1TE32-6AA3",
    name: "Motor Module chassis 260A",
    driveFamily: "S120_chassis",
    componentType: "motor_module_single",
    ratedCurrent: "260A",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "SINAMICS S120 chassis Motor Module 260A. For high-power axes beyond booksize range.",
  },
  {
    id: "s120-mm-chassis-490a",
    articleNumber: "6SL3320-1TE34-9AA3",
    name: "Motor Module chassis 490A",
    driveFamily: "S120_chassis",
    componentType: "motor_module_single",
    ratedCurrent: "490A",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "SINAMICS S120 chassis Motor Module 490A.",
  },
  {
    id: "s120-alm-chassis-132kw",
    articleNumber: "6SL3330-7TE32-6AA3",
    name: "Active Line Module chassis 132 kW",
    driveFamily: "S120_chassis",
    componentType: "line_module_active",
    ratedPower: "132 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "SINAMICS S120 chassis Active Line Module. Regenerative for high-power drive systems.",
  },

  // ── SINAMICS S120 Combi ─────────────────────────────────────────────
  {
    id: "s120-combi-3axis-b11",
    articleNumber: "6SL3111-3VE21-6FC1",
    name: "3-axis Power Module B11 (Combi)",
    driveFamily: "S120_combi",
    componentType: "power_module_3axis",
    variant: "C type (cold plate)",
    ratedPower: "16 kW",
    ratedCurrent: "18A + 2x9A",
    coolingType: "cold_plate",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S120 Combi 3-axis Power Module B11. Integrated infeed and 3 drive outputs (1x18A + 2x9A). Compact solution for small machines.",
  },
  {
    id: "s120-combi-4axis-b14",
    articleNumber: "6SL3111-4VE21-6FC1",
    name: "4-axis Power Module B14 (Combi)",
    driveFamily: "S120_combi",
    componentType: "power_module_4axis",
    variant: "C type (cold plate)",
    ratedPower: "16 kW",
    ratedCurrent: "18A + 3x9A",
    coolingType: "cold_plate",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S120 Combi 4-axis Power Module B14. Integrated infeed and 4 drive outputs (1x18A + 3x9A). Ideal for compact 3-axis mills with spindle.",
  },

  // ── SINAMICS S220 booksize ──────────────────────────────────────────
  {
    id: "s220-smm-d-24a",
    articleNumber: "6SL5120-1UE22-4AD0",
    name: "Single Motor Module S220 booksize 24A, D type",
    driveFamily: "S220",
    componentType: "motor_module_single",
    variant: "D type (internal air cooling)",
    ratedCurrent: "24A",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "SINAMICS S220 Single Motor Module booksize, 24A, D type. Next-generation drive platform with enhanced DRIVE-CLiQ communication.",
  },
  {
    id: "s220-dmm",
    articleNumber: "6SL5120-2UE21-0AD0",
    name: "Double Motor Module S220 booksize",
    driveFamily: "S220",
    componentType: "motor_module_double",
    variant: "D type (internal air cooling)",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "SINAMICS S220 Double Motor Module booksize. Two independent drive outputs in a single module.",
  },
  {
    id: "s220-slm-16kw",
    articleNumber: "6SL5130-6UE21-6AC0",
    name: "Smart Line Module S220 booksize 16 kW",
    driveFamily: "S220",
    componentType: "line_module_smart",
    ratedPower: "16 kW",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description: "SINAMICS S220 Smart Line Module booksize, 16 kW. Non-regenerative infeed for S220 drive systems.",
  },

  // ── SINAMICS G120 (auxiliary axes) ──────────────────────────────────
  {
    id: "g120-pm240-2-3kw",
    articleNumber: "6SL3210-1PE21-1UL0",
    name: "SINAMICS G120 PM240-2 3 kW (380-480V)",
    driveFamily: "G120",
    componentType: "motor_module_single",
    ratedPower: "3 kW",
    compatibility: allUnitsOption,
    description: "SINAMICS G120 Power Module PM240-2 3 kW. For auxiliary axes (coolant pumps, chip conveyors). PROFINET-connected.",
  },
  {
    id: "g120-pm240-2-7-5kw",
    articleNumber: "6SL3210-1PE22-7UL0",
    name: "SINAMICS G120 PM240-2 7.5 kW (380-480V)",
    driveFamily: "G120",
    componentType: "motor_module_single",
    ratedPower: "7.5 kW",
    compatibility: allUnitsOption,
    description: "SINAMICS G120 Power Module PM240-2 7.5 kW for auxiliary axes.",
  },

  // ── SINAMICS S210 (single-axis servo for 1FK2) ──────────────────────
  {
    id: "s210-fsa-1ph",
    articleNumber: "6SL3210-5HB10-1UA0",
    name: "SINAMICS S210 FSA 1AC 230V (1.6A)",
    driveFamily: "S210",
    componentType: "motor_module_single",
    ratedCurrent: "1.6A",
    compatibility: allUnitsOption,
    description: "Single-axis servo drive with integrated infeed. Pairs with 1FK2 motors via OCC. SINUMERIK ONE integration via PROFINET.",
  },
  {
    id: "s210-fsb-1ph",
    articleNumber: "6SL3210-5HB10-2UA0",
    name: "SINAMICS S210 FSB 1AC 230V (3.5A)",
    driveFamily: "S210",
    componentType: "motor_module_single",
    ratedCurrent: "3.5A",
    compatibility: allUnitsOption,
    description: "Single-axis servo drive, frame size B. SINUMERIK ONE-compatible.",
  },

  // ── Control Units ──────────────────────────────────────────────────
  {
    id: "cu310-2-pn",
    articleNumber: "6SL3040-1LA01-0AA0",
    name: "CU310-2 PN",
    driveFamily: "S120_booksize",
    componentType: "control_unit",
    compatibility: allUnitsOption,
    description: "SINAMICS CU310-2 PN Control Unit for single-axis drive systems. PROFINET interface for connection to SINUMERIK ONE.",
  },
  {
    id: "cu320-2-pn",
    articleNumber: "6SL3040-1MA01-0AA0",
    name: "CU320-2 PN",
    driveFamily: "S120_booksize",
    componentType: "control_unit",
    compatibility: allUnitsOption,
    description: "SINAMICS CU320-2 PN Control Unit for multi-axis drive systems. Required for S120 booksize/chassis configurations with SINUMERIK ONE.",
  },

  // ── Sensor Modules ─────────────────────────────────────────────────
  { id: "smc10", articleNumber: "6SL3055-0AA00-5AA3", name: "SMC10 (Resolver)", driveFamily: "S120_booksize", componentType: "sensor_module", compatibility: allUnitsOption, description: "Sensor Module Cabinet SMC10 for resolver feedback. Converts to DRIVE-CLiQ." },
  { id: "smc20", articleNumber: "6SL3055-0AA00-5BA3", name: "SMC20 (sin/cos 1Vpp / EnDat 2.1)", driveFamily: "S120_booksize", componentType: "sensor_module", compatibility: allUnitsOption, description: "Sensor Module Cabinet SMC20 for sin/cos 1Vpp and EnDat 2.1 encoders." },
  { id: "smc30", articleNumber: "6SL3055-0AA00-5CA2", name: "SMC30 (TTL / SSI)", driveFamily: "S120_booksize", componentType: "sensor_module", compatibility: allUnitsOption, description: "Sensor Module Cabinet SMC30 for RS422 TTL incremental and SSI absolute encoders." },
  { id: "smc40", articleNumber: "6SL3055-0AA00-5DA0", name: "SMC40 (EnDat 2.2)", driveFamily: "S120_booksize", componentType: "sensor_module", compatibility: allUnitsOption, description: "Sensor Module Cabinet SMC40 for EnDat 2.2 purely-digital encoder interface." },
  { id: "sme20", articleNumber: "6SL3055-0AA00-5EA3", name: "SME20 (sin/cos 1Vpp, IP67)", driveFamily: "S120_booksize", componentType: "sensor_module", compatibility: allUnitsOption, description: "Sensor Module External SME20 IP67 for machine-mounted encoders." },
  { id: "sme25", articleNumber: "6SL3055-0AA00-5HA3", name: "SME25 (EnDat 2.1, IP67)", driveFamily: "S120_booksize", componentType: "sensor_module", compatibility: allUnitsOption, description: "Sensor Module External SME25 IP67 for machine-mounted EnDat 2.1 encoders." },

  // ── NX Extensions ──────────────────────────────────────────────────
  { id: "nx10-3", articleNumber: "6SL3040-1NC00-0AA0", name: "NX10.3", driveFamily: "S120_booksize", componentType: "hub_module", compatibility: allUnitsOption, description: "NX10.3 DRIVE-CLiQ hub. Expands NCU's drive ports for additional components." },
  { id: "nx15-3", articleNumber: "6SL3040-1NB00-0AA0", name: "NX15.3", driveFamily: "S120_booksize", componentType: "hub_module", compatibility: allUnitsOption, description: "NX15.3 DRIVE-CLiQ hub with extended functionality. Supports distributed drive topologies." },

  // ── Terminal Modules ───────────────────────────────────────────────
  { id: "tm15", articleNumber: "6SL3055-0AA00-3FA0", name: "TM15 Terminal Module", driveFamily: "S120_booksize", componentType: "terminal_module", compatibility: allUnitsOption, description: "24 bidirectional digital I/O channels (24V DC). Hot-swap, DRIVE-CLiQ. Axis enable / brake control / gear feedback." },
  { id: "tm17", articleNumber: "6SL3055-0AA00-3HA0", name: "TM17 High Feature Terminal Module", driveFamily: "S120_booksize", componentType: "terminal_module", compatibility: allUnitsOption, description: "16 ultra-fast bidirectional 24V DI/DO with safety + measuring-probe support." },
  { id: "tm31", articleNumber: "6SL3055-0AA00-3AA1", name: "TM31 Terminal Module", driveFamily: "S120_booksize", componentType: "terminal_module", compatibility: allUnitsOption, description: "8 DI / 4 DI/DO / 2 RO + 2 AI / 2 AO + temp inputs. Most common general-purpose Terminal Module." },
  { id: "tm41", articleNumber: "6SL3055-0AA00-3PA1", name: "TM41 Terminal Module (encoder simulator)", driveFamily: "S120_booksize", componentType: "terminal_module", compatibility: allUnitsOption, description: "Simulates incremental TTL encoder output from a DRIVE-CLiQ source." },
  { id: "tm120", articleNumber: "6SL3055-0AA00-3KA0", name: "TM120 Temperature Module (Safety)", driveFamily: "S120_booksize", componentType: "terminal_module", compatibility: allUnitsOption, description: "4 PT100/PT1000/KTY temperature inputs with safety isolation." },
  { id: "tm150", articleNumber: "6SL3055-0AA00-3LA0", name: "TM150 Temperature Module (12 channels)", driveFamily: "S120_booksize", componentType: "terminal_module", compatibility: allUnitsOption, description: "12 PT100/PT1000/KTY/NTC temperature inputs on the DRIVE-CLiQ bus." },

  // ── Voltage Protection Module ──────────────────────────────────────
  { id: "vpm200", articleNumber: "6SL3000-2BE32-1AA0", name: "Voltage Protection Module 200", driveFamily: "S120_booksize", componentType: "voltage_protection", compatibility: allUnitsOption, description: "DC-link clamping module — protects from over-voltage in regen failure. Essential for high-inertia spindles." },
];

export const driveComponents: DriveComponent[] = [
  ...s120BooksizeSingleMotorModules,
  ...s120BooksizeLineModules,
  ...staticDriveComponents,
];
