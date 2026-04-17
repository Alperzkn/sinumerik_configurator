// ============================================================
// SINUMERIK ONE Machine Templates
// Predefined templates for common machine types
// ============================================================

import type { MachineTemplate } from "@/types/catalog";

export const machineTemplates: MachineTemplate[] = [
  {
    id: "tpl-3axis-mill",
    type: "3axis_mill",
    name: "3-Axis Vertical Milling Center",
    description:
      "Standard 3-axis vertical milling center for general-purpose milling, drilling, and tapping operations.",
    icon: "Box",
    typicalAxes: 3,
    typicalSpindles: 1,
    defaultControlUnit: "NCU_1740",
    defaultPackages: ["S42"],
    defaultSafetyOptions: ["S60", "S61"],
    defaultDriveFamily: "S120_booksize",
    defaultMotorTypes: ["feed_servo_sync", "main_spindle_async"],
    promptHint:
      "3-axis vertical milling center with X, Y, Z linear axes and 1 main spindle. Typical applications include general machining, mold making, and production milling. Consider Advanced Surface (S07) and Top Surface (S17) for high-quality surface finish requirements.",
  },
  {
    id: "tpl-5axis-mill",
    type: "5axis_mill",
    name: "5-Axis Machining Center",
    description:
      "5-axis simultaneous machining center for complex aerospace, medical, and mold/die components.",
    icon: "Rotate3d",
    typicalAxes: 5,
    typicalSpindles: 1,
    defaultControlUnit: "NCU_1750",
    defaultPackages: ["S43"],
    defaultSafetyOptions: ["S60", "S61"],
    defaultDriveFamily: "S120_booksize",
    defaultMotorTypes: ["feed_servo_sync", "main_spindle_sync"],
    promptHint:
      "5-axis machining center with X, Y, Z linear axes plus 2 rotary axes (A/B or B/C) and 1 main spindle. Requires NCU 1750 or NCU 1760. The S43 Dynamics 5 Axis Milling package is recommended. Consider Protect MyMachine for collision avoidance.",
  },
  {
    id: "tpl-cnc-lathe",
    type: "cnc_lathe",
    name: "CNC Lathe (2-Axis)",
    description:
      "Standard 2-axis CNC turning center for shaft, bush, and general turning operations.",
    icon: "Cylinder",
    typicalAxes: 2,
    typicalSpindles: 1,
    defaultControlUnit: "NCU_1740",
    defaultPackages: ["S41"],
    defaultSafetyOptions: ["S60", "S61"],
    defaultDriveFamily: "S120_booksize",
    defaultMotorTypes: ["feed_servo_sync", "main_spindle_async"],
    promptHint:
      "2-axis CNC lathe with X, Z axes and 1 main spindle (C-axis optional). The S41 Dynamics Operate package provides ShopTurn for job shop programming. Consider TRANSMIT (M27) for face milling on the lathe.",
  },
  {
    id: "tpl-mill-turn",
    type: "mill_turn",
    name: "Mill-Turn Center",
    description:
      "Multi-tasking mill-turn center combining turning, milling, and drilling in a single setup.",
    icon: "Combine",
    typicalAxes: 5,
    typicalSpindles: 2,
    defaultControlUnit: "NCU_1750",
    defaultPackages: ["S41", "M30"],
    defaultSafetyOptions: ["S60", "S61"],
    defaultDriveFamily: "S120_booksize",
    defaultMotorTypes: ["feed_servo_sync", "main_spindle_async", "main_spindle_sync"],
    promptHint:
      "Mill-turn center with X, Y, Z, B/C axes, main spindle, and sub-spindle. Requires multiple channels for simultaneous operations. Consider additional channels (C11+) and TRANSMIT (M27) for complex multi-tasking.",
  },
  {
    id: "tpl-grinder",
    type: "grinding",
    name: "Surface / Cylindrical Grinder",
    description:
      "Precision grinding machine for surface, cylindrical, or profile grinding operations.",
    icon: "CircleDot",
    typicalAxes: 3,
    typicalSpindles: 1,
    defaultControlUnit: "NCU_1740",
    defaultPackages: ["M34_S35"],
    defaultSafetyOptions: ["S60", "S61"],
    defaultDriveFamily: "S120_booksize",
    defaultMotorTypes: ["feed_servo_sync", "main_spindle_async"],
    promptHint:
      "Grinding machine with X, Z axes (plus Y for surface grinders) and 1 grinding spindle. The M34 (oscillation) and S35 (advanced grinding) options are essential. Consider temperature compensation (M56) for precision applications.",
  },
  {
    id: "tpl-laser",
    type: "laser",
    name: "Laser Cutting Machine",
    description:
      "2D/3D laser cutting machine for sheet metal, tube, and profile cutting.",
    icon: "Zap",
    typicalAxes: 3,
    typicalSpindles: 0,
    defaultControlUnit: "NCU_1740",
    defaultPackages: ["M37_M38"],
    defaultSafetyOptions: ["S60", "S61"],
    defaultDriveFamily: "S120_booksize",
    defaultMotorTypes: ["feed_servo_sync"],
    promptHint:
      "Laser cutting machine with X, Y, Z axes and no spindle. Laser power control (M37) and high-speed laser switching (M38) are essential. Consider synchronized actions stage 2 (M36) for advanced laser process control.",
  },
  {
    id: "tpl-punching",
    type: "punching",
    name: "Punching / Nibbling Machine",
    description:
      "CNC punching and nibbling machine for sheet metal processing.",
    icon: "Grid3x3",
    typicalAxes: 2,
    typicalSpindles: 0,
    defaultControlUnit: "NCU_1740",
    defaultPackages: ["M33"],
    defaultSafetyOptions: ["S60", "S61"],
    defaultDriveFamily: "S120_booksize",
    defaultMotorTypes: ["feed_servo_sync"],
    promptHint:
      "Punching/nibbling machine with X, Y axes for sheet positioning. The M33 (punching/nibbling) option enables automatic path segmentation. Consider position switching (M07) for ram control.",
  },
  {
    id: "tpl-robot",
    type: "robot",
    name: "Robot Cell (6-Axis)",
    description:
      "6-axis articulated robot cell controlled by SINUMERIK ONE for handling, machining, or additive manufacturing.",
    icon: "Bot",
    typicalAxes: 6,
    typicalSpindles: 0,
    defaultControlUnit: "NCU_1750",
    defaultPackages: ["R05"],
    defaultSafetyOptions: ["S60", "K06"],
    defaultDriveFamily: "S120_booksize",
    defaultMotorTypes: ["feed_servo_sync"],
    promptHint:
      "6-axis articulated robot with J1-J6 rotary axes. Requires handling transformation (M31) for kinematic conversion. Safety is critical: use S60 (F-PLC) and individual safety axes (K01-K06) for all robot joints.",
  },
];
