// ============================================================
// Drive System Selection Data
// Based on Siemens Catalogs D21.4 (SINAMICS S120/S210)
// and D32 (SIMOTICS Servo Motors)
//
// Provides typed arrays for AI-driven article number
// recommendations instead of generic "See SIZER" responses.
// ============================================================

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface MotorModuleSpec {
  id: string;
  articleNumber: string;
  ratedCurrent: number;
  maxCurrent: number;
  ratedPower: number;
  type: "single" | "double";
  coolingType: "C" | "D" | "internal";
  width: number; // mm
  driveFamily: "S120" | "S220";
  description: string;
}

export interface LineModuleSpec {
  id: string;
  articleNumber: string;
  ratedPower: number;
  type: "active" | "smart" | "basic";
  width: number;
  driveFamily: "S120" | "S220";
  activeInterfaceModule?: string; // required article for active line modules
  description: string;
}

export interface ServoMotorSpec {
  id: string;
  motorArticle: string;
  series: string; // 1FK2, 1FT2, 1FK7, etc.
  variant: string; // "High Dynamic", "Compact", "Forced Ventilation"
  shaftHeight: number;
  staticTorque: number; // Nm
  maxTorque: number; // Nm
  ratedSpeed: number; // rpm
  ratedPower: number; // kW
  motorType: "feed" | "spindle";
  description: string;
}

export interface DriveSystemMatch {
  motorArticle: string;
  converterArticle: string;
  converterFrame: string;
  converterPower: number; // kW
  cableArticle: string;
  supplyVoltage: "1AC_230V" | "3AC_240V" | "3AC_480V";
  driveFamily: "S120" | "S210";
}

// ------------------------------------------------------------
// 1. S120 Booksize Single Motor Modules (D21.4)
// ------------------------------------------------------------

