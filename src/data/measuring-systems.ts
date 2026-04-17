import type { MeasuringSystem } from "@/types/catalog";

const allUnitsBasic = {
  PPU_1740: "basic" as const,
  NCU_1740: "basic" as const,
  NCU_1750: "basic" as const,
  NCU_1760: "basic" as const,
};

export const measuringSystems: MeasuringSystem[] = [
  {
    id: "abs-drive-cliq",
    name: "Absolute encoder via DRIVE-CLiQ",
    type: "absolute",
    encoderInterface: "DRIVE-CLiQ",
    compatibility: allUnitsBasic,
    description:
      "Absolute encoder with direct DRIVE-CLiQ connection. No sensor module required. Automatic position detection after power-on without reference point approach.",
  },
  {
    id: "abs-motor-integrated",
    name: "Absolute encoder motor-integrated",
    type: "absolute",
    encoderInterface: "DRIVE-CLiQ",
    compatibility: allUnitsBasic,
    description:
      "Motor-integrated absolute encoder with DRIVE-CLiQ. Available in 1FK2, 1FT2, 1FT7, 1FK7, 1PH8, and 1PH3 motor series.",
  },
  {
    id: "abs-ssi-smc30",
    name: "Absolute encoder SSI via SMC30",
    type: "absolute",
    encoderInterface: "SSI",
    sensorModule: "SMC30",
    articleNumber: "6SL3055-0AA00-5CA2",
    compatibility: allUnitsBasic,
    description:
      "SSI absolute encoder connected via SMC30 sensor module. For third-party absolute encoders with SSI interface.",
  },
  {
    id: "inc-motor-integrated",
    name: "Incremental encoder motor-integrated",
    type: "incremental",
    encoderInterface: "DRIVE-CLiQ",
    compatibility: allUnitsBasic,
    description:
      "Motor-integrated incremental encoder with DRIVE-CLiQ. Requires reference point approach after each power-on.",
  },
  {
    id: "resolver-motor-integrated",
    name: "Resolver motor-integrated (1FK7)",
    type: "resolver",
    encoderInterface: "resolver",
    compatibility: allUnitsBasic,
    description:
      "Motor-integrated resolver, available in 1FK7 series. Robust and cost-effective solution. Requires SMC10 when used as external measuring system.",
  },
  {
    id: "resolver-external-smc10",
    name: "Resolver external via SMC10",
    type: "resolver",
    encoderInterface: "resolver",
    sensorModule: "SMC10",
    articleNumber: "6SL3055-0AA00-5AA3",
    compatibility: allUnitsBasic,
    description:
      "External resolver connected via SMC10 sensor module. Converts resolver signals to DRIVE-CLiQ for the drive system.",
  },
  {
    id: "rotary-sincos-smc20",
    name: "Rotary encoder sin/cos 1Vpp via SMC20/SME20",
    type: "incremental",
    encoderInterface: "sin_cos_1Vpp",
    sensorModule: "SMC20 / SME20",
    articleNumber: "6SL3055-0AA00-5BA3 / 6SL3055-0AA00-5EA3",
    compatibility: allUnitsBasic,
    description:
      "Rotary sin/cos 1Vpp encoder via cabinet-mounted SMC20 or machine-mounted SME20 (IP67). High-resolution incremental feedback.",
  },
  {
    id: "rotary-endat21-smc20",
    name: "Rotary encoder EnDat 2.1 via SMC20/SME25",
    type: "absolute",
    encoderInterface: "EnDat_2_1",
    sensorModule: "SMC20 / SME25",
    articleNumber: "6SL3055-0AA00-5BA3 / 6SL3055-0AA00-5HA3",
    compatibility: allUnitsBasic,
    description:
      "Rotary absolute encoder with EnDat 2.1 interface via SMC20 or SME25 (IP67). Combined absolute position and high-resolution incremental signals.",
  },
  {
    id: "rotary-endat22-smc40",
    name: "Rotary encoder EnDat 2.2 via SMC40",
    type: "absolute",
    encoderInterface: "EnDat_2_2",
    sensorModule: "SMC40",
    articleNumber: "6SL3055-0AA00-5DA0",
    compatibility: allUnitsBasic,
    description:
      "Rotary absolute encoder with purely digital EnDat 2.2 interface via SMC40. Highest accuracy and noise immunity for demanding applications.",
  },
  {
    id: "rotary-ttl-smc30",
    name: "Rotary encoder RS422 TTL via SMC30",
    type: "incremental",
    encoderInterface: "RS422_TTL",
    sensorModule: "SMC30",
    articleNumber: "6SL3055-0AA00-5CA2",
    compatibility: allUnitsBasic,
    description:
      "Rotary incremental encoder with RS422 TTL interface via SMC30 sensor module. For standard incremental encoders.",
  },
  {
    id: "linear-sincos-smc20",
    name: "Linear scale sin/cos 1Vpp via SMC20/SME20",
    type: "linear_scale",
    encoderInterface: "sin_cos_1Vpp",
    sensorModule: "SMC20 / SME20",
    articleNumber: "6SL3055-0AA00-5BA3 / 6SL3055-0AA00-5EA3",
    compatibility: allUnitsBasic,
    description:
      "Linear scale with sin/cos 1Vpp signals via SMC20 or SME20. Direct position measurement on the machine axis for highest accuracy.",
  },
  {
    id: "linear-endat21-smc20",
    name: "Linear scale EnDat 2.1 via SMC20/SME25",
    type: "linear_scale",
    encoderInterface: "EnDat_2_1",
    sensorModule: "SMC20 / SME25",
    articleNumber: "6SL3055-0AA00-5BA3 / 6SL3055-0AA00-5HA3",
    compatibility: allUnitsBasic,
    description:
      "Absolute linear scale with EnDat 2.1 interface via SMC20 or SME25. No reference point approach required after power-on.",
  },
  {
    id: "linear-endat22-smc40",
    name: "Linear scale EnDat 2.2 via SMC40",
    type: "linear_scale",
    encoderInterface: "EnDat_2_2",
    sensorModule: "SMC40",
    articleNumber: "6SL3055-0AA00-5DA0",
    compatibility: allUnitsBasic,
    description:
      "Absolute linear scale with purely digital EnDat 2.2 interface via SMC40. Premium solution for highest precision requirements.",
  },
];
