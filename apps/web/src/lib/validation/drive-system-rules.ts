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

/**
 * SINAMICS S210 single-axis converters (paired with 1FK2 via OCC).
 * Source: D32 catalog selection tables. S210 has an integrated infeed,
 * so a configuration that only uses S210 needs NO S120 Line Module.
 */
export const S210_CONVERTER_SPECS: Record<string, { power: number; frame: string; voltage: string }> = {
  "6SL5310-1BB10-1CF0": { power: 0.1, frame: "FSA", voltage: "1AC 230V" },
  "6SL5310-1BB10-2CF0": { power: 0.2, frame: "FSA", voltage: "1AC 230V" },
  "6SL5310-1BB10-4CF0": { power: 0.4, frame: "FSB", voltage: "1AC 230V" },
  "6SL5310-1BB10-8CF0": { power: 0.75, frame: "FSC", voltage: "1AC 230V" },
  "6SL5310-1BE11-0DF1": { power: 1.0, frame: "FSA", voltage: "3AC 400V" },
  "6SL5310-1BE11-5DF1": { power: 1.5, frame: "FSB", voltage: "3AC 400V" },
  "6SL5310-1BE12-0DF1": { power: 2.0, frame: "FSB", voltage: "3AC 400V" },
  "6SL5310-1BE13-5DF1": { power: 3.5, frame: "FSC", voltage: "3AC 400V" },
  "6SL5310-1BE15-0DF1": { power: 5.0, frame: "FSC", voltage: "3AC 400V" },
};

/** True for SINAMICS S210 converter articles (integrated infeed, no Line Module). */
export function isS210Converter(article: string | undefined): boolean {
  return !!article && article.startsWith("6SL5310-");
}

/** True for SINAMICS S200 / S200 Spindle converters (828D Smart, PROFINET). */
export function isS200Converter(article: string | undefined): boolean {
  return !!article && article.startsWith("6SL5510-");
}

/** Single-axis converters with their own infeed: no Line Module, no DRIVE-CLiQ. */
export function isSingleAxisConverter(article: string | undefined): boolean {
  return isS210Converter(article) || isS200Converter(article);
}

/**
 * SINAMICS S200 PN 400 V feed converters and S200 Spindle converters
 * (828D Smart details PDF p.27 / p.35, D 37.1 11/2025). Keyed by the full
 * ordering code as written in the BOM.
 */
export const S200_CONVERTER_SPECS: Record<string, { power: number; current: number; frame: string; spindle: boolean }> = {
  "6SL5510-1BE10-4AF0-Z T80": { power: 0.4, current: 1.3, frame: "FSA", spindle: false },
  "6SL5510-1BE10-8AF0-Z T80": { power: 0.75, current: 2.5, frame: "FSA", spindle: false },
  "6SL5510-1BE11-0AF0-Z T80": { power: 1.0, current: 3.0, frame: "FSB", spindle: false },
  "6SL5510-1BE11-5AF0-Z T80": { power: 1.75, current: 5.3, frame: "FSB", spindle: false },
  "6SL5510-1BE12-5AF0-Z T80": { power: 2.5, current: 7.8, frame: "FSC", spindle: false },
  "6SL5510-1BE13-5AF0-Z T80": { power: 3.5, current: 11, frame: "FSC", spindle: false },
  "6SL5510-1BE15-0AF0-Z T80": { power: 5.0, current: 12.6, frame: "FSD", spindle: false },
  "6SL5510-1BE17-0AF0-Z T80": { power: 7.0, current: 13.2, frame: "FSD", spindle: false },
  "6SL5510-1EE13-7AF0": { power: 3.7, current: 13, frame: "FSE", spindle: true },
  "6SL5510-1EE17-5AF0": { power: 7.5, current: 18, frame: "FSE", spindle: true },
  "6SL5510-1EE21-1AF0": { power: 11, current: 30, frame: "FSF", spindle: true },
  "6SL5510-1EE21-5AF0": { power: 15, current: 43, frame: "FSF", spindle: true },
};

/** Drive platform a motor is catalogued for, derived from its paired converter / module. */
export type DrivePlatform = "S120" | "S210" | "S200";
export function motorPlatform(specs: { motorModule: string }): DrivePlatform {
  if (isS200Converter(specs.motorModule)) return "S200";
  if (isS210Converter(specs.motorModule)) return "S210";
  return "S120";
}

const MOTOR_MODULE_POWER: Record<string, number> = Object.fromEntries([
  ...Object.entries(MOTOR_MODULE_SPECS).map(([k, v]) => [k, v.power] as const),
  ...Object.entries(S210_CONVERTER_SPECS).map(([k, v]) => [k, v.power] as const),
]);

// Motor specs lookup (feed + spindle) — keyed by article number prefix.
// Source: Siemens D21.4 catalog selection tables.
export type MotorKind =
  | "feed_servo"
  | "spindle_async"
  | "spindle_sync"
  | "spindle_builtin"
  | "linear"
  | "torque";

export interface MotorSpecs {
  shaftHeight: number;
  ratedPower: string;
  ratedTorque: string;
  ratedSpeed: string;
  maxSpeed: string;
  maxTorque?: string;
  ratedCurrent: string;
  family: string;
  variant: string;
  motorModule: string;
  kind: MotorKind;
  cooling: "natural" | "forced";
}

