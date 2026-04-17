import type { DriveComponent } from "@/types/catalog";

const allUnitsOption = {
  PPU_1740: "option" as const,
  NCU_1740: "option" as const,
  NCU_1750: "option" as const,
  NCU_1760: "option" as const,
};

export const driveComponents: DriveComponent[] = [
  // ── SINAMICS S120 booksize ──────────────────────────────────────────
  {
    id: "s120-smm-c",
    articleNumber: "6SL3120-1TE2*-0AA*",
    name: "Single Motor Module booksize, C type (select by rated current)",
    driveFamily: "S120_booksize",
    componentType: "motor_module_single",
    variant: "C type (cold plate)",
    coolingType: "cold_plate",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S120 Single Motor Module booksize, C type (cold plate cooling). Various current ratings available.",
  },
  {
    id: "s120-smm-d",
    articleNumber: "6SL3120-1TE2*-0AD*",
    name: "Single Motor Module booksize, D type (select by rated current)",
    driveFamily: "S120_booksize",
    componentType: "motor_module_single",
    variant: "D type (internal air cooling)",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S120 Single Motor Module booksize, D type (internal air cooling). Various current ratings available.",
  },
  {
    id: "s120-dmm-c",
    articleNumber: "6SL3120-2TE2*-0AA*",
    name: "Double Motor Module booksize, C type (select by rated current)",
    driveFamily: "S120_booksize",
    componentType: "motor_module_double",
    variant: "C type (cold plate)",
    coolingType: "cold_plate",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S120 Double Motor Module booksize, C type. Drives two axes from a single module to save cabinet space.",
  },
  {
    id: "s120-alm-booksize",
    articleNumber: "6SL3130-7TE2*-5AA*",
    name: "Active Line Module booksize (select by rated current)",
    driveFamily: "S120_booksize",
    componentType: "line_module_active",
    coolingType: "cold_plate",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S120 Active Line Module booksize. Regenerative infeed with low harmonics and unity power factor. Required for energy recovery to the mains.",
  },
  {
    id: "s120-slm-booksize",
    articleNumber: "6SL3130-6TE2*-5AA*",
    name: "Smart Line Module booksize (select by rated current)",
    driveFamily: "S120_booksize",
    componentType: "line_module_smart",
    coolingType: "cold_plate",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S120 Smart Line Module booksize. Non-regenerative infeed with integrated braking chopper. Cost-effective standard infeed solution.",
  },
  {
    id: "s120-blm-booksize",
    articleNumber: "6SL3130-1TE2*-0AA*",
    name: "Basic Line Module booksize (select by rated current)",
    driveFamily: "S120_booksize",
    componentType: "line_module_basic",
    coolingType: "cold_plate",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S120 Basic Line Module booksize. Unregulated infeed (diode rectifier). Most economical option when regeneration is not required.",
  },

  // ── SINAMICS S120 chassis ───────────────────────────────────────────
  {
    id: "s120-mm-chassis",
    articleNumber: "6SL3320-1TE3*-*AA3",
    name: "Motor Module chassis",
    driveFamily: "S120_chassis",
    componentType: "motor_module_single",
    ratedCurrent: "up to 490A",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S120 Motor Module chassis format for high-power applications up to 490A. Air-cooled with internal fan.",
  },
  {
    id: "s120-alm-chassis",
    articleNumber: "6SL3330-7TE3*-*AA*",
    name: "Active Line Module chassis",
    driveFamily: "S120_chassis",
    componentType: "line_module_active",
    coolingType: "internal_air",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S120 Active Line Module chassis format. Regenerative infeed for high-power drive systems.",
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
    description:
      "SINAMICS S220 Single Motor Module booksize, 24A, D type. Next-generation drive platform with enhanced DRIVE-CLiQ communication.",
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
    description:
      "SINAMICS S220 Double Motor Module booksize. Two independent drive outputs in a single module.",
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
    description:
      "SINAMICS S220 Smart Line Module booksize, 16 kW. Non-regenerative infeed for S220 drive systems.",
  },

  // ── SINAMICS G120 ──────────────────────────────────────────────────
  {
    id: "g120-pm240-2",
    articleNumber: "6SL3210-1PE*-*UL*",
    name: "SINAMICS G120 PM240-2 380-480V (select by rated current)",
    driveFamily: "G120",
    componentType: "motor_module_single",
    description:
      "SINAMICS G120 Power Module PM240-2 for 380-480V. Suitable for auxiliary axes (coolant pumps, chip conveyors, etc.) connected via PROFINET.",
    compatibility: allUnitsOption,
  },

  // ── SINAMICS S210 ──────────────────────────────────────────────────
  {
    id: "s210-servo",
    articleNumber: "6SL3210-5HB10-**A*",
    name: "SINAMICS S210 Servo Drive",
    driveFamily: "S210",
    componentType: "motor_module_single",
    compatibility: allUnitsOption,
    description:
      "SINAMICS S210 single-axis servo drive with integrated infeed. For use with 1FK2 motors in 1-cable technology. Requires CNC SW >= 6.25 and drive firmware >= 6.4 for SINUMERIK ONE integration.",
  },

  // ── Control Units ──────────────────────────────────────────────────
  {
    id: "cu310-2-pn",
    articleNumber: "6SL3040-1LA01-0AA0",
    name: "CU310-2 PN",
    driveFamily: "S120_booksize",
    componentType: "control_unit",
    compatibility: allUnitsOption,
    description:
      "SINAMICS CU310-2 PN Control Unit for single-axis drive systems. PROFINET interface for connection to SINUMERIK ONE.",
  },
  {
    id: "cu320-2-pn",
    articleNumber: "6SL3040-1MA01-0AA0",
    name: "CU320-2 PN",
    driveFamily: "S120_booksize",
    componentType: "control_unit",
    compatibility: allUnitsOption,
    description:
      "SINAMICS CU320-2 PN Control Unit for multi-axis drive systems. Required for S120 booksize/chassis configurations with SINUMERIK ONE.",
  },

  // ── Sensor Modules ─────────────────────────────────────────────────
  {
    id: "smc10",
    articleNumber: "6SL3055-0AA00-5AA3",
    name: "SMC10 (Resolver)",
    driveFamily: "S120_booksize",
    componentType: "sensor_module",
    compatibility: allUnitsOption,
    description:
      "Sensor Module Cabinet-mounted SMC10 for resolver feedback. Converts resolver signals to DRIVE-CLiQ.",
  },
  {
    id: "smc20",
    articleNumber: "6SL3055-0AA00-5BA3",
    name: "SMC20 (sin/cos 1Vpp / EnDat 2.1)",
    driveFamily: "S120_booksize",
    componentType: "sensor_module",
    compatibility: allUnitsOption,
    description:
      "Sensor Module Cabinet-mounted SMC20 for sin/cos 1Vpp and EnDat 2.1 encoders. Versatile module for rotary and linear encoders.",
  },
  {
    id: "smc30",
    articleNumber: "6SL3055-0AA00-5CA2",
    name: "SMC30 (TTL / SSI)",
    driveFamily: "S120_booksize",
    componentType: "sensor_module",
    compatibility: allUnitsOption,
    description:
      "Sensor Module Cabinet-mounted SMC30 for RS422 TTL incremental and SSI absolute encoders.",
  },
  {
    id: "smc40",
    articleNumber: "6SL3055-0AA00-5DA0",
    name: "SMC40 (EnDat 2.2)",
    driveFamily: "S120_booksize",
    componentType: "sensor_module",
    compatibility: allUnitsOption,
    description:
      "Sensor Module Cabinet-mounted SMC40 for EnDat 2.2 purely digital encoder interface. Highest accuracy and noise immunity.",
  },
  {
    id: "sme20",
    articleNumber: "6SL3055-0AA00-5EA3",
    name: "SME20 (sin/cos 1Vpp, IP67)",
    driveFamily: "S120_booksize",
    componentType: "sensor_module",
    compatibility: allUnitsOption,
    description:
      "Sensor Module External SME20 for sin/cos 1Vpp encoders with IP67 protection. Mounted directly on the machine for short encoder cable runs.",
  },
  {
    id: "sme25",
    articleNumber: "6SL3055-0AA00-5HA3",
    name: "SME25 (EnDat 2.1, IP67)",
    driveFamily: "S120_booksize",
    componentType: "sensor_module",
    compatibility: allUnitsOption,
    description:
      "Sensor Module External SME25 for EnDat 2.1 encoders with IP67 protection. Machine-mounted for reduced cabling effort.",
  },

  // ── NX Extensions ──────────────────────────────────────────────────
  {
    id: "nx10-3",
    articleNumber: "6SL3040-1NC00-0AA0",
    name: "NX10.3",
    driveFamily: "S120_booksize",
    componentType: "hub_module",
    compatibility: allUnitsOption,
    description:
      "NX10.3 DRIVE-CLiQ hub module. Expands the number of DRIVE-CLiQ ports on the NCU for additional drive components.",
  },
  {
    id: "nx15-3",
    articleNumber: "6SL3040-1NB00-0AA0",
    name: "NX15.3",
    driveFamily: "S120_booksize",
    componentType: "hub_module",
    compatibility: allUnitsOption,
    description:
      "NX15.3 DRIVE-CLiQ hub module with extended functionality. Provides additional DRIVE-CLiQ ports and supports distributed drive topologies.",
  },
];