export const s120MotorModules: MotorModuleSpec[] = [
  // --- Single Motor Modules ---
  {
    id: "s120-smm-3a-d",
    articleNumber: "6SL3120-1TE13-0AD0",
    ratedCurrent: 3,
    maxCurrent: 9,
    ratedPower: 1.6,
    type: "single",
    coolingType: "D",
    width: 50,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 3A rated, cold-plate cooling",
  },
  {
    id: "s120-smm-5a-d",
    articleNumber: "6SL3120-1TE15-0AD0",
    ratedCurrent: 5,
    maxCurrent: 15,
    ratedPower: 2.7,
    type: "single",
    coolingType: "D",
    width: 50,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 5A rated, cold-plate cooling",
  },
  {
    id: "s120-smm-9a-d",
    articleNumber: "6SL3120-1TE21-0AD0",
    ratedCurrent: 9,
    maxCurrent: 27,
    ratedPower: 4.8,
    type: "single",
    coolingType: "D",
    width: 50,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 9A rated, cold-plate cooling",
  },
  {
    id: "s120-smm-18a-c",
    articleNumber: "6SL3120-1TE21-8AC0",
    ratedCurrent: 18,
    maxCurrent: 36,
    ratedPower: 9.7,
    type: "single",
    coolingType: "C",
    width: 50,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 18A rated, internal fan cooling",
  },
  {
    id: "s120-smm-18a-d",
    articleNumber: "6SL3120-1TE21-8AD0",
    ratedCurrent: 18,
    maxCurrent: 54,
    ratedPower: 9.7,
    type: "single",
    coolingType: "D",
    width: 50,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 18A rated, cold-plate cooling",
  },
  {
    id: "s120-smm-24a-c",
    articleNumber: "6SL3120-1TE22-4AC0",
    ratedCurrent: 24,
    maxCurrent: 48,
    ratedPower: 12.9,
    type: "single",
    coolingType: "C",
    width: 50,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 24A rated, internal fan cooling",
  },
  {
    id: "s120-smm-24a-d",
    articleNumber: "6SL3120-1TE22-4AD0",
    ratedCurrent: 24,
    maxCurrent: 72,
    ratedPower: 12.9,
    type: "single",
    coolingType: "D",
    width: 50,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 24A rated, cold-plate cooling",
  },
  {
    id: "s120-smm-30a-c",
    articleNumber: "6SL3120-1TE23-0AC0",
    ratedCurrent: 30,
    maxCurrent: 56,
    ratedPower: 16,
    type: "single",
    coolingType: "C",
    width: 100,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 30A rated, internal fan cooling",
  },
  {
    id: "s120-smm-30a-d",
    articleNumber: "6SL3120-1TE23-0AD0",
    ratedCurrent: 30,
    maxCurrent: 90,
    ratedPower: 16,
    type: "single",
    coolingType: "D",
    width: 100,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 30A rated, cold-plate cooling",
  },
  {
    id: "s120-smm-45a-c",
    articleNumber: "6SL3120-1TE24-5AC0",
    ratedCurrent: 45,
    maxCurrent: 90,
    ratedPower: 24,
    type: "single",
    coolingType: "C",
    width: 100,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 45A rated, internal fan cooling",
  },
  {
    id: "s120-smm-60a-c",
    articleNumber: "6SL3120-1TE26-0AC0",
    ratedCurrent: 60,
    maxCurrent: 120,
    ratedPower: 32,
    type: "single",
    coolingType: "C",
    width: 100,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 60A rated, internal fan cooling",
  },
  {
    id: "s120-smm-85a-int",
    articleNumber: "6SL3120-1TE28-5AA3",
    ratedCurrent: 85,
    maxCurrent: 141,
    ratedPower: 46,
    type: "single",
    coolingType: "internal",
    width: 200,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 85A rated, internal cooling",
  },
  {
    id: "s120-smm-132a-int",
    articleNumber: "6SL3120-1TE31-3AA3",
    ratedCurrent: 132,
    maxCurrent: 210,
    ratedPower: 71,
    type: "single",
    coolingType: "internal",
    width: 300,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 132A rated, internal cooling",
  },
  {
    id: "s120-smm-200a-int",
    articleNumber: "6SL3120-1TE32-0AA4",
    ratedCurrent: 200,
    maxCurrent: 282,
    ratedPower: 107,
    type: "single",
    coolingType: "internal",
    width: 300,
    driveFamily: "S120",
    description: "S120 Booksize Single Motor Module, 200A rated, internal cooling",
  },

  // --- Double Motor Modules ---
  {
    id: "s120-dmm-2x3a-d",
    articleNumber: "6SL3120-2TE13-0AD0",
    ratedCurrent: 3,
    maxCurrent: 9,
    ratedPower: 1.6,
    type: "double",
    coolingType: "D",
    width: 50,
    driveFamily: "S120",
    description: "S120 Booksize Double Motor Module, 2x3A rated, cold-plate cooling",
  },
  {
    id: "s120-dmm-2x5a-d",
    articleNumber: "6SL3120-2TE15-0AD0",
    ratedCurrent: 5,
    maxCurrent: 15,
    ratedPower: 2.7,
    type: "double",
    coolingType: "D",
    width: 50,
    driveFamily: "S120",
    description: "S120 Booksize Double Motor Module, 2x5A rated, cold-plate cooling",
  },
  {
    id: "s120-dmm-2x9a-d",
    articleNumber: "6SL3120-2TE21-0AD0",
    ratedCurrent: 9,
    maxCurrent: 27,
    ratedPower: 4.8,
    type: "double",
    coolingType: "D",
    width: 50,
    driveFamily: "S120",
    description: "S120 Booksize Double Motor Module, 2x9A rated, cold-plate cooling",
  },
  {
    id: "s120-dmm-2x18a-c",
    articleNumber: "6SL3120-2TE21-8AC0",
    ratedCurrent: 18,
    maxCurrent: 36,
    ratedPower: 9.7,
    type: "double",
    coolingType: "C",
    width: 100,
    driveFamily: "S120",
    description: "S120 Booksize Double Motor Module, 2x18A rated, internal fan cooling",
  },
];

// ------------------------------------------------------------
// 2. S120 Line Modules (D21.4)
// ------------------------------------------------------------

