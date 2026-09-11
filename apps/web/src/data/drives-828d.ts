import type { DriveComponent } from "@/types/catalog";

const std = { PPU_270_5: "option", PPU_271_5: "option", PPU_290_5: "option", PU_272_5: "option" } as const;
const smart = { PPU_260_5: "option", PPU_261_5: "option" } as const;

/**
 * SINUMERIK 828D drive hardware — Catalog NC 82 (2025) chapter 4 for SINAMICS
 * S120 Combi and its mandatory line reactor; 828D Smart details PDF p.27/p.35
 * (cross-checked with D 37.1 11/2025) for SINAMICS S200 / S200 Spindle.
 */
export interface CombiPowerModule {
  articleNumber: string;
  name: string;
  frameType: string;
  axes: 3 | 4;
  ratedPowerKw: number;
  spindleCurrentA: number;
  feedCurrentsA: number[];
  source: string;
}

export const COMBI_POWER_MODULES: CombiPowerModule[] = [
  { articleNumber: "6SL3111-3VE21-6FC1", name: "SINAMICS S120 Combi Power Module 3-axis 16 kW, frame type B11", frameType: "B11", axes: 3, ratedPowerKw: 16, spindleCurrentA: 18, feedCurrentsA: [9, 9], source: "NC82 p.4/3 (tech data p.4/4)" },
  { articleNumber: "6SL3111-3VE21-6EC1", name: "SINAMICS S120 Combi Power Module 3-axis 16 kW, frame type B12", frameType: "B12", axes: 3, ratedPowerKw: 16, spindleCurrentA: 24, feedCurrentsA: [9, 9], source: "NC82 p.4/3 (tech data p.4/4)" },
  { articleNumber: "6SL3111-3VE22-0HC1", name: "SINAMICS S120 Combi Power Module 3-axis 20 kW, frame type B13", frameType: "B13", axes: 3, ratedPowerKw: 20, spindleCurrentA: 30, feedCurrentsA: [9, 9], source: "NC82 p.4/3 (tech data p.4/4)" },
  { articleNumber: "6SL3111-4VE21-6FC1", name: "SINAMICS S120 Combi Power Module 4-axis 16 kW, frame type B14", frameType: "B14", axes: 4, ratedPowerKw: 16, spindleCurrentA: 18, feedCurrentsA: [9, 9, 9], source: "NC82 p.4/3 (tech data p.4/6-4/7)" },
  { articleNumber: "6SL3111-4VE21-6EC1", name: "SINAMICS S120 Combi Power Module 4-axis 16 kW, frame type B01", frameType: "B01", axes: 4, ratedPowerKw: 16, spindleCurrentA: 24, feedCurrentsA: [12, 9, 9], source: "NC82 p.4/3 (tech data p.4/6-4/7)" },
  { articleNumber: "6SL3111-4VE21-6ED1", name: "SINAMICS S120 Combi Power Module 4-axis 16 kW, frame type B02", frameType: "B02", axes: 4, ratedPowerKw: 16, spindleCurrentA: 24, feedCurrentsA: [12, 9, 9], source: "NC82 p.4/3 (tech data p.4/6-4/7)" },
  { articleNumber: "6SL3111-4VE21-6ED2", name: "SINAMICS S120 Combi Power Module 4-axis 16 kW, frame type B17 (pulse frequency 4 kHz/8 kHz)", frameType: "B17", axes: 4, ratedPowerKw: 16, spindleCurrentA: 24, feedCurrentsA: [12, 9, 9], source: "NC82 p.4/3 (tech data p.4/6-4/7)" },
  { articleNumber: "6SL3111-4VE22-0HC1", name: "SINAMICS S120 Combi Power Module 4-axis 20 kW, frame type B16", frameType: "B16", axes: 4, ratedPowerKw: 20, spindleCurrentA: 30, feedCurrentsA: [12, 9, 9], source: "NC82 p.4/3 (tech data p.4/6-4/7)" },
];

/** Line reactor is mandatory for every Combi Power Module (NC 82 p.4/8). */
export const COMBI_LINE_REACTOR: Record<16 | 20, { articleNumber: string; name: string }> = {
  16: { articleNumber: "6SL3100-0EE21-6AB0", name: "SINAMICS line reactor 16 kW (mandatory for 16 kW Combi Power Modules)" },
  20: { articleNumber: "6SL3100-0EE22-0AA0", name: "SINAMICS line reactor 20 kW (mandatory for 20 kW Combi Power Modules)" },
};

export const COMBI_CONNECTION_KIT = { articleNumber: "6SL3161-3XP00-0AA0", name: "Connection kit for expansion axes (booksize Motor Modules on Combi)" };

