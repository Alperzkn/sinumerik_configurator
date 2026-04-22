// ============================================================
// SINUMERIK ONE Technology Packages
// Based on Siemens NC63 Catalog, January 2026
// ============================================================

import type { TechnologyPackage } from "@/types/catalog";

export const technologyPackages: TechnologyPackage[] = [
  {
    id: "pkg-S41",
    orderCode: "S41",
    articleNumber: "6FC5800-0BS41-0YB0",
    name: "SINUMERIK ONE Dynamics Operate",
    description:
      "Milling/turning job shop package including ShopTurn/ShopMill, DXF Reader, residual material detection, 3D simulation, simultaneous recording, TRANSMIT, and external storage execution.",
    includedOptions: ["P17", "P56", "P13", "P25", "P22", "M27", "P75"],
    compatibility: {
      PPU_1740: "option",
      NCU_1740: "option",
      NCU_1750: "option",
      NCU_1760: "option",
    },
    exportAvailable: true,
    recommendedFor: ["cnc_lathe", "mill_turn", "3axis_mill"],
  },
  {
    id: "pkg-S42",
    orderCode: "S42",
    articleNumber: "6FC5800-0BS42-0YB0",
    name: "SINUMERIK ONE Dynamics 3 Axis Milling",
    description:
      "Comprehensive 3-axis milling package with job shop programming, advanced and top surface quality, top speed, measuring cycles, extended HMI memory, and external storage execution.",
    includedOptions: [
      "P17",
      "P56",
      "P13",
      "P25",
      "P22",
      "M27",
      "S07",
      "S17",
      "S62",
      "P28",
      "P12",
      "P75",
    ],
    compatibility: {
      PPU_1740: "option",
      NCU_1740: "option",
      NCU_1750: "option",
      NCU_1760: "option",
    },
    exportAvailable: true,
    recommendedFor: ["3axis_mill"],
  },
  {
    id: "pkg-S43",
    orderCode: "S43",
    articleNumber: "6FC5800-0BS43-0YB0",
    name: "SINUMERIK ONE Dynamics 5 Axis Milling",
    description:
      "Full 5-axis milling package with 5-axis machining, 3D tool radius compensation, kinematics measurement, advanced/top surface, top speed, job shop programming, and all Dynamics Operate features.",
    includedOptions: [
      "M30",
      "M48",
      "P18",
      "P17",
      "P56",
      "P13",
      "P25",
      "P22",
      "M27",
      "S07",
      "S17",
      "S62",
      "P28",
      "P12",
      "P75",
    ],
    compatibility: {
      PPU_1740: "not_available",
      NCU_1740: "not_available",
      NCU_1750: "option",
      NCU_1760: "option",
    },
    exportAvailable: false,
    recommendedFor: ["5axis_mill"],
  },
  {
    id: "pkg-M30",
    orderCode: "M30",
    articleNumber: "6FC5800-0BM30-0YB0",
    name: "Machining Package 5 Axes",
    description:
      "Standalone 5-axis machining package enabling TRAORI transformation, tool tip programming, orientation interpolation, and multi-axis interpolation >4 axes.",
    includedOptions: ["M15"],
    compatibility: {
      PPU_1740: "not_available",
      NCU_1740: "not_available",
      NCU_1750: "option",
      NCU_1760: "option",
    },
    exportAvailable: false,
    recommendedFor: ["5axis_mill", "mill_turn"],
  },
  {
    id: "pkg-grinding",
    orderCode: "M34_S35",
    articleNumber: "6FC5800-0BM34-0YB0",
    name: "Grinding Package (Oscillation + Advanced)",
    description:
      "Combined grinding package including oscillation movements (M34) and advanced grinding functions (S35) for surface and cylindrical grinding applications.",
    includedOptions: ["M34", "S35"],
    compatibility: {
      PPU_1740: "option",
      NCU_1740: "option",
      NCU_1750: "option",
      NCU_1760: "option",
    },
    exportAvailable: true,
    recommendedFor: ["grinding"],
  },
  {
    id: "pkg-laser",
    orderCode: "M37_M38",
    articleNumber: "6FC5800-0BM37-0YB0",
    name: "Laser Cutting Package (Power Control + High-Speed Switching)",
    description:
      "Combined laser-processing package bundling path-velocity-dependent laser power control (M37) and high-speed laser on/off switching (M38). Typical starting point for 2D/3D laser cutting machines.",
    includedOptions: ["M37", "M38"],
    compatibility: {
      PPU_1740: "option",
      NCU_1740: "option",
      NCU_1750: "option",
      NCU_1760: "option",
    },
    exportAvailable: true,
    recommendedFor: ["laser"],
  },
  {
    id: "pkg-punching",
    orderCode: "M33_M43",
    articleNumber: "6FC5800-0BM33-0YB0",
    name: "Punching/Nibbling Package",
    description:
      "Sheet-metal punching/nibbling package bundling automatic path segmentation (M33) and cross-mode ASUB actions (M43) for synchronized ram and feed control.",
    includedOptions: ["M33", "M43"],
    compatibility: {
      PPU_1740: "option",
      NCU_1740: "option",
      NCU_1750: "option",
      NCU_1760: "option",
    },
    exportAvailable: true,
    recommendedFor: ["punching"],
  },
];