export const s120LineModules: LineModuleSpec[] = [
  // --- Active Line Modules ---
  {
    id: "s120-alm-16kw",
    articleNumber: "6SL3130-7TE21-6AA4",
    ratedPower: 16,
    type: "active",
    width: 100,
    driveFamily: "S120",
    activeInterfaceModule: "6SL3100-0BE21-6AB0",
    description: "S120 Active Line Module 16kW, requires Active Interface Module",
  },
  {
    id: "s120-alm-36kw",
    articleNumber: "6SL3130-7TE23-6AA3",
    ratedPower: 36,
    type: "active",
    width: 150,
    driveFamily: "S120",
    activeInterfaceModule: "6SL3100-0BE23-6AB0",
    description: "S120 Active Line Module 36kW, requires Active Interface Module",
  },
  {
    id: "s120-alm-55kw",
    articleNumber: "6SL3130-7TE25-5AA3",
    ratedPower: 55,
    type: "active",
    width: 200,
    driveFamily: "S120",
    activeInterfaceModule: "6SL3100-0BE25-5AB0",
    description: "S120 Active Line Module 55kW, requires Active Interface Module",
  },
  {
    id: "s120-alm-80kw",
    articleNumber: "6SL3130-7TE28-0AA3",
    ratedPower: 80,
    type: "active",
    width: 300,
    driveFamily: "S120",
    activeInterfaceModule: "6SL3100-0BE28-0AB0",
    description: "S120 Active Line Module 80kW, requires Active Interface Module",
  },
  {
    id: "s120-alm-120kw",
    articleNumber: "6SL3130-7TE31-2AA3",
    ratedPower: 120,
    type: "active",
    width: 300,
    driveFamily: "S120",
    activeInterfaceModule: "6SL3100-0BE31-2AB0",
    description: "S120 Active Line Module 120kW, requires Active Interface Module",
  },

  // --- Smart Line Modules ---
  {
    id: "s120-slm-5kw",
    articleNumber: "6SL3130-6AE15-0AB1",
    ratedPower: 5,
    type: "smart",
    width: 50,
    driveFamily: "S120",
    description: "S120 Smart Line Module 5kW",
  },
  {
    id: "s120-slm-10kw",
    articleNumber: "6SL3130-6AE21-0AB1",
    ratedPower: 10,
    type: "smart",
    width: 50,
    driveFamily: "S120",
    description: "S120 Smart Line Module 10kW",
  },
  {
    id: "s120-slm-36kw",
    articleNumber: "6SL3130-6TE23-6AA3",
    ratedPower: 36,
    type: "smart",
    width: 150,
    driveFamily: "S120",
    description: "S120 Smart Line Module 36kW",
  },
  {
    id: "s120-slm-55kw",
    articleNumber: "6SL3130-6TE25-5AA3",
    ratedPower: 55,
    type: "smart",
    width: 200,
    driveFamily: "S120",
    description: "S120 Smart Line Module 55kW",
  },

  // --- Basic Line Modules ---
  {
    id: "s120-blm-20kw",
    articleNumber: "6SL3130-1TE22-0AA0",
    ratedPower: 20,
    type: "basic",
    width: 100,
    driveFamily: "S120",
    description: "S120 Basic Line Module 20kW",
  },
  {
    id: "s120-blm-40kw",
    articleNumber: "6SL3130-1TE24-0AA0",
    ratedPower: 40,
    type: "basic",
    width: 150,
    driveFamily: "S120",
    description: "S120 Basic Line Module 40kW",
  },
  {
    id: "s120-blm-100kw",
    articleNumber: "6SL3130-1TE31-0AA0",
    ratedPower: 100,
    type: "basic",
    width: 200,
    driveFamily: "S120",
    description: "S120 Basic Line Module 100kW",
  },
];

// ------------------------------------------------------------
// 3. S220 Smart Line Modules
// ------------------------------------------------------------

export const s220LineModules: LineModuleSpec[] = [
  {
    id: "s220-slm-16kw-c",
    articleNumber: "6SL5130-6UE21-6AC0",
    ratedPower: 16,
    type: "smart",
    width: 100,
    driveFamily: "S220",
    description: "S220 Smart Line Module 16kW, internal fan cooling",
  },
  {
    id: "s220-slm-16kw-d",
    articleNumber: "6SL5130-6UE21-6AD0",
    ratedPower: 16,
    type: "smart",
    width: 100,
    driveFamily: "S220",
    description: "S220 Smart Line Module 16kW, cold-plate cooling",
  },
  {
    id: "s220-slm-24kw-c",
    articleNumber: "6SL5130-6UE22-4AC0",
    ratedPower: 24,
    type: "smart",
    width: 100,
    driveFamily: "S220",
    description: "S220 Smart Line Module 24kW, internal fan cooling",
  },
  {
    id: "s220-slm-24kw-d",
    articleNumber: "6SL5130-6UE22-4AD0",
    ratedPower: 24,
    type: "smart",
    width: 100,
    driveFamily: "S220",
    description: "S220 Smart Line Module 24kW, cold-plate cooling",
  },
];

