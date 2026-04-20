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

// Motor specs lookup (feed + spindle) — keyed by article number prefix.
// Source: Siemens D21.4 catalog selection tables.
export type MotorKind = "feed_servo" | "spindle_async" | "spindle_sync";

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
};

/** Motor article → paired Motor Module article. Derived from MOTOR_SPECS.motorModule. */
export const MOTOR_TO_MM: Record<string, string> = Object.fromEntries(
  Object.entries(MOTOR_SPECS).map(([art, spec]) => [art, spec.motorModule])
);

export function getMotorSpecs(articleNumber: string): MotorSpecs | undefined {
  // Try exact match first
  if (MOTOR_SPECS[articleNumber]) return MOTOR_SPECS[articleNumber];
  // Try prefix match (first 7 chars like "1FT7062")
  const prefix = articleNumber.substring(0, 7);
  for (const key of Object.keys(MOTOR_SPECS)) {
    if (key.startsWith(prefix)) return MOTOR_SPECS[key];
  }
  return undefined;
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