/** SINAMICS S200 PN 400 V feed converters (Smart PDF p.27; D 37.1 11/2025). Option T80 is part of the ordering code. */
export const S200_FEED_CONVERTERS: Array<{ articleNumber: string; ratedPowerKw: number; frameSize: string; ratedCurrentA: number }> = [
  { articleNumber: "6SL5510-1BE10-4AF0-Z T80", ratedPowerKw: 0.4, frameSize: "FSA", ratedCurrentA: 1.3 },
  { articleNumber: "6SL5510-1BE10-8AF0-Z T80", ratedPowerKw: 0.75, frameSize: "FSA", ratedCurrentA: 2.5 },
  { articleNumber: "6SL5510-1BE11-0AF0-Z T80", ratedPowerKw: 1, frameSize: "FSB", ratedCurrentA: 3.0 },
  { articleNumber: "6SL5510-1BE11-5AF0-Z T80", ratedPowerKw: 1.75, frameSize: "FSB", ratedCurrentA: 5.3 },
  { articleNumber: "6SL5510-1BE12-5AF0-Z T80", ratedPowerKw: 2.5, frameSize: "FSC", ratedCurrentA: 7.8 },
  { articleNumber: "6SL5510-1BE13-5AF0-Z T80", ratedPowerKw: 3.5, frameSize: "FSC", ratedCurrentA: 11 },
  { articleNumber: "6SL5510-1BE15-0AF0-Z T80", ratedPowerKw: 5, frameSize: "FSD", ratedCurrentA: 12.6 },
  { articleNumber: "6SL5510-1BE17-0AF0-Z T80", ratedPowerKw: 7, frameSize: "FSD", ratedCurrentA: 13.2 },
];

/** SINAMICS S200 Spindle converters for 1PH3 Pro (Smart PDF p.35). */
export const S200_SPINDLE_CONVERTERS: Array<{ articleNumber: string; ratedPowerKw: number; frameSize: string; ratedCurrentA: number; shaftHeight: number }> = [
  { articleNumber: "6SL5510-1EE13-7AF0", ratedPowerKw: 3.7, frameSize: "FSE", ratedCurrentA: 13, shaftHeight: 100 },
  { articleNumber: "6SL5510-1EE17-5AF0", ratedPowerKw: 7.5, frameSize: "FSE", ratedCurrentA: 18, shaftHeight: 100 },
  { articleNumber: "6SL5510-1EE21-1AF0", ratedPowerKw: 11, frameSize: "FSF", ratedCurrentA: 30, shaftHeight: 132 },
  { articleNumber: "6SL5510-1EE21-5AF0", ratedPowerKw: 15, frameSize: "FSF", ratedCurrentA: 43, shaftHeight: 132 },
];