// ------------------------------------------------------------
// 4. S210 Standalone Converters (D21.4)
// ------------------------------------------------------------

export interface S210ConverterSpec {
  id: string;
  articleNumber: string;
  ratedPower: number; // kW
  frame: string;
  supplyVoltage: "1AC_230V" | "3AC_240V" | "3AC_480V";
  description: string;
}

export const s210Converters: S210ConverterSpec[] = [
  // --- 1AC 230V Series ---
  {
    id: "s210-1ac-0.1kw",
    articleNumber: "6SL5310-1BB10-1CF0",
    ratedPower: 0.1,
    frame: "FSA",
    supplyVoltage: "1AC_230V",
    description: "SINAMICS S210 1AC 230V, 0.1kW, Frame FSA",
  },
  {
    id: "s210-1ac-0.2kw",
    articleNumber: "6SL5310-1BB10-2CF0",
    ratedPower: 0.2,
    frame: "FSA",
    supplyVoltage: "1AC_230V",
    description: "SINAMICS S210 1AC 230V, 0.2kW, Frame FSA",
  },
  {
    id: "s210-1ac-0.4kw",
    articleNumber: "6SL5310-1BB10-4CF0",
    ratedPower: 0.4,
    frame: "FSB",
    supplyVoltage: "1AC_230V",
    description: "SINAMICS S210 1AC 230V, 0.4kW, Frame FSB",
  },
  {
    id: "s210-1ac-0.75kw",
    articleNumber: "6SL5310-1BB10-8CF0",
    ratedPower: 0.75,
    frame: "FSC",
    supplyVoltage: "1AC_230V",
    description: "SINAMICS S210 1AC 230V, 0.75kW, Frame FSC",
  },

  // --- 3AC 200-480V Series ---
  {
    id: "s210-3ac-0.4kw",
    articleNumber: "6SL5310-1BE10-4DF1",
    ratedPower: 0.4,
    frame: "FSA",
    supplyVoltage: "3AC_480V",
    description: "SINAMICS S210 3AC 480V, 0.4kW, Frame FSA",
  },
  {
    id: "s210-3ac-0.75kw",
    articleNumber: "6SL5310-1BE10-8DF1",
    ratedPower: 0.75,
    frame: "FSA",
    supplyVoltage: "3AC_480V",
    description: "SINAMICS S210 3AC 480V, 0.75kW, Frame FSA",
  },
  {
    id: "s210-3ac-1.0kw",
    articleNumber: "6SL5310-1BE11-0DF1",
    ratedPower: 1.0,
    frame: "FSA",
    supplyVoltage: "3AC_480V",
    description: "SINAMICS S210 3AC 480V, 1.0kW, Frame FSA",
  },
  {
    id: "s210-3ac-1.5kw",
    articleNumber: "6SL5310-1BE11-5DF1",
    ratedPower: 1.5,
    frame: "FSB",
    supplyVoltage: "3AC_480V",
    description: "SINAMICS S210 3AC 480V, 1.5kW, Frame FSB",
  },
  {
    id: "s210-3ac-2.0kw",
    articleNumber: "6SL5310-1BE12-0DF1",
    ratedPower: 2.0,
    frame: "FSB",
    supplyVoltage: "3AC_480V",
    description: "SINAMICS S210 3AC 480V, 2.0kW, Frame FSB",
  },
  {
    id: "s210-3ac-3.5kw",
    articleNumber: "6SL5310-1BE13-5DF1",
    ratedPower: 3.5,
    frame: "FSC",
    supplyVoltage: "3AC_480V",
    description: "SINAMICS S210 3AC 480V, 3.5kW, Frame FSC",
  },
  {
    id: "s210-3ac-5.0kw",
    articleNumber: "6SL5310-1BE15-0DF1",
    ratedPower: 5.0,
    frame: "FSC",
    supplyVoltage: "3AC_480V",
    description: "SINAMICS S210 3AC 480V, 5.0kW, Frame FSC",
  },
  {
    id: "s210-3ac-7.0kw",
    articleNumber: "6SL5310-1BE17-0DF1",
    ratedPower: 7.0,
    frame: "FSC",
    supplyVoltage: "3AC_480V",
    description: "SINAMICS S210 3AC 480V, 7.0kW, Frame FSC",
  },
];

