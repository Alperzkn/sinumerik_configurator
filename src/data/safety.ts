import type { SafetyFunction } from "@/types/catalog";

const allUnitsOption = {
  PPU_1740: "option" as const,
  NCU_1740: "option" as const,
  NCU_1750: "option" as const,
  NCU_1760: "option" as const,
};

export const safetyFunctions: SafetyFunction[] = [
  // ── Basic scope (included) ─────────────────────────────────────────
  {
    id: "sto",
    name: "Safe Torque Off (STO)",
    category: "basic",
    isBasicScope: true,
    compatibility: allUnitsOption,
    description:
      "Safely removes torque-generating energy from the motor. Available via onboard terminals or PROFIsafe. Included in basic scope.",
  },
  {
    id: "ss1-time",
    name: "Safe Stop 1 (SS1) - time-controlled",
    category: "basic",
    isBasicScope: true,
    compatibility: allUnitsOption,
    description:
      "Time-controlled safe stop: drive decelerates and transitions to STO after configurable delay. Included in basic scope.",
  },
  {
    id: "sbc-basic",
    name: "Safe Brake Control (SBC)",
    category: "basic",
    isBasicScope: true,
    compatibility: allUnitsOption,
    description:
      "Controls the motor holding brake in a safety-relevant manner. Engages brake when STO is activated. Included in basic scope.",
  },

  // ── F-PLC (option S60) ─────────────────────────────────────────────
  {
    id: "f-plc-s60",
    articleNumber: "6FC5800-0BS60-0YB0",
    orderCode: "S60",
    name: "SINUMERIK Failsafe PLC (F-PLC)",
    category: "f_plc",
    isBasicScope: false,
    compatibility: allUnitsOption,
    description:
      "Enables failsafe PLC programming on SINUMERIK ONE. Prerequisite for all extended safety functions. Does not include axis monitoring by itself.",
  },

  // ── Safety axis/spindle (K01-K09) ──────────────────────────────────
  {
    id: "safety-axis-k",
    articleNumber: "6FC5800-0BK00-0YB0",
    orderCode: "K01-K09",
    name: "Safety axis/spindle monitoring (per axis)",
    category: "axis_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60"],
    description:
      "Enables safe motion monitoring for 1 axis or spindle. Order one per axis/spindle requiring safety monitoring. Requires F-PLC (S60).",
  },

  // ── Safety multi-axis package (S61) ────────────────────────────────
  {
    id: "safety-multi-axis-s61",
    articleNumber: "6FC5800-0BS61-0YB0",
    orderCode: "S61",
    name: "Safety multi-axis package",
    category: "multi_axis",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60"],
    description:
      "Enables safe motion monitoring for all axes and spindles in the system. Cost-effective alternative to individual K options when many axes require safety. Requires F-PLC (S60).",
  },

  // ── Extended safe stop functions ───────────────────────────────────
  {
    id: "sto-profisafe",
    name: "Safe Torque Off (STO) via PROFIsafe",
    category: "safe_stop",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60"],
    description:
      "STO triggered via PROFIsafe communication. Allows software-controlled safe torque removal without hardwired signals.",
  },
  {
    id: "ss1-speed",
    name: "Safe Stop 1 (SS1) - speed-controlled",
    category: "safe_stop",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Speed-controlled safe stop with monitored deceleration ramp. Transitions to STO only after speed drops below threshold.",
  },
  {
    id: "ss2",
    name: "Safe Stop 2 (SS2)",
    category: "safe_stop",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Safe stop to zero speed with the drive remaining energized. Axis held in position by the drive controller.",
  },
  {
    id: "ss2e",
    name: "Safe Stop 2 extended (SS2e)",
    category: "safe_stop",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Extended Safe Stop 2 with enhanced monitoring during deceleration phase.",
  },
  {
    id: "ss2-esr",
    name: "Safe Stop 2 ESR (SS2 ESR)",
    category: "safe_stop",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Safe Stop 2 for Extended Stop and Retract. Used for controlled tool retraction before safe stop in case of safety events.",
  },
  {
    id: "stop-f",
    name: "Stop F",
    category: "safe_stop",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Feedrate-controlled safe stop via the CNC interpolator. Ensures path-accurate deceleration.",
  },

  // ── Extended safe monitoring functions ─────────────────────────────
  {
    id: "sos",
    name: "Safe Operating Stop (SOS)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Safely monitors standstill of an axis while the drive remains energized. Holding torque is maintained.",
  },
  {
    id: "sls",
    name: "Safely-Limited Speed (SLS)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Monitors that axis speed does not exceed a configurable limit. Supports override 0-100% for flexible speed limiting.",
  },
  {
    id: "ssm",
    name: "Safe Speed Monitor (SSM)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Provides a safe signal indicating whether the axis speed is below a defined threshold. Used for interlocking safety gates.",
  },
  {
    id: "sam",
    name: "Safe Acceleration Monitor (SAM)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Monitors that axis acceleration does not exceed a configurable safety limit.",
  },
  {
    id: "sbr",
    name: "Safe Brake Ramp (SBR)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Monitors the deceleration ramp of an axis during safe stop sequences. Ensures the axis decelerates within expected parameters.",
  },
  {
    id: "slp",
    name: "Safely-Limited Position (SLP)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Monitors that an axis does not exceed configurable position limits. Software-based safe limit switches.",
  },
  {
    id: "sca",
    name: "Safe Cam (SCA)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Provides safe position-dependent switching signals (safe cams). Replaces mechanical cam switches with software-based solution.",
  },
  {
    id: "sp",
    name: "Safe Position (SP)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Provides a safely determined axis position value to the F-PLC for use in safety-related position evaluations.",
  },
  {
    id: "sls-encoderless",
    name: "Safely-Limited Speed encoderless (SLS encoderless)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Speed monitoring without encoder feedback using current-based speed estimation. For applications where encoder-based monitoring is not feasible.",
  },
  {
    id: "sdi",
    name: "Safe Direction (SDI)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Monitors that an axis only moves in the permitted direction. Prevents unintended reverse motion.",
  },
  {
    id: "sla",
    name: "Safely-Limited Acceleration (SLA)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Limits the acceleration of an axis to a safe maximum value. Prevents hazardous rapid acceleration.",
  },
  {
    id: "sbm",
    name: "Safe Brake Management (SBM)",
    category: "safe_monitoring",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-axis-k|safety-multi-axis-s61"],
    description:
      "Comprehensive brake management including Safe Brake Control (SBC) and Safe Brake Test (SBT). Monitors brake condition and performs periodic brake tests.",
  },

  // ── Safe Kinematics ────────────────────────────────────────────────
  {
    id: "safe-kinematics",
    articleNumber: "6ES7823-0FE04-1AA0",
    name: "SIMATIC Safe Kinematics",
    category: "safe_kinematics",
    isBasicScope: false,
    compatibility: allUnitsOption,
    requirements: ["f-plc-s60", "safety-multi-axis-s61"],
    description:
      "Safe kinematic transformation for robot and multi-axis safety applications. Enables safe Cartesian space monitoring for robot packages integrated with SINUMERIK ONE.",
  },
];