export const MOTOR_SPECS: Record<string, MotorSpecs> = {
  // SIMOTICS S-1FT7 Compact servo motors (natural cooling) — feed axes
  "1FT7034-5AK71-1DA1": { shaftHeight: 36, ratedPower: "1.1 kW", ratedTorque: "2 Nm", ratedSpeed: "6000 rpm", maxSpeed: "10000 rpm", maxTorque: "5 Nm", ratedCurrent: "2.6 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7036-5AK71-1DA1": { shaftHeight: 36, ratedPower: "1.1 kW", ratedTorque: "3 Nm", ratedSpeed: "6000 rpm", maxSpeed: "10000 rpm", maxTorque: "8 Nm", ratedCurrent: "3.5 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7042-5AF71-1DA1": { shaftHeight: 48, ratedPower: "0.9 kW", ratedTorque: "3 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "8 Nm", ratedCurrent: "2.6 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7044-5AF71-1DA1": { shaftHeight: 48, ratedPower: "1.4 kW", ratedTorque: "5 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "13 Nm", ratedCurrent: "2.8 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7046-5AF71-1DA1": { shaftHeight: 48, ratedPower: "1.8 kW", ratedTorque: "7 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "18 Nm", ratedCurrent: "4.0 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7062-5AF71-1DA1": { shaftHeight: 63, ratedPower: "1.7 kW", ratedTorque: "6 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "16 Nm", ratedCurrent: "3.9 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7064-5AF71-1DA1": { shaftHeight: 63, ratedPower: "2.4 kW", ratedTorque: "9 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "25 Nm", ratedCurrent: "5.7 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7066-5AF71-1DA1": { shaftHeight: 63, ratedPower: "2.9 kW", ratedTorque: "12 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "35 Nm", ratedCurrent: "8.4 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7068-5AF71-1DA1": { shaftHeight: 63, ratedPower: "3.4 kW", ratedTorque: "15 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "45 Nm", ratedCurrent: "8.3 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7082-5AF71-1DA1": { shaftHeight: 80, ratedPower: "3.2 kW", ratedTorque: "13 Nm", ratedSpeed: "3000 rpm", maxSpeed: "6000 rpm", maxTorque: "38 Nm", ratedCurrent: "7.6 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7084-5AF71-1DA1": { shaftHeight: 80, ratedPower: "4.6 kW", ratedTorque: "20 Nm", ratedSpeed: "3000 rpm", maxSpeed: "6000 rpm", maxTorque: "60 Nm", ratedCurrent: "11 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7086-5AF71-1DA1": { shaftHeight: 80, ratedPower: "5.7 kW", ratedTorque: "28 Nm", ratedSpeed: "3000 rpm", maxSpeed: "6000 rpm", maxTorque: "80 Nm", ratedCurrent: "15.5 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7102-5AC71-1DA1": { shaftHeight: 100, ratedPower: "5.0 kW", ratedTorque: "30 Nm", ratedSpeed: "2000 rpm", maxSpeed: "5000 rpm", maxTorque: "90 Nm", ratedCurrent: "12.5 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7105-5AC71-1DA1": { shaftHeight: 100, ratedPower: "8.0 kW", ratedTorque: "50 Nm", ratedSpeed: "2000 rpm", maxSpeed: "5000 rpm", maxTorque: "140 Nm", ratedCurrent: "18 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE22-4AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7108-5AC71-1DA1": { shaftHeight: 100, ratedPower: "10.5 kW", ratedTorque: "70 Nm", ratedSpeed: "2000 rpm", maxSpeed: "5000 rpm", maxTorque: "190 Nm", ratedCurrent: "25 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7132-5AB71-1DA1": { shaftHeight: 132, ratedPower: "10.5 kW", ratedTorque: "90 Nm", ratedSpeed: "1500 rpm", maxSpeed: "4000 rpm", maxTorque: "240 Nm", ratedCurrent: "22.5 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT7134-5AB71-1DA1": { shaftHeight: 132, ratedPower: "12.9 kW", ratedTorque: "118 Nm", ratedSpeed: "1500 rpm", maxSpeed: "4000 rpm", maxTorque: "310 Nm", ratedCurrent: "30 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE24-5AC0", kind: "feed_servo", cooling: "natural" },
  "1FT7136-5AB71-1DA1": { shaftHeight: 132, ratedPower: "14.5 kW", ratedTorque: "140 Nm", ratedSpeed: "1500 rpm", maxSpeed: "4000 rpm", maxTorque: "370 Nm", ratedCurrent: "36 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE24-5AC0", kind: "feed_servo", cooling: "natural" },
  "1FT7138-5AB71-1DA1": { shaftHeight: 132, ratedPower: "17.0 kW", ratedTorque: "170 Nm", ratedSpeed: "1500 rpm", maxSpeed: "4000 rpm", maxTorque: "450 Nm", ratedCurrent: "43 A", family: "SIMOTICS S-1FT7", variant: "Compact", motorModule: "6SL3120-1TE24-5AC0", kind: "feed_servo", cooling: "natural" },

  // 1FT7 Forced Ventilation (heavy-duty / large moving mass)
  "1FT7084-5SF71-1DA1": { shaftHeight: 80, ratedPower: "7.2 kW", ratedTorque: "27 Nm", ratedSpeed: "3000 rpm", maxSpeed: "6000 rpm", maxTorque: "70 Nm", ratedCurrent: "21 A", family: "SIMOTICS S-1FT7", variant: "Forced Ventilation", motorModule: "6SL3120-1TE22-4AD0", kind: "feed_servo", cooling: "forced" },
  "1FT7086-5SF71-1DA1": { shaftHeight: 80, ratedPower: "9.1 kW", ratedTorque: "36 Nm", ratedSpeed: "3000 rpm", maxSpeed: "6000 rpm", maxTorque: "95 Nm", ratedCurrent: "29 A", family: "SIMOTICS S-1FT7", variant: "Forced Ventilation", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "forced" },
  "1FT7105-5SC71-1DA1": { shaftHeight: 100, ratedPower: "11.7 kW", ratedTorque: "65 Nm", ratedSpeed: "2000 rpm", maxSpeed: "5000 rpm", maxTorque: "170 Nm", ratedCurrent: "31 A", family: "SIMOTICS S-1FT7", variant: "Forced Ventilation", motorModule: "6SL3120-1TE24-5AC0", kind: "feed_servo", cooling: "forced" },
  "1FT7108-5SC71-1DA1": { shaftHeight: 100, ratedPower: "15.3 kW", ratedTorque: "91 Nm", ratedSpeed: "2000 rpm", maxSpeed: "5000 rpm", maxTorque: "240 Nm", ratedCurrent: "39 A", family: "SIMOTICS S-1FT7", variant: "Forced Ventilation", motorModule: "6SL3120-1TE24-5AC0", kind: "feed_servo", cooling: "forced" },
  "1FT7132-5SC71-1DA1": { shaftHeight: 132, ratedPower: "26.5 kW", ratedTorque: "140 Nm", ratedSpeed: "2000 rpm", maxSpeed: "4000 rpm", maxTorque: "360 Nm", ratedCurrent: "60 A", family: "SIMOTICS S-1FT7", variant: "Forced Ventilation", motorModule: "6SL3120-1TE26-0AC0", kind: "feed_servo", cooling: "forced" },
  "1FT7134-5SC71-1DA1": { shaftHeight: 132, ratedPower: "33.5 kW", ratedTorque: "190 Nm", ratedSpeed: "2000 rpm", maxSpeed: "4000 rpm", maxTorque: "490 Nm", ratedCurrent: "85 A", family: "SIMOTICS S-1FT7", variant: "Forced Ventilation", motorModule: "6SL3120-1TE28-5AA3", kind: "feed_servo", cooling: "forced" },
  "1FT7136-5SC71-1DA1": { shaftHeight: 132, ratedPower: "39.8 kW", ratedTorque: "235 Nm", ratedSpeed: "2000 rpm", maxSpeed: "4000 rpm", maxTorque: "610 Nm", ratedCurrent: "98 A", family: "SIMOTICS S-1FT7", variant: "Forced Ventilation", motorModule: "6SL3120-1TE31-3AA3", kind: "feed_servo", cooling: "forced" },
  "1FT7138-5SB71-1DA1": { shaftHeight: 132, ratedPower: "39.0 kW", ratedTorque: "280 Nm", ratedSpeed: "1500 rpm", maxSpeed: "4000 rpm", maxTorque: "730 Nm", ratedCurrent: "85 A", family: "SIMOTICS S-1FT7", variant: "Forced Ventilation", motorModule: "6SL3120-1TE28-5AA3", kind: "feed_servo", cooling: "forced" },

  // SIMOTICS M-1PH8 Asynchronous spindle motors (1000 rpm base — high torque / turning)
  "1PH8103-1DF10-0LA1": { shaftHeight: 100, ratedPower: "3.7 kW", ratedTorque: "35 Nm", ratedSpeed: "1000 rpm", maxSpeed: "9000 rpm", ratedCurrent: "10 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1000rpm", motorModule: "6SL3120-1TE21-8AD0", kind: "spindle_async", cooling: "forced" },
  "1PH8107-1DF10-0LA1": { shaftHeight: 100, ratedPower: "6.3 kW", ratedTorque: "60 Nm", ratedSpeed: "1000 rpm", maxSpeed: "9000 rpm", ratedCurrent: "18 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1000rpm", motorModule: "6SL3120-1TE21-8AD0", kind: "spindle_async", cooling: "forced" },
  "1PH8131-1DF10-0LA1": { shaftHeight: 132, ratedPower: "7.9 kW", ratedTorque: "75 Nm", ratedSpeed: "1000 rpm", maxSpeed: "8000 rpm", ratedCurrent: "20 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1000rpm", motorModule: "6SL3120-1TE23-0AD0", kind: "spindle_async", cooling: "forced" },
  "1PH8133-1DF10-0LA1": { shaftHeight: 132, ratedPower: "12 kW", ratedTorque: "115 Nm", ratedSpeed: "1000 rpm", maxSpeed: "8000 rpm", ratedCurrent: "30 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1000rpm", motorModule: "6SL3120-1TE23-0AD0", kind: "spindle_async", cooling: "forced" },
  "1PH8137-1DF10-0LA1": { shaftHeight: 132, ratedPower: "17 kW", ratedTorque: "162 Nm", ratedSpeed: "1000 rpm", maxSpeed: "8000 rpm", ratedCurrent: "43 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1000rpm", motorModule: "6SL3120-1TE24-5AC0", kind: "spindle_async", cooling: "forced" },
  "1PH8163-1DF10-0LA1": { shaftHeight: 160, ratedPower: "22 kW", ratedTorque: "210 Nm", ratedSpeed: "1000 rpm", maxSpeed: "6500 rpm", ratedCurrent: "55 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1000rpm", motorModule: "6SL3120-1TE26-0AC0", kind: "spindle_async", cooling: "forced" },
  "1PH8165-1DF10-0LA1": { shaftHeight: 160, ratedPower: "28 kW", ratedTorque: "267 Nm", ratedSpeed: "1000 rpm", maxSpeed: "6500 rpm", ratedCurrent: "71 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1000rpm", motorModule: "6SL3120-1TE28-5AA3", kind: "spindle_async", cooling: "forced" },
  "1PH8184-1DF10-0LA1": { shaftHeight: 180, ratedPower: "39 kW", ratedTorque: "372 Nm", ratedSpeed: "1000 rpm", maxSpeed: "5000 rpm", ratedCurrent: "87 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1000rpm", motorModule: "6SL3120-1TE28-5AA3", kind: "spindle_async", cooling: "forced" },
  "1PH8186-1DF10-0LA1": { shaftHeight: 180, ratedPower: "51 kW", ratedTorque: "487 Nm", ratedSpeed: "1000 rpm", maxSpeed: "5000 rpm", ratedCurrent: "112 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1000rpm", motorModule: "6SL3120-1TE31-3AA3", kind: "spindle_async", cooling: "forced" },

  // 1PH8 1500 rpm base — balanced milling/turning
  "1PH8103-1FF10-0LA1": { shaftHeight: 100, ratedPower: "5.5 kW", ratedTorque: "35 Nm", ratedSpeed: "1500 rpm", maxSpeed: "9000 rpm", ratedCurrent: "14 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE21-8AD0", kind: "spindle_async", cooling: "forced" },
  "1PH8107-1FF10-0LA1": { shaftHeight: 100, ratedPower: "7.5 kW", ratedTorque: "48 Nm", ratedSpeed: "1500 rpm", maxSpeed: "9000 rpm", ratedCurrent: "19 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE23-0AD0", kind: "spindle_async", cooling: "forced" },
  "1PH8133-1FF10-0LA1": { shaftHeight: 132, ratedPower: "11 kW", ratedTorque: "70 Nm", ratedSpeed: "1500 rpm", maxSpeed: "8000 rpm", ratedCurrent: "28 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE24-5AC0", kind: "spindle_async", cooling: "forced" },
  "1PH8135-1FF10-0LA1": { shaftHeight: 132, ratedPower: "15 kW", ratedTorque: "96 Nm", ratedSpeed: "1500 rpm", maxSpeed: "8000 rpm", ratedCurrent: "38 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE24-5AC0", kind: "spindle_async", cooling: "forced" },
  "1PH8137-1FF10-0LA1": { shaftHeight: 132, ratedPower: "18.5 kW", ratedTorque: "118 Nm", ratedSpeed: "1500 rpm", maxSpeed: "8000 rpm", ratedCurrent: "46 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE26-0AC0", kind: "spindle_async", cooling: "forced" },
  "1PH8163-1FF10-0LA1": { shaftHeight: 160, ratedPower: "30 kW", ratedTorque: "191 Nm", ratedSpeed: "1500 rpm", maxSpeed: "6500 rpm", ratedCurrent: "70 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE28-5AA3", kind: "spindle_async", cooling: "forced" },
  "1PH8165-1FF10-0LA1": { shaftHeight: 160, ratedPower: "37 kW", ratedTorque: "236 Nm", ratedSpeed: "1500 rpm", maxSpeed: "6500 rpm", ratedCurrent: "82 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE28-5AA3", kind: "spindle_async", cooling: "forced" },
  "1PH8167-1FF10-0LA1": { shaftHeight: 160, ratedPower: "42 kW", ratedTorque: "267 Nm", ratedSpeed: "1500 rpm", maxSpeed: "6500 rpm", ratedCurrent: "95 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE28-5AA3", kind: "spindle_async", cooling: "forced" },
  "1PH8184-1FF10-0LA1": { shaftHeight: 180, ratedPower: "45 kW", ratedTorque: "287 Nm", ratedSpeed: "1500 rpm", maxSpeed: "5000 rpm", ratedCurrent: "105 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE31-3AA3", kind: "spindle_async", cooling: "forced" },
  "1PH8186-1FF10-0LA1": { shaftHeight: 180, ratedPower: "55 kW", ratedTorque: "350 Nm", ratedSpeed: "1500 rpm", maxSpeed: "5000 rpm", ratedCurrent: "130 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE32-0AA4", kind: "spindle_async", cooling: "forced" },
  "1PH8224-1FF10-0LA1": { shaftHeight: 225, ratedPower: "75 kW", ratedTorque: "478 Nm", ratedSpeed: "1500 rpm", maxSpeed: "4500 rpm", ratedCurrent: "158 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 1500rpm", motorModule: "6SL3120-1TE32-0AA4", kind: "spindle_async", cooling: "forced" },

  // 1PH8 2000 rpm base — high-speed milling (catalog D21.4)
  "1PH8103-1HF10-0LA1": { shaftHeight: 100, ratedPower: "7 kW", ratedTorque: "33 Nm", ratedSpeed: "2000 rpm", maxSpeed: "12000 rpm", ratedCurrent: "17 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 2000rpm", motorModule: "6SL3120-1TE21-8AD0", kind: "spindle_async", cooling: "forced" },
  "1PH8107-1HF10-0LA1": { shaftHeight: 100, ratedPower: "10 kW", ratedTorque: "48 Nm", ratedSpeed: "2000 rpm", maxSpeed: "12000 rpm", ratedCurrent: "24 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 2000rpm", motorModule: "6SL3120-1TE23-0AD0", kind: "spindle_async", cooling: "forced" },
  "1PH8133-1HF10-0LA1": { shaftHeight: 132, ratedPower: "14 kW", ratedTorque: "67 Nm", ratedSpeed: "2000 rpm", maxSpeed: "10000 rpm", ratedCurrent: "34 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 2000rpm", motorModule: "6SL3120-1TE24-5AC0", kind: "spindle_async", cooling: "forced" },
  "1PH8137-1HF10-0LA1": { shaftHeight: 132, ratedPower: "22 kW", ratedTorque: "105 Nm", ratedSpeed: "2000 rpm", maxSpeed: "10000 rpm", ratedCurrent: "52 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 2000rpm", motorModule: "6SL3120-1TE26-0AC0", kind: "spindle_async", cooling: "forced" },
  "1PH8165-1HF10-0LA1": { shaftHeight: 160, ratedPower: "38 kW", ratedTorque: "181 Nm", ratedSpeed: "2000 rpm", maxSpeed: "8000 rpm", ratedCurrent: "86 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 2000rpm", motorModule: "6SL3120-1TE28-5AA3", kind: "spindle_async", cooling: "forced" },
  "1PH8184-1HF10-0LA1": { shaftHeight: 180, ratedPower: "55 kW", ratedTorque: "263 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6000 rpm", ratedCurrent: "125 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 2000rpm", motorModule: "6SL3120-1TE32-0AA4", kind: "spindle_async", cooling: "forced" },
  "1PH8186-1HF10-0LA1": { shaftHeight: 180, ratedPower: "70 kW", ratedTorque: "334 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6000 rpm", ratedCurrent: "160 A", family: "SIMOTICS M-1PH8", variant: "Asynchronous 2000rpm", motorModule: "6SL3120-1TE32-0AA4", kind: "spindle_async", cooling: "forced" },

  // 1PH8 Synchronous (high-speed / high-precision spindles) — higher torque at low speed, higher max rpm
  "1PH8133-1MG22-0LA1": { shaftHeight: 132, ratedPower: "16 kW", ratedTorque: "50 Nm", ratedSpeed: "3000 rpm", maxSpeed: "15000 rpm", ratedCurrent: "30 A", family: "SIMOTICS M-1PH8", variant: "Synchronous HighSpeed", motorModule: "6SL3120-1TE23-0AD0", kind: "spindle_sync", cooling: "forced" },
  "1PH8137-1MG22-0LA1": { shaftHeight: 132, ratedPower: "22 kW", ratedTorque: "70 Nm", ratedSpeed: "3000 rpm", maxSpeed: "15000 rpm", ratedCurrent: "42 A", family: "SIMOTICS M-1PH8", variant: "Synchronous HighSpeed", motorModule: "6SL3120-1TE24-5AC0", kind: "spindle_sync", cooling: "forced" },
  "1PH8163-1MG22-0LA1": { shaftHeight: 160, ratedPower: "38 kW", ratedTorque: "120 Nm", ratedSpeed: "3000 rpm", maxSpeed: "12000 rpm", ratedCurrent: "70 A", family: "SIMOTICS M-1PH8", variant: "Synchronous HighSpeed", motorModule: "6SL3120-1TE26-0AC0", kind: "spindle_sync", cooling: "forced" },
  "1PH8165-1MG22-0LA1": { shaftHeight: 160, ratedPower: "52 kW", ratedTorque: "165 Nm", ratedSpeed: "3000 rpm", maxSpeed: "12000 rpm", ratedCurrent: "95 A", family: "SIMOTICS M-1PH8", variant: "Synchronous HighSpeed", motorModule: "6SL3120-1TE28-5AA3", kind: "spindle_sync", cooling: "forced" },

  // ───────────────────────────────────────────────────────────────────
  // SIMOTICS S-1FT2 — compact high-performance servo (D21.4 catalog).
  // The full ordering MLFB has the form `<base>██-███B0` where the
  // customer fills 5 slots (encoder, brake, flange, cabling). Storing
  // the verified base (e.g. 1FT2104-4AF) — the suffix is order-time
  // configuration. Specs taken directly from the D21.4 motor table.
  // Motor-module pairing inferred from rated current at nN.
  // ───────────────────────────────────────────────────────────────────
  // SH 30
  "1FT2103-2AH": { shaftHeight: 30, ratedPower: "0.28 kW", ratedTorque: "0.64 Nm", ratedSpeed: "4500 rpm", maxSpeed: "9000 rpm", maxTorque: "1.95 Nm", ratedCurrent: "0.59 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2103-4AH": { shaftHeight: 30, ratedPower: "0.48 kW", ratedTorque: "1.27 Nm", ratedSpeed: "4500 rpm", maxSpeed: "9000 rpm", maxTorque: "4.05 Nm", ratedCurrent: "1.01 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  // SH 40
  "1FT2104-4AF": { shaftHeight: 40, ratedPower: "0.40 kW", ratedTorque: "1.27 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "3.75 Nm", ratedCurrent: "1.27 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2104-4AK": { shaftHeight: 40, ratedPower: "0.60 kW", ratedTorque: "1.27 Nm", ratedSpeed: "6000 rpm", maxSpeed: "8000 rpm", maxTorque: "3.85 Nm", ratedCurrent: "0.95 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2104-5AF": { shaftHeight: 40, ratedPower: "0.75 kW", ratedTorque: "2.4 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "7.5 Nm", ratedCurrent: "2.4 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2104-5AK": { shaftHeight: 40, ratedPower: "1.07 kW", ratedTorque: "2.4 Nm", ratedSpeed: "6000 rpm", maxSpeed: "8000 rpm", maxTorque: "7.6 Nm", ratedCurrent: "1.7 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2104-6AF": { shaftHeight: 40, ratedPower: "1.0 kW", ratedTorque: "3.2 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "10 Nm", ratedCurrent: "3.2 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  // SH 52
  "1FT2105-4AF": { shaftHeight: 52, ratedPower: "1.45 kW", ratedTorque: "5.0 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "15 Nm", ratedCurrent: "4.6 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2105-4AH": { shaftHeight: 52, ratedPower: "1.74 kW", ratedTorque: "5.0 Nm", ratedSpeed: "4500 rpm", maxSpeed: "8000 rpm", maxTorque: "15 Nm", ratedCurrent: "3.7 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2105-6AF": { shaftHeight: 52, ratedPower: "2.1 kW", ratedTorque: "8.0 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "24 Nm", ratedCurrent: "6.6 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  // SH 63
  "1FT2106-3AF": { shaftHeight: 63, ratedPower: "2.3 kW", ratedTorque: "9.0 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7500 rpm", maxTorque: "26 Nm", ratedCurrent: "7.3 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2106-4AF": { shaftHeight: 63, ratedPower: "2.7 kW", ratedTorque: "12 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7500 rpm", maxTorque: "33 Nm", ratedCurrent: "8.6 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2106-6AF": { shaftHeight: 63, ratedPower: "3.3 kW", ratedTorque: "16 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7500 rpm", maxTorque: "45.5 Nm", ratedCurrent: "10.6 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  // SH 80 (natural cooling)
  "1FT2108-4AC": { shaftHeight: 80, ratedPower: "4.3 kW", ratedTorque: "25 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6500 rpm", maxTorque: "87 Nm", ratedCurrent: "20.5 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE22-4AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2108-5AB": { shaftHeight: 80, ratedPower: "4.0 kW", ratedTorque: "30 Nm", ratedSpeed: "1500 rpm", maxSpeed: "6500 rpm", maxTorque: "105 Nm", ratedCurrent: "25.5 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2108-5AC": { shaftHeight: 80, ratedPower: "4.9 kW", ratedTorque: "30 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6500 rpm", maxTorque: "105 Nm", ratedCurrent: "23.5 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2108-7AB": { shaftHeight: 80, ratedPower: "4.7 kW", ratedTorque: "37.5 Nm", ratedSpeed: "1500 rpm", maxSpeed: "6500 rpm", maxTorque: "140 Nm", ratedCurrent: "30 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2108-7AC": { shaftHeight: 80, ratedPower: "5.4 kW", ratedTorque: "37.5 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6500 rpm", maxTorque: "140 Nm", ratedCurrent: "26 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2108-7AE": { shaftHeight: 80, ratedPower: "5.5 kW", ratedTorque: "37.5 Nm", ratedSpeed: "2500 rpm", maxSpeed: "6500 rpm", maxTorque: "140 Nm", ratedCurrent: "21 A", family: "SIMOTICS S-1FT2", variant: "High Dynamic", motorModule: "6SL3120-1TE22-4AD0", kind: "feed_servo", cooling: "natural" },
  // SH 80 — Forced ventilation (S-variants)
  "1FT2108-4SC": { shaftHeight: 80, ratedPower: "7.2 kW", ratedTorque: "27 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6500 rpm", maxTorque: "70 Nm", ratedCurrent: "21 A", family: "SIMOTICS S-1FT2", variant: "Forced Ventilation", motorModule: "6SL3120-1TE22-4AD0", kind: "feed_servo", cooling: "forced" },
  "1FT2108-5SB": { shaftHeight: 80, ratedPower: "5.7 kW", ratedTorque: "36 Nm", ratedSpeed: "1500 rpm", maxSpeed: "6500 rpm", maxTorque: "95 Nm", ratedCurrent: "29 A", family: "SIMOTICS S-1FT2", variant: "Forced Ventilation", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "forced" },
  "1FT2108-5SC": { shaftHeight: 80, ratedPower: "9.1 kW", ratedTorque: "36 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6500 rpm", maxTorque: "95 Nm", ratedCurrent: "31 A", family: "SIMOTICS S-1FT2", variant: "Forced Ventilation", motorModule: "6SL3120-1TE24-5AC0", kind: "feed_servo", cooling: "forced" },
  // 1FT2 Compact (larger SH, second-digit "2")
  "1FT2206-4AF": { shaftHeight: 63, ratedPower: "3.5 kW", ratedTorque: "13 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "39 Nm", ratedCurrent: "8 A", family: "SIMOTICS S-1FT2", variant: "Compact", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2206-6AF": { shaftHeight: 63, ratedPower: "5.0 kW", ratedTorque: "19 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "57 Nm", ratedCurrent: "12 A", family: "SIMOTICS S-1FT2", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2208-3AF": { shaftHeight: 80, ratedPower: "4.5 kW", ratedTorque: "19 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "57 Nm", ratedCurrent: "12 A", family: "SIMOTICS S-1FT2", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2208-4AC": { shaftHeight: 80, ratedPower: "5.5 kW", ratedTorque: "32 Nm", ratedSpeed: "2000 rpm", maxSpeed: "7000 rpm", maxTorque: "85 Nm", ratedCurrent: "17 A", family: "SIMOTICS S-1FT2", variant: "Compact", motorModule: "6SL3120-1TE22-4AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2210-3AB": { shaftHeight: 100, ratedPower: "5.5 kW", ratedTorque: "55 Nm", ratedSpeed: "1500 rpm", maxSpeed: "5500 rpm", maxTorque: "150 Nm", ratedCurrent: "22 A", family: "SIMOTICS S-1FT2", variant: "Compact", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2210-4AB": { shaftHeight: 100, ratedPower: "7.5 kW", ratedTorque: "70 Nm", ratedSpeed: "1500 rpm", maxSpeed: "5500 rpm", maxTorque: "190 Nm", ratedCurrent: "28 A", family: "SIMOTICS S-1FT2", variant: "Compact", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FT2210-5AB": { shaftHeight: 100, ratedPower: "9.5 kW", ratedTorque: "90 Nm", ratedSpeed: "1500 rpm", maxSpeed: "5500 rpm", maxTorque: "240 Nm", ratedCurrent: "36 A", family: "SIMOTICS S-1FT2", variant: "Compact", motorModule: "6SL3120-1TE24-5AC0", kind: "feed_servo", cooling: "natural" },

  // ───────────────────────────────────────────────────────────────────
  // SIMOTICS S-1FK2 — compact servo for SINAMICS S210 with OCC
  // (1-Cable Connection). Source: D32 catalog (motion-control-drives
  // D32-complete-English-2026-02). Each motor is paired with a single
  // S210 servo converter (6SL5310-1B...), NOT with an S120 motor
  // module (S210 has no shared DC bus). Base MLFBs from D32; the
  // ordering MLFB has the form `<base>■■-■A0` (OCC) or `<base>-■■■■A0`
  // (RJ45 PROFINET) — customer fills encoder/brake/cabling slots.
  // ───────────────────────────────────────────────────────────────────
  // SH 20
  "1FK2102-0AG": { shaftHeight: 20, ratedPower: "0.05 kW", ratedTorque: "0.16 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "0.56 Nm", ratedCurrent: "0.16 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-1CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2102-1AG": { shaftHeight: 20, ratedPower: "0.10 kW", ratedTorque: "0.32 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "1.11 Nm", ratedCurrent: "0.32 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-1CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2103-2AG": { shaftHeight: 20, ratedPower: "0.20 kW", ratedTorque: "0.64 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "1.95 Nm", ratedCurrent: "0.59 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-2CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2103-2AH": { shaftHeight: 20, ratedPower: "0.28 kW", ratedTorque: "0.64 Nm", ratedSpeed: "4500 rpm", maxSpeed: "8000 rpm", maxTorque: "1.95 Nm", ratedCurrent: "0.59 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-2CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2103-4AG": { shaftHeight: 20, ratedPower: "0.40 kW", ratedTorque: "1.27 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "4.05 Nm", ratedCurrent: "1.27 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-4CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2103-4AH": { shaftHeight: 20, ratedPower: "0.48 kW", ratedTorque: "1.27 Nm", ratedSpeed: "4500 rpm", maxSpeed: "8000 rpm", maxTorque: "4.05 Nm", ratedCurrent: "1.01 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-4CF0", kind: "feed_servo", cooling: "natural" },
  // SH 40
  "1FK2104-4AF": { shaftHeight: 40, ratedPower: "0.20 kW", ratedTorque: "1.27 Nm", ratedSpeed: "1500 rpm", maxSpeed: "8000 rpm", maxTorque: "3.75 Nm", ratedCurrent: "1.27 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-2CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2104-4AK": { shaftHeight: 40, ratedPower: "0.40 kW", ratedTorque: "1.27 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "3.85 Nm", ratedCurrent: "1.27 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-4CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2104-5AF": { shaftHeight: 40, ratedPower: "0.38 kW", ratedTorque: "2.4 Nm", ratedSpeed: "1500 rpm", maxSpeed: "8000 rpm", maxTorque: "7.5 Nm", ratedCurrent: "2.4 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-4CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2104-5AK": { shaftHeight: 40, ratedPower: "0.75 kW", ratedTorque: "2.4 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "7.5 Nm", ratedCurrent: "2.4 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-8CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2104-6AF": { shaftHeight: 40, ratedPower: "0.50 kW", ratedTorque: "3.2 Nm", ratedSpeed: "1500 rpm", maxSpeed: "8000 rpm", maxTorque: "10 Nm", ratedCurrent: "3.2 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BB10-8CF0", kind: "feed_servo", cooling: "natural" },
  // SH 52
  "1FK2105-4AF": { shaftHeight: 52, ratedPower: "0.78 kW", ratedTorque: "5.0 Nm", ratedSpeed: "1500 rpm", maxSpeed: "7000 rpm", maxTorque: "15 Nm", ratedCurrent: "4.6 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BE11-0DF1", kind: "feed_servo", cooling: "natural" },
  "1FK2105-6AF": { shaftHeight: 52, ratedPower: "1.26 kW", ratedTorque: "8.0 Nm", ratedSpeed: "1500 rpm", maxSpeed: "7000 rpm", maxTorque: "24 Nm", ratedCurrent: "8 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BE12-0DF1", kind: "feed_servo", cooling: "natural" },
  // SH 63
  "1FK2106-3AF": { shaftHeight: 63, ratedPower: "1.30 kW", ratedTorque: "9.0 Nm", ratedSpeed: "1500 rpm", maxSpeed: "7000 rpm", maxTorque: "26 Nm", ratedCurrent: "8.3 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BE12-0DF1", kind: "feed_servo", cooling: "natural" },
  "1FK2106-4AF": { shaftHeight: 63, ratedPower: "1.64 kW", ratedTorque: "12 Nm", ratedSpeed: "1500 rpm", maxSpeed: "7000 rpm", maxTorque: "33 Nm", ratedCurrent: "10.5 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BE13-5DF1", kind: "feed_servo", cooling: "natural" },
  "1FK2106-6AF": { shaftHeight: 63, ratedPower: "2.20 kW", ratedTorque: "16 Nm", ratedSpeed: "1500 rpm", maxSpeed: "6000 rpm", maxTorque: "45 Nm", ratedCurrent: "14 A", family: "SIMOTICS S-1FK2", variant: "OCC Compact", motorModule: "6SL5310-1BE15-0DF1", kind: "feed_servo", cooling: "natural" },
  // 1FK2 Compact (larger SH, second-digit "2") — high-speed variants
  "1FK2203-2AG": { shaftHeight: 30, ratedPower: "0.20 kW", ratedTorque: "0.7 Nm", ratedSpeed: "3000 rpm", maxSpeed: "9000 rpm", maxTorque: "2.1 Nm", ratedCurrent: "0.65 A", family: "SIMOTICS S-1FK2", variant: "Compact", motorModule: "6SL5310-1BB10-2CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2203-4AG": { shaftHeight: 30, ratedPower: "0.43 kW", ratedTorque: "1.4 Nm", ratedSpeed: "3000 rpm", maxSpeed: "9000 rpm", maxTorque: "4.5 Nm", ratedCurrent: "1.4 A", family: "SIMOTICS S-1FK2", variant: "Compact", motorModule: "6SL5310-1BB10-4CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2204-5AF": { shaftHeight: 40, ratedPower: "0.45 kW", ratedTorque: "2.9 Nm", ratedSpeed: "1500 rpm", maxSpeed: "9000 rpm", maxTorque: "9 Nm", ratedCurrent: "2.9 A", family: "SIMOTICS S-1FK2", variant: "Compact", motorModule: "6SL5310-1BB10-4CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2204-6AF": { shaftHeight: 40, ratedPower: "0.6 kW", ratedTorque: "3.8 Nm", ratedSpeed: "1500 rpm", maxSpeed: "9000 rpm", maxTorque: "12 Nm", ratedCurrent: "3.8 A", family: "SIMOTICS S-1FK2", variant: "Compact", motorModule: "6SL5310-1BB10-8CF0", kind: "feed_servo", cooling: "natural" },
  "1FK2205-4AF": { shaftHeight: 52, ratedPower: "0.78 kW", ratedTorque: "5.5 Nm", ratedSpeed: "1500 rpm", maxSpeed: "8000 rpm", maxTorque: "16 Nm", ratedCurrent: "4.8 A", family: "SIMOTICS S-1FK2", variant: "Compact", motorModule: "6SL5310-1BE11-0DF1", kind: "feed_servo", cooling: "natural" },
  "1FK2206-4AF": { shaftHeight: 63, ratedPower: "1.7 kW", ratedTorque: "13 Nm", ratedSpeed: "1500 rpm", maxSpeed: "7000 rpm", maxTorque: "39 Nm", ratedCurrent: "9 A", family: "SIMOTICS S-1FK2", variant: "Compact", motorModule: "6SL5310-1BE12-0DF1", kind: "feed_servo", cooling: "natural" },
  "1FK2208-4AC": { shaftHeight: 80, ratedPower: "3.5 kW", ratedTorque: "32 Nm", ratedSpeed: "2000 rpm", maxSpeed: "7000 rpm", maxTorque: "85 Nm", ratedCurrent: "17 A", family: "SIMOTICS S-1FK2", variant: "Compact", motorModule: "6SL5310-1BE15-0DF1", kind: "feed_servo", cooling: "natural" },
  "1FK2208-5AC": { shaftHeight: 80, ratedPower: "4.5 kW", ratedTorque: "37 Nm", ratedSpeed: "2000 rpm", maxSpeed: "7000 rpm", maxTorque: "100 Nm", ratedCurrent: "20 A", family: "SIMOTICS S-1FK2", variant: "Compact", motorModule: "6SL5310-1BE15-0DF1", kind: "feed_servo", cooling: "natural" },
  "1FK2210-4AB": { shaftHeight: 100, ratedPower: "4.5 kW", ratedTorque: "55 Nm", ratedSpeed: "1500 rpm", maxSpeed: "5500 rpm", maxTorque: "150 Nm", ratedCurrent: "22 A", family: "SIMOTICS S-1FK2", variant: "Compact", motorModule: "6SL5310-1BE15-0DF1", kind: "feed_servo", cooling: "natural" },
  "1FK2210-4AC": { shaftHeight: 100, ratedPower: "6.5 kW", ratedTorque: "55 Nm", ratedSpeed: "2000 rpm", maxSpeed: "5500 rpm", maxTorque: "150 Nm", ratedCurrent: "25 A", family: "SIMOTICS S-1FK2", variant: "Compact", motorModule: "6SL5310-1BE15-0DF1", kind: "feed_servo", cooling: "natural" },

  // ───────────────────────────────────────────────────────────────────
  // SIMOTICS S-1FK7 Compact — natural cooling, DC link 510...720V.
  // Source: D21.4 catalog (2017 edition) pages 8/36, 8/37 — "SIMOTICS
  // S-1FK7 Compact — Natural cooling, Selection and ordering data"
  // and matching Motor Module assignments.
  //
  // Trunks stored through position 11 (e.g. "1FK7042-2AC71"). The
  // 4-character ordering suffix (encoder + shaft/brake + IP) is added
  // by the customer's Siemens partner — the BOM tags 1FK7 rows
  // "trunk-only — partner completes suffix". Encoder codes (catalog):
  //   With DRIVE-CLiQ:    1B AS24DQI · 1C AM24DQI · 1Q AS20DQI ·
  //                       1R AM20DQI · 1U R15DQ · 1P R14DQ
  //   Without DRIVE-CLiQ: 4A IC2048S/R · 4E AM2048S/R · 4S/4T resolvers
  // Shaft+brake codes:    A=feather/N/no-brake · B=feather/N/brake ·
  //                       G=plain/N/no-brake   · H=plain/N/brake
  // IP class:             0=IP64 · 1=IP65 · 2=IP65+DE flange IP67
  //
  // Speed code conventions (position 10):
  //   C = 2000 rpm · F = 3000 rpm · H = 4500 rpm · K = 6000 rpm
  //
  // M_max (peak torque) values estimated at 3 × M_N — typical for 1FK7
  // sustained over a few seconds. For exact M_max, consult catalog
  // characteristic curves at the specific operating point.
  // ───────────────────────────────────────────────────────────────────
  // 1FK7 Compact — 2000 rpm rated speed
  "1FK7042-2AC71": { shaftHeight: 48, ratedPower: "0.6 kW", ratedTorque: "2.8 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6000 rpm", maxTorque: "9 Nm", ratedCurrent: "1.55 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7060-2AC71": { shaftHeight: 63, ratedPower: "1.1 kW", ratedTorque: "5.3 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6000 rpm", maxTorque: "16 Nm", ratedCurrent: "2.95 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7062-2AC71": { shaftHeight: 63, ratedPower: "1.5 kW", ratedTorque: "7.0 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6000 rpm", maxTorque: "21 Nm", ratedCurrent: "2.65 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7063-2AC71": { shaftHeight: 63, ratedPower: "1.9 kW", ratedTorque: "8.9 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6000 rpm", maxTorque: "27 Nm", ratedCurrent: "4.4 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7081-2AC71": { shaftHeight: 80, ratedPower: "2.1 kW", ratedTorque: "10.0 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6000 rpm", maxTorque: "30 Nm", ratedCurrent: "4.4 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7083-2AC71": { shaftHeight: 80, ratedPower: "2.6 kW", ratedTorque: "12.5 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6000 rpm", maxTorque: "38 Nm", ratedCurrent: "6.3 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7084-2AC71": { shaftHeight: 80, ratedPower: "3.1 kW", ratedTorque: "15.0 Nm", ratedSpeed: "2000 rpm", maxSpeed: "6000 rpm", maxTorque: "45 Nm", ratedCurrent: "6.7 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7100-2AC71": { shaftHeight: 100, ratedPower: "3.0 kW", ratedTorque: "14.5 Nm", ratedSpeed: "2000 rpm", maxSpeed: "5500 rpm", maxTorque: "44 Nm", ratedCurrent: "7.1 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7101-2AC71": { shaftHeight: 100, ratedPower: "4.3 kW", ratedTorque: "20.5 Nm", ratedSpeed: "2000 rpm", maxSpeed: "5500 rpm", maxTorque: "62 Nm", ratedCurrent: "9.7 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7103-2AC71": { shaftHeight: 100, ratedPower: "5.2 kW", ratedTorque: "25.0 Nm", ratedSpeed: "2000 rpm", maxSpeed: "5500 rpm", maxTorque: "75 Nm", ratedCurrent: "11.0 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7105-2AC71": { shaftHeight: 100, ratedPower: "7.7 kW", ratedTorque: "37.0 Nm", ratedSpeed: "2000 rpm", maxSpeed: "5500 rpm", maxTorque: "111 Nm", ratedCurrent: "16.0 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },
  // 1FK7 Compact — 3000 rpm rated speed
  "1FK7042-2AF71": { shaftHeight: 48, ratedPower: "0.8 kW", ratedTorque: "2.6 Nm", ratedSpeed: "3000 rpm", maxSpeed: "8000 rpm", maxTorque: "8 Nm", ratedCurrent: "2.0 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE13-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7060-2AF71": { shaftHeight: 63, ratedPower: "1.5 kW", ratedTorque: "4.7 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "14 Nm", ratedCurrent: "3.7 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7062-2AF71": { shaftHeight: 63, ratedPower: "1.9 kW", ratedTorque: "6.0 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "18 Nm", ratedCurrent: "4.0 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7063-2AF71": { shaftHeight: 63, ratedPower: "2.3 kW", ratedTorque: "7.3 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "22 Nm", ratedCurrent: "5.6 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7080-2AF71": { shaftHeight: 80, ratedPower: "2.1 kW", ratedTorque: "6.8 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "20 Nm", ratedCurrent: "4.4 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE15-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7081-2AF71": { shaftHeight: 80, ratedPower: "2.7 kW", ratedTorque: "8.7 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "26 Nm", ratedCurrent: "6.8 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7083-2AF71": { shaftHeight: 80, ratedPower: "3.3 kW", ratedTorque: "10.5 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "32 Nm", ratedCurrent: "7.2 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7084-2AF71": { shaftHeight: 80, ratedPower: "3.1 kW", ratedTorque: "10.0 Nm", ratedSpeed: "3000 rpm", maxSpeed: "7000 rpm", maxTorque: "30 Nm", ratedCurrent: "6.5 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7100-2AF71": { shaftHeight: 100, ratedPower: "3.8 kW", ratedTorque: "12.0 Nm", ratedSpeed: "3000 rpm", maxSpeed: "5500 rpm", maxTorque: "36 Nm", ratedCurrent: "8.0 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7101-2AF71": { shaftHeight: 100, ratedPower: "4.9 kW", ratedTorque: "15.5 Nm", ratedSpeed: "3000 rpm", maxSpeed: "5500 rpm", maxTorque: "47 Nm", ratedCurrent: "11.6 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE21-8AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7103-2AF71": { shaftHeight: 100, ratedPower: "4.4 kW", ratedTorque: "14.0 Nm", ratedSpeed: "3000 rpm", maxSpeed: "5500 rpm", maxTorque: "42 Nm", ratedCurrent: "11.5 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },
  "1FK7105-2AF71": { shaftHeight: 100, ratedPower: "8.2 kW", ratedTorque: "26.0 Nm", ratedSpeed: "3000 rpm", maxSpeed: "5500 rpm", maxTorque: "78 Nm", ratedCurrent: "18.0 A", family: "SIMOTICS S-1FK7", variant: "Compact", motorModule: "6SL3120-1TE23-0AD0", kind: "feed_servo", cooling: "natural" },

  // ───────────────────────────────────────────────────────────────────
  // SIMOTICS M-1FE1 — Built-in motor spindles (high-speed direct drive)
  // Source: D21.4 catalog. Verified base MLFBs only — full ordering MLFB
  // has the form `<base>■0-6B■■` etc. (encoder, brake, cabling slots).
  // Sized by mechanical OEM, not by the configurator's sizing engine.
  // ───────────────────────────────────────────────────────────────────
  "1FE1051-4HC": { shaftHeight: 0, ratedPower: "12.6 kW", ratedTorque: "5 Nm", ratedSpeed: "24000 rpm", maxSpeed: "40000 rpm", maxTorque: "7 Nm", ratedCurrent: "0 A", family: "SIMOTICS M-1FE1", variant: "Built-in High Speed", motorModule: "6SL3120-1TE22-4AD0", kind: "spindle_builtin", cooling: "forced" },
  "1FE1051-4HF": { shaftHeight: 0, ratedPower: "10 kW", ratedTorque: "5 Nm", ratedSpeed: "19000 rpm", maxSpeed: "40000 rpm", maxTorque: "7 Nm", ratedCurrent: "0 A", family: "SIMOTICS M-1FE1", variant: "Built-in High Speed", motorModule: "6SL3120-1TE22-4AD0", kind: "spindle_builtin", cooling: "forced" },
  "1FE1051-4WN": { shaftHeight: 0, ratedPower: "6.5 kW", ratedTorque: "6.5 Nm", ratedSpeed: "9500 rpm", maxSpeed: "30000 rpm", maxTorque: "9 Nm", ratedCurrent: "0 A", family: "SIMOTICS M-1FE1", variant: "Built-in High Speed", motorModule: "6SL3120-1TE21-0AD0", kind: "spindle_builtin", cooling: "forced" },
  "1FE1082-6WE": { shaftHeight: 0, ratedPower: "11.6 kW", ratedTorque: "65 Nm", ratedSpeed: "1700 rpm", maxSpeed: "8000 rpm", maxTorque: "81 Nm", ratedCurrent: "24 A", family: "SIMOTICS M-1FE1", variant: "Built-in", motorModule: "6SL3120-1TE22-4AD0", kind: "spindle_builtin", cooling: "forced" },
  "1FE1083-6WP": { shaftHeight: 0, ratedPower: "35.5 kW", ratedTorque: "97 Nm", ratedSpeed: "3500 rpm", maxSpeed: "9000 rpm", maxTorque: "127 Nm", ratedCurrent: "85 A", family: "SIMOTICS M-1FE1", variant: "Built-in", motorModule: "6SL3120-1TE28-5AA3", kind: "spindle_builtin", cooling: "forced" },
  "1FE1084-6WR": { shaftHeight: 0, ratedPower: "31 kW", ratedTorque: "130 Nm", ratedSpeed: "2300 rpm", maxSpeed: "9000 rpm", maxTorque: "175 Nm", ratedCurrent: "60 A", family: "SIMOTICS M-1FE1", variant: "Built-in", motorModule: "6SL3120-1TE26-0AC0", kind: "spindle_builtin", cooling: "forced" },

  // SIMOTICS L-1FN3 — iron-core linear motors (D21.4). Verified base
  // MLFBs only. shaftHeight stores the catalog series ID (50/100/150/...)
  // not a real shaft height — linear motors don't have shafts.
  // Force in Newtons, speed in m/min.
  "1FN3100-3WC00": { shaftHeight: 100, ratedPower: "0 kW", ratedTorque: "1650 N", ratedSpeed: "137 m/min", maxSpeed: "303 m/min", ratedCurrent: "0 A", family: "SIMOTICS L-1FN3", variant: "Linear (iron-core)", motorModule: "6SL3120-1TE22-4AD0", kind: "linear", cooling: "natural" },
  "1FN3100-3WE00": { shaftHeight: 100, ratedPower: "0 kW", ratedTorque: "1650 N", ratedSpeed: "258 m/min", maxSpeed: "534 m/min", ratedCurrent: "0 A", family: "SIMOTICS L-1FN3", variant: "Linear (iron-core)", motorModule: "6SL3120-1TE23-0AD0", kind: "linear", cooling: "natural" },
  "1FN3100-5WC00": { shaftHeight: 100, ratedPower: "0 kW", ratedTorque: "2750 N", ratedSpeed: "125 m/min", maxSpeed: "278 m/min", ratedCurrent: "0 A", family: "SIMOTICS L-1FN3", variant: "Linear (iron-core)", motorModule: "6SL3120-1TE26-0AC0", kind: "linear", cooling: "natural" },
  "1FN3150-1WC00": { shaftHeight: 150, ratedPower: "0 kW", ratedTorque: "820 N", ratedSpeed: "140 m/min", maxSpeed: "303 m/min", ratedCurrent: "0 A", family: "SIMOTICS L-1FN3", variant: "Linear (iron-core)", motorModule: "6SL3120-1TE21-8AD0", kind: "linear", cooling: "natural" },
  "1FN3150-1WE00": { shaftHeight: 150, ratedPower: "0 kW", ratedTorque: "820 N", ratedSpeed: "278 m/min", maxSpeed: "569 m/min", ratedCurrent: "0 A", family: "SIMOTICS L-1FN3", variant: "Linear (iron-core)", motorModule: "6SL3120-1TE22-4AD0", kind: "linear", cooling: "natural" },
  "1FN3150-2WC00": { shaftHeight: 150, ratedPower: "0 kW", ratedTorque: "1650 N", ratedSpeed: "141 m/min", maxSpeed: "306 m/min", ratedCurrent: "0 A", family: "SIMOTICS L-1FN3", variant: "Linear (iron-core)", motorModule: "6SL3120-1TE23-0AD0", kind: "linear", cooling: "natural" },

  // SIMOTICS T-1FW6 — frameless torque motors (D21.4). Verified base
  // MLFBs only. shaftHeight stores the stator size code (092/132/152/...)
  // not a real shaft height. Used for swivel heads, rotary tables.
  "1FW6092-8PC05": { shaftHeight: 92, ratedPower: "0 kW", ratedTorque: "60 Nm", ratedSpeed: "200 rpm", maxSpeed: "500 rpm", ratedCurrent: "0 A", family: "SIMOTICS T-1FW6", variant: "Torque Standard", motorModule: "6SL3120-1TE21-0AD0", kind: "torque", cooling: "natural" },
  "1FW6092-8PC10": { shaftHeight: 92, ratedPower: "0 kW", ratedTorque: "120 Nm", ratedSpeed: "200 rpm", maxSpeed: "500 rpm", ratedCurrent: "0 A", family: "SIMOTICS T-1FW6", variant: "Torque Standard", motorModule: "6SL3120-1TE21-8AD0", kind: "torque", cooling: "natural" },
  "1FW6132-8PC05": { shaftHeight: 132, ratedPower: "0 kW", ratedTorque: "190 Nm", ratedSpeed: "150 rpm", maxSpeed: "350 rpm", ratedCurrent: "0 A", family: "SIMOTICS T-1FW6", variant: "Torque Standard", motorModule: "6SL3120-1TE22-4AD0", kind: "torque", cooling: "natural" },
  "1FW6132-8PC10": { shaftHeight: 132, ratedPower: "0 kW", ratedTorque: "380 Nm", ratedSpeed: "150 rpm", maxSpeed: "350 rpm", ratedCurrent: "0 A", family: "SIMOTICS T-1FW6", variant: "Torque Standard", motorModule: "6SL3120-1TE23-0AD0", kind: "torque", cooling: "natural" },
  "1FW6152-8PC05": { shaftHeight: 152, ratedPower: "0 kW", ratedTorque: "350 Nm", ratedSpeed: "120 rpm", maxSpeed: "280 rpm", ratedCurrent: "0 A", family: "SIMOTICS T-1FW6", variant: "Torque Standard", motorModule: "6SL3120-1TE23-0AD0", kind: "torque", cooling: "forced" },
  // SIMOTICS S-1FL2 High Inertia 3AC 400 V for SINAMICS S200 (828D Smart) — D 37.1 11/2025 p.1/28-1/33; S200 pairing per 828D Smart details PDF p.27
  "1FL2304-2AF": { shaftHeight: 45, ratedPower: "0.4 kW", ratedTorque: "1.27 Nm", ratedSpeed: "3000 rpm", maxSpeed: "4000 rpm", maxTorque: "4.445 Nm", ratedCurrent: "1.2 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE10-4AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  "1FL2304-4AF": { shaftHeight: 45, ratedPower: "0.75 kW", ratedTorque: "2.39 Nm", ratedSpeed: "3000 rpm", maxSpeed: "4000 rpm", maxTorque: "8.365 Nm", ratedCurrent: "2.1 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE10-8AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  "1FL2306-1AC": { shaftHeight: 65, ratedPower: "0.75 kW", ratedTorque: "3.58 Nm", ratedSpeed: "2000 rpm", maxSpeed: "3000 rpm", maxTorque: "12 Nm", ratedCurrent: "2.5 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE10-8AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  "1FL2306-2AC": { shaftHeight: 65, ratedPower: "1.0 kW", ratedTorque: "4.78 Nm", ratedSpeed: "2000 rpm", maxSpeed: "3000 rpm", maxTorque: "17 Nm", ratedCurrent: "3.0 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE11-0AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  "1FL2306-4AC": { shaftHeight: 65, ratedPower: "1.5 kW", ratedTorque: "7.16 Nm", ratedSpeed: "2000 rpm", maxSpeed: "3000 rpm", maxTorque: "22 Nm", ratedCurrent: "4.6 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE11-5AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  "1FL2306-6AC": { shaftHeight: 65, ratedPower: "1.75 kW", ratedTorque: "8.4 Nm", ratedSpeed: "2000 rpm", maxSpeed: "3000 rpm", maxTorque: "30 Nm", ratedCurrent: "5.3 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE12-5AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  "1FL2306-7AC": { shaftHeight: 65, ratedPower: "2.0 kW", ratedTorque: "9.6 Nm", ratedSpeed: "2000 rpm", maxSpeed: "3000 rpm", maxTorque: "33.4 Nm", ratedCurrent: "5.9 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE12-5AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  "1FL2310-0AC": { shaftHeight: 90, ratedPower: "2.5 kW", ratedTorque: "11.9 Nm", ratedSpeed: "2000 rpm", maxSpeed: "3000 rpm", maxTorque: "37.5 Nm", ratedCurrent: "7.8 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE13-5AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  "1FL2310-2AC": { shaftHeight: 90, ratedPower: "3.5 kW", ratedTorque: "16.7 Nm", ratedSpeed: "2000 rpm", maxSpeed: "3000 rpm", maxTorque: "55 Nm", ratedCurrent: "11 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE13-5AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  "1FL2310-4AC": { shaftHeight: 90, ratedPower: "5.0 kW", ratedTorque: "23.9 Nm", ratedSpeed: "2000 rpm", maxSpeed: "2500 rpm", maxTorque: "70 Nm", ratedCurrent: "12.6 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE15-0AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  "1FL2310-6AC": { shaftHeight: 90, ratedPower: "7.0 kW", ratedTorque: "33.4 Nm", ratedSpeed: "2000 rpm", maxSpeed: "2000 rpm", maxTorque: "90 Nm", ratedCurrent: "13.2 A", family: "SIMOTICS S-1FL2", variant: "High Inertia 400 V", motorModule: "6SL5510-1BE17-0AF0-Z T80", kind: "feed_servo", cooling: "natural" },
  // SIMOTICS M-1PH3 Pro for SINAMICS S200 Spindle (828D Smart) — 1PH3 Pro manual 06/2026 Table 3-2 (TTL encoder L, plain shaft 0); drive per Smart PDF p.35
  "1PH3103-1LD12-0GA1": { shaftHeight: 100, ratedPower: "3.7 kW", ratedTorque: "35 Nm", ratedSpeed: "1000 rpm", maxSpeed: "10000 rpm", ratedCurrent: "12.9 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE13-7AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3101-1LF12-0GA1": { shaftHeight: 100, ratedPower: "3.7 kW", ratedTorque: "24 Nm", ratedSpeed: "1500 rpm", maxSpeed: "10000 rpm", ratedCurrent: "12 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE13-7AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3105-1LD12-0GA1": { shaftHeight: 100, ratedPower: "5.5 kW", ratedTorque: "53 Nm", ratedSpeed: "1000 rpm", maxSpeed: "10000 rpm", ratedCurrent: "17.8 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE17-5AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3103-1LF12-0GA1": { shaftHeight: 100, ratedPower: "5.5 kW", ratedTorque: "35 Nm", ratedSpeed: "1500 rpm", maxSpeed: "10000 rpm", ratedCurrent: "16.9 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE17-5AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3105-1LG12-0GA1": { shaftHeight: 100, ratedPower: "7.5 kW", ratedTorque: "36 Nm", ratedSpeed: "2000 rpm", maxSpeed: "10000 rpm", ratedCurrent: "16.5 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE17-5AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3107-1HF12-0KA1": { shaftHeight: 100, ratedPower: "9 kW", ratedTorque: "57 Nm", ratedSpeed: "1500 rpm", maxSpeed: "12000 rpm", ratedCurrent: "24 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE17-5AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3107-1HG12-0KA1": { shaftHeight: 100, ratedPower: "11 kW", ratedTorque: "53 Nm", ratedSpeed: "2000 rpm", maxSpeed: "12000 rpm", ratedCurrent: "29 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE17-5AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3131-1LE12-0GA1": { shaftHeight: 132, ratedPower: "7.5 kW", ratedTorque: "60 Nm", ratedSpeed: "1200 rpm", maxSpeed: "8000 rpm", ratedCurrent: "21.7 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE21-1AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3132-1LE12-0GA1": { shaftHeight: 132, ratedPower: "9 kW", ratedTorque: "72 Nm", ratedSpeed: "1200 rpm", maxSpeed: "8000 rpm", ratedCurrent: "24 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE21-1AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3131-1LF12-0KA1": { shaftHeight: 132, ratedPower: "11 kW", ratedTorque: "70 Nm", ratedSpeed: "1500 rpm", maxSpeed: "10000 rpm", ratedCurrent: "24 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE21-1AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3133-1LD12-0GA1": { shaftHeight: 132, ratedPower: "11 kW", ratedTorque: "105 Nm", ratedSpeed: "1000 rpm", maxSpeed: "8000 rpm", ratedCurrent: "29.4 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE21-1AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3135-1LD12-0GA1": { shaftHeight: 132, ratedPower: "12 kW", ratedTorque: "115 Nm", ratedSpeed: "1000 rpm", maxSpeed: "8000 rpm", ratedCurrent: "30 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE21-5AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3133-1LG12-0KA1": { shaftHeight: 132, ratedPower: "15 kW", ratedTorque: "72 Nm", ratedSpeed: "2000 rpm", maxSpeed: "10000 rpm", ratedCurrent: "30 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE21-5AF0", kind: "spindle_async", cooling: "forced" },
  "1PH3136-1LD12-0GA1": { shaftHeight: 132, ratedPower: "15 kW", ratedTorque: "143 Nm", ratedSpeed: "1000 rpm", maxSpeed: "8000 rpm", ratedCurrent: "42.8 A", family: "SIMOTICS M-1PH3 Pro", variant: "S200 Spindle, TTL encoder", motorModule: "6SL5510-1EE21-5AF0", kind: "spindle_async", cooling: "forced" },
};

/** Motor article → paired Motor Module article. Derived from MOTOR_SPECS.motorModule. */
export const MOTOR_TO_MM: Record<string, string> = Object.fromEntries(
  Object.entries(MOTOR_SPECS).map(([art, spec]) => [art, spec.motorModule])
);

/**
 * Look up motor specs by article number.
 *
 *  1. exact key
 *  2. the longest catalog trunk that is a prefix of the article
 *     ("1FT2104-4AF71-1AA1" → "1FT2104-4AF")
 *  3. a single catalog key that the (partial) article is a prefix of
 *     ("1FT7062-5AC7" → "1FT7062-5AC71-1DA1")
 *
 * Anything ambiguous returns undefined instead of silently picking the
 * first entry with the same 7-character prefix — that used to return
 * the 0.4 kW 1FT2104-4AF for a 1.0 kW 1FT2104-6AF request.
 */
export function getMotorSpecs(articleNumber: string): MotorSpecs | undefined {
  const art = articleNumber.trim().toUpperCase();
  if (!art) return undefined;
  if (MOTOR_SPECS[art]) return MOTOR_SPECS[art];
  const keys = Object.keys(MOTOR_SPECS);
  const trunks = keys.filter((k) => art.startsWith(k)).sort((a, b) => b.length - a.length);
  if (trunks.length) return MOTOR_SPECS[trunks[0]];
  const extensions = keys.filter((k) => k.startsWith(art));
  if (extensions.length === 1) return MOTOR_SPECS[extensions[0]];
  return undefined;
}

/** Line Module catalog entry for an article, or undefined. */
export function getLineModuleByArticle(article: string): LineModuleOption | undefined {
  return LINE_MODULES.find((lm) => lm.articleNumber === article);
}

/** The Active Line Module whose Active Interface Module has this article, or undefined. */
export function getLineModuleForInterfaceModule(article: string): LineModuleOption | undefined {
  return LINE_MODULES.find((lm) => lm.interfaceModule === article);
}

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

/**
 * Motor power-cable cross-section by shaft height.
 *
 * NOTE: returns the BARE size (e.g. "1.5mm") because the cable catalog
 * IDs are keyed by the bare size — `motor-power-1.5mm-10m`, not
 * `motor-power-1.5mm²-10m`. Adding the unit suffix here previously caused
 * every motor power cable lookup in `selectCables` to silently miss.
 */
export function getMotorCableSize(shaftHeight: number): "1.5mm" | "2.5mm" | "6mm" {
  if (shaftHeight <= 48) return "1.5mm";
  if (shaftHeight <= 100) return "2.5mm";
  return "6mm";
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
  _hasNx: boolean = false
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