// ------------------------------------------------------------
// 5. Servo Motors for S210 Drive Systems (D32)
// ------------------------------------------------------------

export const s210Motors: ServoMotorSpec[] = [
  // --- 1FK2 High Dynamic ---
  {
    id: "1fk2-hd-sh30-0.64",
    motorArticle: "1FK2103-2AG01-0A0",
    series: "1FK2",
    variant: "High Dynamic",
    shaftHeight: 30,
    staticTorque: 0.64,
    maxTorque: 2.1,
    ratedSpeed: 3000,
    ratedPower: 0.2,
    motorType: "feed",
    description: "1FK2 High Dynamic, SH30, 0.64Nm, 3000rpm",
  },
  {
    id: "1fk2-hd-sh30-1.27",
    motorArticle: "1FK2103-4AG01-0A0",
    series: "1FK2",
    variant: "High Dynamic",
    shaftHeight: 30,
    staticTorque: 1.27,
    maxTorque: 4.0,
    ratedSpeed: 3000,
    ratedPower: 0.4,
    motorType: "feed",
    description: "1FK2 High Dynamic, SH30, 1.27Nm, 3000rpm",
  },
  {
    id: "1fk2-hd-sh40-2.4",
    motorArticle: "1FK2104-5AF01-0A0",
    series: "1FK2",
    variant: "High Dynamic",
    shaftHeight: 40,
    staticTorque: 2.4,
    maxTorque: 7.5,
    ratedSpeed: 3000,
    ratedPower: 0.75,
    motorType: "feed",
    description: "1FK2 High Dynamic, SH40, 2.4Nm, 3000rpm",
  },
  {
    id: "1fk2-hd-sh40-3.2",
    motorArticle: "1FK2104-6AF01-0A0",
    series: "1FK2",
    variant: "High Dynamic",
    shaftHeight: 40,
    staticTorque: 3.2,
    maxTorque: 10.0,
    ratedSpeed: 3000,
    ratedPower: 1.0,
    motorType: "feed",
    description: "1FK2 High Dynamic, SH40, 3.2Nm, 3000rpm",
  },
  {
    id: "1fk2-hd-sh52-5.0",
    motorArticle: "1FK2105-4AF01-0A0",
    series: "1FK2",
    variant: "High Dynamic",
    shaftHeight: 52,
    staticTorque: 5.0,
    maxTorque: 16.0,
    ratedSpeed: 3000,
    ratedPower: 1.57,
    motorType: "feed",
    description: "1FK2 High Dynamic, SH52, 5.0Nm, 3000rpm",
  },
  {
    id: "1fk2-hd-sh52-8.0",
    motorArticle: "1FK2105-6AF01-0A0",
    series: "1FK2",
    variant: "High Dynamic",
    shaftHeight: 52,
    staticTorque: 8.0,
    maxTorque: 25.0,
    ratedSpeed: 3000,
    ratedPower: 2.51,
    motorType: "feed",
    description: "1FK2 High Dynamic, SH52, 8.0Nm, 3000rpm",
  },
  {
    id: "1fk2-hd-sh63-12",
    motorArticle: "1FK2106-4AF01-0A0",
    series: "1FK2",
    variant: "High Dynamic",
    shaftHeight: 63,
    staticTorque: 12,
    maxTorque: 38.0,
    ratedSpeed: 3000,
    ratedPower: 3.77,
    motorType: "feed",
    description: "1FK2 High Dynamic, SH63, 12Nm, 3000rpm",
  },
  {
    id: "1fk2-hd-sh63-16",
    motorArticle: "1FK2106-6AF01-0A0",
    series: "1FK2",
    variant: "High Dynamic",
    shaftHeight: 63,
    staticTorque: 16,
    maxTorque: 50.0,
    ratedSpeed: 3000,
    ratedPower: 5.03,
    motorType: "feed",
    description: "1FK2 High Dynamic, SH63, 16Nm, 3000rpm",
  },

  // --- 1FK2 Compact ---
  {
    id: "1fk2-compact-sh40-3.2",
    motorArticle: "1FK2204-6AF01-0A0",
    series: "1FK2",
    variant: "Compact",
    shaftHeight: 40,
    staticTorque: 3.2,
    maxTorque: 10.0,
    ratedSpeed: 3000,
    ratedPower: 1.0,
    motorType: "feed",
    description: "1FK2 Compact, SH40, 3.2Nm, 3000rpm",
  },
  {
    id: "1fk2-compact-sh48-6.0",
    motorArticle: "1FK2205-4AF01-0A0",
    series: "1FK2",
    variant: "Compact",
    shaftHeight: 48,
    staticTorque: 6.0,
    maxTorque: 19.0,
    ratedSpeed: 3000,
    ratedPower: 1.88,
    motorType: "feed",
    description: "1FK2 Compact, SH48, 6.0Nm, 3000rpm",
  },
  {
    id: "1fk2-compact-sh63-12",
    motorArticle: "1FK2206-4AF01-0A0",
    series: "1FK2",
    variant: "Compact",
    shaftHeight: 63,
    staticTorque: 12,
    maxTorque: 38.0,
    ratedSpeed: 3000,
    ratedPower: 3.77,
    motorType: "feed",
    description: "1FK2 Compact, SH63, 12Nm, 3000rpm",
  },
  {
    id: "1fk2-compact-sh80-22",
    motorArticle: "1FK2208-4AC01-0A0",
    series: "1FK2",
    variant: "Compact",
    shaftHeight: 80,
    staticTorque: 22,
    maxTorque: 65.0,
    ratedSpeed: 2000,
    ratedPower: 4.61,
    motorType: "feed",
    description: "1FK2 Compact, SH80, 22Nm, 2000rpm",
  },
  {
    id: "1fk2-compact-sh80-27",
    motorArticle: "1FK2208-5AC01-0A0",
    series: "1FK2",
    variant: "Compact",
    shaftHeight: 80,
    staticTorque: 27,
    maxTorque: 80.0,
    ratedSpeed: 2000,
    ratedPower: 5.65,
    motorType: "feed",
    description: "1FK2 Compact, SH80, 27Nm, 2000rpm",
  },
  {
    id: "1fk2-compact-sh100-30",
    motorArticle: "1FK2210-3AC01-0A0",
    series: "1FK2",
    variant: "Compact",
    shaftHeight: 100,
    staticTorque: 30,
    maxTorque: 90.0,
    ratedSpeed: 2000,
    ratedPower: 6.28,
    motorType: "feed",
    description: "1FK2 Compact, SH100, 30Nm, 2000rpm",
  },
  {
    id: "1fk2-compact-sh100-40",
    motorArticle: "1FK2210-4AC01-0A0",
    series: "1FK2",
    variant: "Compact",
    shaftHeight: 100,
    staticTorque: 40,
    maxTorque: 120.0,
    ratedSpeed: 2000,
    ratedPower: 8.38,
    motorType: "feed",
    description: "1FK2 Compact, SH100, 40Nm, 2000rpm",
  },
];

