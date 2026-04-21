import type { CableAccessory } from "@/types/catalog";
import { calculateDriveCliqCables, getMotorCableSize } from "@/lib/validation/drive-system-rules";

export const cablesCatalog: CableAccessory[] = [
  // ─── DRIVE-CLiQ cables (between NCU/NX and drive components) ───
  {
    id: "dcliq-1m",
    articleNumber: "6SL3060-4AA10-0AA0",
    name: "DRIVE-CLiQ cable 1m",
    category: "drive_cliq_cable",
    length: "1m",
    quantity: 1,
    description: "DRIVE-CLiQ cable IP20/IP20, 1m, for connection between NCU/NX and SINAMICS components",
  },
  {
    id: "dcliq-2m",
    articleNumber: "6SL3060-4AB20-0AA0",
    name: "DRIVE-CLiQ cable 2m",
    category: "drive_cliq_cable",
    length: "2m",
    quantity: 1,
    description: "DRIVE-CLiQ cable IP20/IP20, 2m",
  },
  {
    id: "dcliq-5m",
    articleNumber: "6SL3060-4AB50-0AA0",
    name: "DRIVE-CLiQ cable 5m",
    category: "drive_cliq_cable",
    length: "5m",
    quantity: 1,
    description: "DRIVE-CLiQ cable IP20/IP20, 5m",
  },

  // ─── Motor power cables by cross-section (MOTION-CONNECT 500) ───
  // Small motors (up to 9A / SH48): 3x1.5mm²
  {
    id: "motor-power-1.5mm-5m",
    articleNumber: "6FX3002-5CK01-1AF0",
    name: "Motor power cable 3x1.5mm² 5m",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "MOTION-CONNECT 500, 3x1.5+2x1.5, 5m — for motors up to 9A (SH20-48)",
  },
  {
    id: "motor-power-1.5mm-10m",
    articleNumber: "6FX3002-5CK01-1BA0",
    name: "Motor power cable 3x1.5mm² 10m",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "MOTION-CONNECT 500, 3x1.5+2x1.5, 10m — for motors up to 9A (SH20-48)",
  },
  // Medium motors (9-30A / SH63-100): 3x2.5mm²
  {
    id: "motor-power-2.5mm-5m",
    articleNumber: "6FX3002-5CK21-1AF0",
    name: "Motor power cable 3x2.5mm² 5m",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "MOTION-CONNECT 500, 3x2.5+2x1.5, 5m — for motors 9-30A (SH63-100)",
  },
  {
    id: "motor-power-2.5mm-10m",
    articleNumber: "6FX3002-5CK21-1BA0",
    name: "Motor power cable 3x2.5mm² 10m",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "MOTION-CONNECT 500, 3x2.5+2x1.5, 10m — for motors 9-30A (SH63-100)",
  },
  // Large motors (30-85A / SH132+): 3x6mm²
  {
    id: "motor-power-6mm-5m",
    articleNumber: "6FX3002-5CK31-1AF0",
    name: "Motor power cable 3x6mm² 5m",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "MOTION-CONNECT 500, 3x6+2x1.5, 5m — for motors 30-85A (SH132+)",
  },
  {
    id: "motor-power-6mm-10m",
    articleNumber: "6FX3002-5CK31-1BA0",
    name: "Motor power cable 3x6mm² 10m",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "MOTION-CONNECT 500, 3x6+2x1.5, 10m — for motors 30-85A (SH132+)",
  },

  // ─── Signal/encoder cables ───
  {
    id: "signal-cable-5m",
    articleNumber: "6FX3002-2DB10-1AF0",
    name: "Signal cable encoder 5m",
    category: "encoder_cable",
    length: "5m",
    quantity: 1,
    description: "Pre-assembled signal cable for incremental/absolute encoders, shielded, 5m",
  },
  {
    id: "signal-cable-10m",
    articleNumber: "6FX3002-2DB10-1BA0",
    name: "Signal cable encoder 10m",
    category: "encoder_cable",
    length: "10m",
    quantity: 1,
    description: "Pre-assembled signal cable for encoders, shielded, 10m",
  },

  // ─── S210 OCC (One Cable Connection) cables ───
  {
    id: "occ-cable-sh20-30-5m",
    articleNumber: "6FX2002-8QN04-1AF0",
    name: "OCC cable SH20-30, 5m",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2/1FT2, shaft height 20-30, 5m",
  },
  {
    id: "occ-cable-sh40-52-5m",
    articleNumber: "6FX2002-8QN08-1AF0",
    name: "OCC cable SH40-52, 5m",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2/1FT2, shaft height 40-52, 5m",
  },
  {
    id: "occ-cable-sh63-100-5m",
    articleNumber: "6FX2002-8QN11-1AF0",
    name: "OCC cable SH63-100, 5m",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2/1FT2, shaft height 63-100, 5m",
  },
  {
    id: "occ-cable-sh20-30-10m",
    articleNumber: "6FX2002-8QN04-1BA0",
    name: "OCC cable SH20-30, 10m",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2/1FT2, shaft height 20-30, 10m",
  },
  {
    id: "occ-cable-sh40-52-10m",
    articleNumber: "6FX2002-8QN08-1BA0",
    name: "OCC cable SH40-52, 10m",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2/1FT2, shaft height 40-52, 10m",
  },
  {
    id: "occ-cable-sh63-100-10m",
    articleNumber: "6FX2002-8QN11-1BA0",
    name: "OCC cable SH63-100, 10m",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2/1FT2, shaft height 63-100, 10m",
  },

  // ─── PROFINET/Ethernet cables ───
  {
    id: "profinet-2m",
    articleNumber: "6XV1871-5BH20",
    name: "PROFINET cable RJ45 2m",
    category: "network_cable",
    length: "2m",
    quantity: 1,
    description: "Industrial Ethernet FC trailing cable GP, pre-assembled with RJ45, 2m",
  },
  {
    id: "profinet-5m",
    articleNumber: "6XV1871-5BH50",
    name: "PROFINET cable RJ45 5m",
    category: "network_cable",
    length: "5m",
    quantity: 1,
    description: "Industrial Ethernet FC trailing cable GP, pre-assembled with RJ45, 5m",
  },
  {
    id: "profinet-10m",
    articleNumber: "6XV1871-5BN10",
    name: "PROFINET cable RJ45 10m",
    category: "network_cable",
    length: "10m",
    quantity: 1,
    description: "Industrial Ethernet FC trailing cable GP, pre-assembled with RJ45, 10m",
  },

  // ─── Power supply ───
  {
    id: "24v-supply",
    articleNumber: "6SL3062-2AA00-0DA0",
    name: "24V DC supply cable for NCU/PPU",
    category: "power_cable",
    quantity: 1,
    description: "24V DC power supply cable for SINUMERIK ONE NCU/PPU",
  },

  // ─── HDBaseT cables for Flat Panels ───
  {
    id: "hdbaset-cable-10m",
    articleNumber: "6AV7860-1EX21-0AB1",
    name: "HDBaseT cable set 10m",
    category: "signal_cable",
    length: "10m",
    quantity: 1,
    description: "Cable set with CAT6 cable + host module V2 (HDBaseT) for SIMATIC Flat Panel, 10m",
  },
  {
    id: "hdbaset-cable-15m",
    articleNumber: "6AV7860-1EX21-5AB1",
    name: "HDBaseT cable set 15m",
    category: "signal_cable",
    length: "15m",
    quantity: 1,
    description: "Cable set with CAT6 cable + host module V2 (HDBaseT) for SIMATIC Flat Panel, 15m",
  },
  {
    id: "hdbaset-cable-20m",
    articleNumber: "6AV7860-1EX22-0AB1",
    name: "HDBaseT cable set 20m",
    category: "signal_cable",
    length: "20m",
    quantity: 1,
    description: "Cable set with CAT6 cable + host module V2 (HDBaseT) for SIMATIC Flat Panel, 20m",
  },

  // ─── Power connectors for S120 booksize ───
  {
    id: "s120-power-connector-screw",
    articleNumber: "6SL3162-2MA00-0AC0",
    name: "S120 booksize power connector (screw)",
    category: "accessory",
    quantity: 1,
    description: "Power connector, screw terminal, for S120 booksize Motor Modules 3-30A",
  },

  // ─── MCP connector set ───
  {
    id: "mcp-connector-set",
    articleNumber: "6FC5348-0AP00-0AA0",
    name: "MCP connector set X515/X516",
    category: "accessory",
    quantity: 1,
    description: "Connector set for SINUMERIK ONE MCP (6 units: 3x X515 + 3x X516)",
  },

  // ─── SD card ───
  {
    id: "sd-card-cnc",
    articleNumber: "6FC5313-6AG00-0AA0",
    name: "SD card for NCU/PPU (spare)",
    category: "accessory",
    quantity: 1,
    description: "Industrial SD card for SINUMERIK ONE NCU/PPU, 16 GB",
  },
];