/** Catalog entries for the BOM (drives, NX extensions, reactors). */
export const driveComponents828d: DriveComponent[] = [
  { id: "combi-6SL3111-3VE21-6FC1", articleNumber: "6SL3111-3VE21-6FC1", name: "SINAMICS S120 Combi Power Module 3-axis 16 kW, frame type B11", driveFamily: "S120_combi", componentType: "power_module_3axis", ratedPower: "16kW", ratedCurrent: "18A spindle / 9/9A feed", compatibility: std, description: "SINAMICS S120 Combi Power Module with integrated regenerative infeed, 3 motor power units and TTL spindle encoder interface — NC82 p.4/3 (tech data p.4/4)" },
  { id: "combi-6SL3111-3VE21-6EC1", articleNumber: "6SL3111-3VE21-6EC1", name: "SINAMICS S120 Combi Power Module 3-axis 16 kW, frame type B12", driveFamily: "S120_combi", componentType: "power_module_3axis", ratedPower: "16kW", ratedCurrent: "24A spindle / 9/9A feed", compatibility: std, description: "SINAMICS S120 Combi Power Module with integrated regenerative infeed, 3 motor power units and TTL spindle encoder interface — NC82 p.4/3 (tech data p.4/4)" },
  { id: "combi-6SL3111-3VE22-0HC1", articleNumber: "6SL3111-3VE22-0HC1", name: "SINAMICS S120 Combi Power Module 3-axis 20 kW, frame type B13", driveFamily: "S120_combi", componentType: "power_module_3axis", ratedPower: "20kW", ratedCurrent: "30A spindle / 9/9A feed", compatibility: std, description: "SINAMICS S120 Combi Power Module with integrated regenerative infeed, 3 motor power units and TTL spindle encoder interface — NC82 p.4/3 (tech data p.4/4)" },
  { id: "combi-6SL3111-4VE21-6FC1", articleNumber: "6SL3111-4VE21-6FC1", name: "SINAMICS S120 Combi Power Module 4-axis 16 kW, frame type B14", driveFamily: "S120_combi", componentType: "power_module_4axis", ratedPower: "16kW", ratedCurrent: "18A spindle / 9/9/9A feed", compatibility: std, description: "SINAMICS S120 Combi Power Module with integrated regenerative infeed, 4 motor power units and TTL spindle encoder interface — NC82 p.4/3 (tech data p.4/6-4/7)" },
  { id: "combi-6SL3111-4VE21-6EC1", articleNumber: "6SL3111-4VE21-6EC1", name: "SINAMICS S120 Combi Power Module 4-axis 16 kW, frame type B01", driveFamily: "S120_combi", componentType: "power_module_4axis", ratedPower: "16kW", ratedCurrent: "24A spindle / 12/9/9A feed", compatibility: std, description: "SINAMICS S120 Combi Power Module with integrated regenerative infeed, 4 motor power units and TTL spindle encoder interface — NC82 p.4/3 (tech data p.4/6-4/7)" },
  { id: "combi-6SL3111-4VE21-6ED1", articleNumber: "6SL3111-4VE21-6ED1", name: "SINAMICS S120 Combi Power Module 4-axis 16 kW, frame type B02", driveFamily: "S120_combi", componentType: "power_module_4axis", ratedPower: "16kW", ratedCurrent: "24A spindle / 12/9/9A feed", compatibility: std, description: "SINAMICS S120 Combi Power Module with integrated regenerative infeed, 4 motor power units and TTL spindle encoder interface — NC82 p.4/3 (tech data p.4/6-4/7)" },
  { id: "combi-6SL3111-4VE21-6ED2", articleNumber: "6SL3111-4VE21-6ED2", name: "SINAMICS S120 Combi Power Module 4-axis 16 kW, frame type B17 (pulse frequency 4 kHz/8 kHz)", driveFamily: "S120_combi", componentType: "power_module_4axis", ratedPower: "16kW", ratedCurrent: "24A spindle / 12/9/9A feed", compatibility: std, description: "SINAMICS S120 Combi Power Module with integrated regenerative infeed, 4 motor power units and TTL spindle encoder interface — NC82 p.4/3 (tech data p.4/6-4/7)" },
  { id: "combi-6SL3111-4VE22-0HC1", articleNumber: "6SL3111-4VE22-0HC1", name: "SINAMICS S120 Combi Power Module 4-axis 20 kW, frame type B16", driveFamily: "S120_combi", componentType: "power_module_4axis", ratedPower: "20kW", ratedCurrent: "30A spindle / 12/9/9A feed", compatibility: std, description: "SINAMICS S120 Combi Power Module with integrated regenerative infeed, 4 motor power units and TTL spindle encoder interface — NC82 p.4/3 (tech data p.4/6-4/7)" },
  { id: "combi-reactor-16", articleNumber: "6SL3100-0EE21-6AB0", name: "SINAMICS line reactor 16 kW", driveFamily: "S120_combi", componentType: "interface_module", compatibility: std, description: "Mandatory line reactor for 16 kW Combi Power Modules (NC 82 p.4/8)" },
  { id: "combi-reactor-20", articleNumber: "6SL3100-0EE22-0AA0", name: "SINAMICS line reactor 20 kW", driveFamily: "S120_combi", componentType: "interface_module", compatibility: std, description: "Mandatory line reactor for 20 kW Combi Power Modules (NC 82 p.4/8)" },
  { id: "combi-connection-kit", articleNumber: "6SL3161-3XP00-0AA0", name: "Connection kit for expansion axes", driveFamily: "S120_combi", componentType: "hub_module", compatibility: std, description: "Connects up to 2 S120 booksize Motor Modules (5th/6th axis) to a Combi Power Module (NC 82 p.4/3)" },
  { id: "nx10-3", articleNumber: "6SL3040-1NC00-0AA0", name: "Numeric Control Extension NX10.3", driveFamily: "S120_booksize", componentType: "control_unit", compatibility: std, description: "Extends the PPU drive control by up to 3 axes (system up to 9 axes) over DRIVE-CLiQ — NC 82 p.3/20" },
  { id: "nx15-3", articleNumber: "6SL3040-1NB00-0AA0", name: "Numeric Control Extension NX15.3", driveFamily: "S120_booksize", componentType: "control_unit", compatibility: std, description: "Extends the PPU drive control by up to 6 axes (system up to 12 axes) over DRIVE-CLiQ — NC 82 p.3/20" },
  { id: "s200-6SL5510-1BE10-4AF0-Z_T80", articleNumber: "6SL5510-1BE10-4AF0-Z T80", name: "SINAMICS S200 PN 400 V feed converter 0.4 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "0.4kW", ratedCurrent: "1.3A", frameType: "FSA", compatibility: smart, description: "SINAMICS S200 PN 400V feed drive 0.4 kW, 1.3 A — SMART Page 27 (table 'SINAMICS S200 PN 400V + SIMOTICS S-1FL2')" },
  { id: "s200-6SL5510-1BE10-8AF0-Z_T80", articleNumber: "6SL5510-1BE10-8AF0-Z T80", name: "SINAMICS S200 PN 400 V feed converter 0.75 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "0.75kW", ratedCurrent: "2.5A", frameType: "FSA", compatibility: smart, description: "SINAMICS S200 PN 400V feed drive 0.75 kW, 2.5 A — SMART Page 27" },
  { id: "s200-6SL5510-1BE11-0AF0-Z_T80", articleNumber: "6SL5510-1BE11-0AF0-Z T80", name: "SINAMICS S200 PN 400 V feed converter 1 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "1kW", ratedCurrent: "3.0A", frameType: "FSB", compatibility: smart, description: "SINAMICS S200 PN 400V feed drive 1 kW, 3.0 A — SMART Page 27" },
  { id: "s200-6SL5510-1BE11-5AF0-Z_T80", articleNumber: "6SL5510-1BE11-5AF0-Z T80", name: "SINAMICS S200 PN 400 V feed converter 1.75 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "1.75kW", ratedCurrent: "5.3A", frameType: "FSB", compatibility: smart, description: "SINAMICS S200 PN 400V feed drive 1.75 kW, 5.3 A — SMART Page 27" },
  { id: "s200-6SL5510-1BE12-5AF0-Z_T80", articleNumber: "6SL5510-1BE12-5AF0-Z T80", name: "SINAMICS S200 PN 400 V feed converter 2.5 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "2.5kW", ratedCurrent: "7.8A", frameType: "FSC", compatibility: smart, description: "SINAMICS S200 PN 400V feed drive 2.5 kW, 7.8 A — SMART Page 27; Page 48 sample BOM (VMC850: 3x '2.5kW')" },
  { id: "s200-6SL5510-1BE13-5AF0-Z_T80", articleNumber: "6SL5510-1BE13-5AF0-Z T80", name: "SINAMICS S200 PN 400 V feed converter 3.5 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "3.5kW", ratedCurrent: "11A", frameType: "FSC", compatibility: smart, description: "SINAMICS S200 PN 400V feed drive 3.5 kW, 11 A — SMART Page 27; Page 48 sample BOM (CK6150: 2x '3.5kW')" },
  { id: "s200-6SL5510-1BE15-0AF0-Z_T80", articleNumber: "6SL5510-1BE15-0AF0-Z T80", name: "SINAMICS S200 PN 400 V feed converter 5 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "5kW", ratedCurrent: "12.6A", frameType: "FSD", compatibility: smart, description: "SINAMICS S200 PN 400V feed drive 5 kW, 12.6 A — SMART Page 27" },
  { id: "s200-6SL5510-1BE17-0AF0-Z_T80", articleNumber: "6SL5510-1BE17-0AF0-Z T80", name: "SINAMICS S200 PN 400 V feed converter 7 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "7kW", ratedCurrent: "13.2A", frameType: "FSD", compatibility: smart, description: "SINAMICS S200 PN 400V feed drive 7 kW, 13.2 A — SMART Page 27" },
  { id: "s200-6SL5510-1EE13-7AF0", articleNumber: "6SL5510-1EE13-7AF0", name: "SINAMICS S200 Spindle converter 3.7 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "3.7kW", ratedCurrent: "13A", frameType: "FSE", compatibility: smart, description: "SINAMICS S200 Spindle drive 3.7 kW, 13 A — SMART Page 35, Page 30" },
  { id: "s200-6SL5510-1EE17-5AF0", articleNumber: "6SL5510-1EE17-5AF0", name: "SINAMICS S200 Spindle converter 7.5 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "7.5kW", ratedCurrent: "18A", frameType: "FSE", compatibility: smart, description: "SINAMICS S200 Spindle drive 7.5 kW, 18 A — SMART Page 35; Page 48 sample BOM ('S200 SP 7.5kW')" },
  { id: "s200-6SL5510-1EE21-1AF0", articleNumber: "6SL5510-1EE21-1AF0", name: "SINAMICS S200 Spindle converter 11 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "11kW", ratedCurrent: "30A", frameType: "FSF", compatibility: smart, description: "SINAMICS S200 Spindle drive 11 kW, 30 A — SMART Page 35; Page 48 sample BOM ('S200 SP 11kW')" },
  { id: "s200-6SL5510-1EE21-5AF0", articleNumber: "6SL5510-1EE21-5AF0", name: "SINAMICS S200 Spindle converter 15 kW", driveFamily: "S200", componentType: "motor_module_single", ratedPower: "15kW", ratedCurrent: "43A", frameType: "FSF", compatibility: smart, description: "SINAMICS S200 Spindle drive 15 kW, 43 A — SMART Page 35, Page 30" },
];