// ------------------------------------------------------------
// 6. S210 Drive System Matches (Motor + Converter combos)
//    Most common 3AC 480V combinations for SINUMERIK ONE
// ------------------------------------------------------------

export const s210Matches: DriveSystemMatch[] = [
  // --- 1FK2 High Dynamic 3AC 480V ---
  {
    motorArticle: "1FK2103-2AG01-0A0",
    converterArticle: "6SL5310-1BE10-4DF1",
    converterFrame: "FSA",
    converterPower: 0.4,
    cableArticle: "6FX3002-5CK32",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2103-4AG01-0A0",
    converterArticle: "6SL5310-1BE10-8DF1",
    converterFrame: "FSA",
    converterPower: 0.75,
    cableArticle: "6FX3002-5CK32",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2104-5AF01-0A0",
    converterArticle: "6SL5310-1BE10-8DF1",
    converterFrame: "FSA",
    converterPower: 0.75,
    cableArticle: "6FX3002-5CK32",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2104-6AF01-0A0",
    converterArticle: "6SL5310-1BE11-0DF1",
    converterFrame: "FSA",
    converterPower: 1.0,
    cableArticle: "6FX3002-5CK32",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2105-4AF01-0A0",
    converterArticle: "6SL5310-1BE11-5DF1",
    converterFrame: "FSB",
    converterPower: 1.5,
    cableArticle: "6FX3002-5CL12",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2105-6AF01-0A0",
    converterArticle: "6SL5310-1BE12-0DF1",
    converterFrame: "FSB",
    converterPower: 2.0,
    cableArticle: "6FX3002-5CL12",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2106-4AF01-0A0",
    converterArticle: "6SL5310-1BE15-0DF1",
    converterFrame: "FSC",
    converterPower: 5.0,
    cableArticle: "6FX3002-5CL12",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2106-6AF01-0A0",
    converterArticle: "6SL5310-1BE17-0DF1",
    converterFrame: "FSC",
    converterPower: 7.0,
    cableArticle: "6FX3002-5CL12",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },

  // --- 1FK2 Compact 3AC 480V ---
  {
    motorArticle: "1FK2204-6AF01-0A0",
    converterArticle: "6SL5310-1BE11-0DF1",
    converterFrame: "FSA",
    converterPower: 1.0,
    cableArticle: "6FX3002-5CK32",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2205-4AF01-0A0",
    converterArticle: "6SL5310-1BE11-5DF1",
    converterFrame: "FSB",
    converterPower: 1.5,
    cableArticle: "6FX3002-5CL12",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2206-4AF01-0A0",
    converterArticle: "6SL5310-1BE13-5DF1",
    converterFrame: "FSC",
    converterPower: 3.5,
    cableArticle: "6FX3002-5CL12",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2208-4AC01-0A0",
    converterArticle: "6SL5310-1BE15-0DF1",
    converterFrame: "FSC",
    converterPower: 5.0,
    cableArticle: "6FX3002-5CL12",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2208-5AC01-0A0",
    converterArticle: "6SL5310-1BE17-0DF1",
    converterFrame: "FSC",
    converterPower: 7.0,
    cableArticle: "6FX3002-5CL12",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2210-3AC01-0A0",
    converterArticle: "6SL5310-1BE17-0DF1",
    converterFrame: "FSC",
    converterPower: 7.0,
    cableArticle: "6FX3002-5CL12",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
  {
    motorArticle: "1FK2210-4AC01-0A0",
    converterArticle: "6SL5310-1BE17-0DF1",
    converterFrame: "FSC",
    converterPower: 7.0,
    cableArticle: "6FX3002-5CL12",
    supplyVoltage: "3AC_480V",
    driveFamily: "S210",
  },
];

// ------------------------------------------------------------
// 7. Helper / Selection Functions
// ------------------------------------------------------------

/**
 * Find the smallest S120 motor module that can handle the required current.
 */
export function selectMotorModule(
  requiredCurrent: number,
  type: "single" | "double" = "single",
): MotorModuleSpec | undefined {
  return s120MotorModules
    .filter((m) => m.type === type && m.ratedCurrent >= requiredCurrent)
    .sort((a, b) => a.ratedCurrent - b.ratedCurrent)[0];
}

/**
 * Find the smallest S120 line module that can supply the required total power.
 */
export function selectLineModule(
  totalPower: number,
  type: "active" | "smart" | "basic" = "smart",
): LineModuleSpec | undefined {
  return s120LineModules
    .filter((m) => m.type === type && m.ratedPower >= totalPower)
    .sort((a, b) => a.ratedPower - b.ratedPower)[0];
}

/**
 * Find the best-matching S210 drive system for a given torque and speed requirement.
 * Uses a weighted distance metric: torque difference + speed difference * 0.001.
 */
export function selectS210System(
  torque: number,
  speed: number,
  voltage: "3AC_480V" | "3AC_240V" | "1AC_230V" = "3AC_480V",
): DriveSystemMatch | undefined {
  return s210Matches
    .filter((m) => m.supplyVoltage === voltage)
    .sort((a, b) => {
      const motorA = s210Motors.find((m) => m.motorArticle === a.motorArticle);
      const motorB = s210Motors.find((m) => m.motorArticle === b.motorArticle);
      if (!motorA || !motorB) return 0;
      const diffA =
        Math.abs(motorA.staticTorque - torque) +
        Math.abs(motorA.ratedSpeed - speed) * 0.001;
      const diffB =
        Math.abs(motorB.staticTorque - torque) +
        Math.abs(motorB.ratedSpeed - speed) * 0.001;
      return diffA - diffB;
    })[0];
}
