import type { Motor } from "@/types/catalog";

const allUnitsOption = {
  PPU_1740: "option" as const,
  NCU_1740: "option" as const,
  NCU_1750: "option" as const,
  NCU_1760: "option" as const,
};

export const motors: Motor[] = [
  // ── Feed / Servo Synchronous (SIMOTICS S) ──────────────────────────
  {
    id: "1fk2",
    family: "SIMOTICS_S",
    series: "1FK2",
    name: "SIMOTICS S-1FK2 servo motor",
    motorType: "feed_servo_sync",
    connectionType: "2_cable",
    compatibility: allUnitsOption,
    notes:
      "1-cable technology available when used with SINAMICS S210 (requires CNC SW >= 6.25). 2-cable standard with S120/S220.",
    description:
      "Compact high-dynamic servo motor with DRIVE-CLiQ encoder. Available in 2-cable (S120/S220) or 1-cable (S210) connection.",
  },
  {
    id: "1ft2",
    family: "SIMOTICS_S",
    series: "1FT2",
    name: "SIMOTICS S-1FT2 servo motor",
    motorType: "feed_servo_sync",
    connectionType: "2_cable",
    compatibility: allUnitsOption,
    description:
      "High-performance servo motor with integrated DRIVE-CLiQ encoder. Higher torque density than 1FK2 for demanding feed axis applications.",
  },
  {
    id: "1fk7",
    family: "SIMOTICS_S",
    series: "1FK7",
    name: "SIMOTICS S-1FK7 servo motor",
    motorType: "feed_servo_sync",
    connectionType: "2_cable",
    compatibility: allUnitsOption,
    description:
      "Established servo motor platform with wide range of encoder options. Available with resolver, sin/cos, or absolute encoder.",
  },
  {
    id: "1ft7",
    family: "SIMOTICS_S",
    series: "1FT7",
    name: "SIMOTICS S-1FT7 servo motor",
    motorType: "feed_servo_sync",
    connectionType: "2_cable",
    compatibility: allUnitsOption,
    description:
      "High-performance servo motor for demanding machine tool feed axes. Integrated absolute encoder with DRIVE-CLiQ interface.",
  },

  // ── Main Spindle Asynchronous (SIMOTICS M) ─────────────────────────
  {
    id: "1ph3",
    family: "SIMOTICS_M",
    series: "1PH3",
    name: "SIMOTICS M-1PH3 main spindle motor (async)",
    motorType: "main_spindle_async",
    connectionType: "standard",
    compatibility: allUnitsOption,
    notes:
      "Only supported with Smart Line Module infeeds or with Smart Mode on Active Line Modules.",
    description:
      "Cost-optimized asynchronous main spindle motor. Suitable for standard turning and milling applications.",
  },
  {
    id: "1ph8-async",
    family: "SIMOTICS_M",
    series: "1PH8",
    name: "SIMOTICS M-1PH8 main spindle motor (async)",
    motorType: "main_spindle_async",
    connectionType: "standard",
    compatibility: allUnitsOption,
    description:
      "High-performance asynchronous main spindle motor with wide constant-power speed range. Standard choice for demanding milling and turning spindles.",
  },
  {
    id: "1fe2-async",
    family: "SIMOTICS_M",
    series: "1FE2",
    name: "SIMOTICS M-1FE2 built-in motor (async)",
    motorType: "main_spindle_async",
    connectionType: "standard",
    compatibility: allUnitsOption,
    description:
      "Asynchronous built-in motor for direct spindle integration. Eliminates mechanical transmission for maximum spindle speed and rigidity.",
  },

  // ── Main Spindle Synchronous (SIMOTICS M) ──────────────────────────
  {
    id: "1ph8-sync",
    family: "SIMOTICS_M",
    series: "1PH8",
    name: "SIMOTICS M-1PH8 main spindle motor (sync)",
    motorType: "main_spindle_sync",
    connectionType: "standard",
    compatibility: allUnitsOption,
    description:
      "Synchronous main spindle motor variant of the 1PH8 with higher torque at low speed. Ideal for heavy-duty turning and thread cutting.",
  },
  {
    id: "1fe1",
    family: "SIMOTICS_M",
    series: "1FE1",
    name: "SIMOTICS M-1FE1 built-in motor (sync)",
    motorType: "main_spindle_sync",
    connectionType: "standard",
    compatibility: allUnitsOption,
    description:
      "Synchronous built-in motor for high-speed direct-drive spindles. Permanent magnet rotor for maximum efficiency and dynamics.",
  },
  {
    id: "1fe2-sync",
    family: "SIMOTICS_M",
    series: "1FE2",
    name: "SIMOTICS M-1FE2 built-in motor (sync)",
    motorType: "main_spindle_sync",
    connectionType: "standard",
    compatibility: allUnitsOption,
    description:
      "Synchronous built-in motor with compact design for direct spindle integration. High torque density with permanent magnet technology.",
  },

  // ── Linear (SIMOTICS L) ────────────────────────────────────────────
  {
    id: "1fn3",
    family: "SIMOTICS_L",
    series: "1FN3",
    name: "SIMOTICS L-1FN3 linear motor",
    motorType: "linear_sync",
    connectionType: "standard",
    compatibility: allUnitsOption,
    description:
      "Iron-core linear motor for direct linear drives. Maximum acceleration and positioning accuracy without mechanical transmission. Requires linear scale measuring system.",
  },

  // ── Torque (SIMOTICS T) ────────────────────────────────────────────
  {
    id: "1fw6-standard",
    family: "SIMOTICS_T",
    series: "1FW6",
    name: "SIMOTICS T-1FW6 torque motor (Standard)",
    motorType: "torque_sync",
    connectionType: "standard",
    compatibility: allUnitsOption,
    description:
      "Standard torque motor for direct-drive rotary tables and tilting axes. High torque at low speed without gearbox.",
  },
  {
    id: "1fw6-highspeed",
    family: "SIMOTICS_T",
    series: "1FW6",
    name: "SIMOTICS T-1FW6 torque motor (High Speed)",
    motorType: "torque_sync",
    connectionType: "standard",
    compatibility: allUnitsOption,
    description:
      "High-speed variant of the 1FW6 torque motor. Optimized for applications requiring higher rotational speeds at reduced torque.",
  },
  {
    id: "1fw67",
    family: "SIMOTICS_T",
    series: "1FW67",
    name: "SIMOTICS T-1FW67 external rotor torque motor",
    motorType: "torque_sync",
    connectionType: "standard",
    compatibility: allUnitsOption,
    description:
      "External rotor torque motor. Rotor mounted on the outside of the stator for large hollow-shaft applications such as rotary tables.",
  },
  {
    id: "1fw68",
    family: "SIMOTICS_T",
    series: "1FW68",
    name: "SIMOTICS T-1FW68 segment torque motor",
    motorType: "torque_sync",
    connectionType: "standard",
    compatibility: allUnitsOption,
    description:
      "Segment torque motor for very large diameter direct drives. Motor arc segments can be combined for custom diameters.",
  },
];