/**
 * Auto-select cables based on configuration.
 * Cable cross-section matched to motor current:
 * - ≤9A (SH20-48): 1.5mm² cables
 * - 9-30A (SH63-100): 2.5mm² cables
 * - 30-85A (SH132+): 6mm² cables
 */
export function selectCables(config: {
  feedAxes: number;
  spindleAxes: number;
  controlUnitId: string;
  hmiCategory?: string;
  driveFamily?: string;
  feedMotorShaftHeight?: number;
  spindleMotorShaftHeight?: number;
  /** User-preferred length in meters for motor/encoder cables. Default 10. */
  cableLengthMeters?: string;
}): CableAccessory[] {
  const cables: CableAccessory[] = [];
  const totalDriveAxes = config.feedAxes + config.spindleAxes;
  const isS210 = config.driveFamily === "S210";

  // Map user-preferred length to a catalog length suffix. 10m is the default.
  const rawLen = parseInt(config.cableLengthMeters || "10", 10);
  const resolvedLen = Number.isFinite(rawLen) && rawLen > 0 ? rawLen : 10;
  // Catalog currently stocks 5m and 10m cuts; snap to the nearest available.
  const catalogLen = resolvedLen <= 7 ? "5m" : "10m";

  if (isS210) {
    // S210 uses OCC (One Cable Connection) — one cable per axis.
    const shFeed = config.feedMotorShaftHeight || 40;
    const shPart = shFeed <= 30 ? "sh20-30" : shFeed <= 52 ? "sh40-52" : "sh63-100";
    const occId = `occ-cable-${shPart}-${catalogLen}`;
    const occ = cablesCatalog.find((c) => c.id === occId)
      ?? cablesCatalog.find((c) => c.id === `occ-cable-${shPart}-10m`)
      ?? cablesCatalog.find((c) => c.id === `occ-cable-${shPart}-5m`);
    if (occ) {
      cables.push({ ...occ, quantity: config.feedAxes });
    }
  } else {
    // S120 booksize DRIVE-CLiQ topology:
    // NCU→LineModule (1) + LineModule→MM1 (1) + MM daisy-chain (N-1) = N+1
    const dcliqCount = calculateDriveCliqCables(config.feedAxes, config.spindleAxes);
    const dcliq = cablesCatalog.find((c) => c.id === "dcliq-1m")!;
    cables.push({ ...dcliq, quantity: dcliqCount });

    // Feed motor power cables — cross-section matched to motor shaft height.
    // Length defaults to 10m; user can override via cableLengthMeters.
    const shFeed = config.feedMotorShaftHeight || 63;
    const feedCableSize = getMotorCableSize(shFeed);
    const feedCable = cablesCatalog.find((c) => c.id === `motor-power-${feedCableSize}-${catalogLen}`)
      ?? cablesCatalog.find((c) => c.id === `motor-power-${feedCableSize}-10m`);
    if (feedCable) {
      cables.push({ ...feedCable, quantity: config.feedAxes });
    }

    // Spindle motor power cable — sized by spindle shaft height (typically larger)
    if (config.spindleAxes > 0) {
      const shSpindle = config.spindleMotorShaftHeight || 132;
      const spindleCableSize = getMotorCableSize(shSpindle);
      const spindleCable = cablesCatalog.find((c) => c.id === `motor-power-${spindleCableSize}-${catalogLen}`)
        ?? cablesCatalog.find((c) => c.id === `motor-power-${spindleCableSize}-10m`);
      if (spindleCable) {
        cables.push({ ...spindleCable, quantity: config.spindleAxes });
      }
    }

    // Encoder signal cables: one per axis. Modern SIMOTICS have integrated
    // DRIVE-CLiQ encoders that don't strictly need a separate signal cable,
    // but ordering practice conventionally includes them (for external
    // measuring systems, service spares, and commissioning probes).
    const encoderCable = cablesCatalog.find((c) => c.id === `signal-cable-${catalogLen}`)
      ?? cablesCatalog.find((c) => c.id === "signal-cable-10m");
    if (encoderCable) {
      cables.push({ ...encoderCable, quantity: config.feedAxes + config.spindleAxes });
    }
  }

  // PROFINET cables — 10m default + one extra per peripheral device
  // (HMI, MCP, I/O module, handheld each need their own PROFINET run)
  const profinet = cablesCatalog.find((c) => c.id === "profinet-10m")
    ?? cablesCatalog.find((c) => c.id === "profinet-5m")!;
  cables.push({ ...profinet, quantity: 1 });

  // 24V supply
  const supply = cablesCatalog.find((c) => c.id === "24v-supply")!;
  cables.push({ ...supply, quantity: 1 });

  // HDBaseT for Flat Panels
  if (config.hmiCategory === "flat_panel") {
    const hdbaset = cablesCatalog.find((c) => c.id === "hdbaset-cable-10m")!;
    cables.push({ ...hdbaset, quantity: 1 });
  }

  // MCP connector set (always needed for NCU-based systems)
  if (config.controlUnitId?.startsWith("NCU")) {
    const mcpConn = cablesCatalog.find((c) => c.id === "mcp-connector-set");
    if (mcpConn) {
      cables.push({ ...mcpConn, quantity: 1 });
    }
  }

  // S120 power connectors (1 per motor module for booksize)
  if (!isS210 && totalDriveAxes > 0) {
    const pwrConn = cablesCatalog.find((c) => c.id === "s120-power-connector-screw");
    if (pwrConn) {
      cables.push({ ...pwrConn, quantity: totalDriveAxes });
    }
  }

  return cables;
}
