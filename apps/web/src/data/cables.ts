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

  // ─── Motor power cables — MOTION-CONNECT 800PLUS (catalog base MLFBs)
  // Length is encoded in the order suffix (….) — e.g. -1AF0=5m, -1BA0=10m
  // Real catalog codes from D21.4 part 3 (motor↔cable selection table).
  // ─────────────────────────────────────────────────────────────────────
  // Small motors (4×1.5 mm²) — 1FT7 SH48 etc.
  {
    id: "motor-power-1.5mm-5m",
    articleNumber: "6FX8002-5CA15-1AF0",
    name: "Motor power cable 4×1.5 mm² 5 m (MC 800PLUS)",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "MOTION-CONNECT 800PLUS, 4×1.5 mm² with brake cores, 5 m — base 6FX8002-5CA15. Suffix encodes length / connector.",
  },
  {
    id: "motor-power-1.5mm-10m",
    articleNumber: "6FX8002-5CA15-1BA0",
    name: "Motor power cable 4×1.5 mm² 10 m (MC 800PLUS)",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "MOTION-CONNECT 800PLUS, 4×1.5 mm², 10 m — base 6FX8002-5CA15. Suffix encodes length / connector.",
  },
  // Medium motors (4×2.5 mm²) — 1PH8 SH80, large 1FT7
  {
    id: "motor-power-2.5mm-5m",
    articleNumber: "6FX8002-5CR10-1AF0",
    name: "Motor power cable 4×2.5 mm² 5 m (MC 800PLUS)",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "MOTION-CONNECT 800PLUS, 4×2.5 mm², 5 m — base 6FX8002-5CR10. For SIMOTICS M-1PH8 SH80 / large feed motors.",
  },
  {
    id: "motor-power-2.5mm-10m",
    articleNumber: "6FX8002-5CR10-1BA0",
    name: "Motor power cable 4×2.5 mm² 10 m (MC 800PLUS)",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "MOTION-CONNECT 800PLUS, 4×2.5 mm², 10 m — base 6FX8002-5CR10.",
  },
  // Large motors (4×6 mm²) — 1PH8 SH132 spindle
  {
    id: "motor-power-6mm-5m",
    articleNumber: "6FX8002-5CG21-1AF0",
    name: "Motor power cable 4×6 mm² 5 m (MC 800PLUS)",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "MOTION-CONNECT 800PLUS, 4×6 mm², 5 m — base 6FX8002-5CG21. For SIMOTICS M-1PH8 SH132 spindles, ≤45 A.",
  },
  {
    id: "motor-power-6mm-10m",
    articleNumber: "6FX8002-5CG21-1BA0",
    name: "Motor power cable 4×6 mm² 10 m (MC 800PLUS)",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "MOTION-CONNECT 800PLUS, 4×6 mm², 10 m — base 6FX8002-5CG21.",
  },

  // ─── Signal / encoder cables — MOTION-CONNECT 500 ───
  // Real catalog: 6FX5002-2DC… for DRIVE-CLiQ encoder signal cables and
  // 6FX8002-2BA20 / 2BA21 for PROFIBUS-style signal cables.
  {
    id: "signal-cable-5m",
    articleNumber: "6FX5002-2DC10-1AF0",
    name: "Encoder signal cable 5 m (MC 500)",
    category: "encoder_cable",
    length: "5m",
    quantity: 1,
    description: "MOTION-CONNECT 500 pre-assembled signal cable for absolute / incremental encoders, 5 m — base 6FX5002-2DC10.",
  },
  {
    id: "signal-cable-10m",
    articleNumber: "6FX5002-2DC10-1BA0",
    name: "Encoder signal cable 10 m (MC 500)",
    category: "encoder_cable",
    length: "10m",
    quantity: 1,
    description: "MOTION-CONNECT 500 pre-assembled signal cable for encoders, 10 m — base 6FX5002-2DC10.",
  },

  // ─── S210 OCC (One Cable Connection) cables — real D32 catalog codes ─
  // Base: 6FX8002-8QN04 (SH20-30), 8QN08 (SH40-52), 8QN11 (SH63-100)
  {
    id: "occ-cable-sh20-30-5m",
    articleNumber: "6FX8002-8QN04-1AF0",
    name: "OCC cable SH20-30, 5 m",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2 SH20-30, 5 m — base 6FX8002-8QN04. SINAMICS S210.",
  },
  {
    id: "occ-cable-sh40-52-5m",
    articleNumber: "6FX8002-8QN08-1AF0",
    name: "OCC cable SH40-52, 5 m",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2 SH40-52, 5 m — base 6FX8002-8QN08. SINAMICS S210.",
  },
  {
    id: "occ-cable-sh63-100-5m",
    articleNumber: "6FX8002-8QN11-1AF0",
    name: "OCC cable SH63-100, 5 m",
    category: "motor_cable",
    length: "5m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2 SH63-100, 5 m — base 6FX8002-8QN11.",
  },
  {
    id: "occ-cable-sh20-30-10m",
    articleNumber: "6FX8002-8QN04-1BA0",
    name: "OCC cable SH20-30, 10 m",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2 SH20-30, 10 m — base 6FX8002-8QN04.",
  },
  {
    id: "occ-cable-sh40-52-10m",
    articleNumber: "6FX8002-8QN08-1BA0",
    name: "OCC cable SH40-52, 10 m",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2 SH40-52, 10 m — base 6FX8002-8QN08.",
  },
  {
    id: "occ-cable-sh63-100-10m",
    articleNumber: "6FX8002-8QN11-1BA0",
    name: "OCC cable SH63-100, 10 m",
    category: "motor_cable",
    length: "10m",
    quantity: 1,
    description: "One Cable Connection for SIMOTICS S-1FK2 SH63-100, 10 m — base 6FX8002-8QN11.",
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
  // Real catalog code from D21.4 — SITOP 24 V DC supply for the drive
  // bus and NCU/PPU. 6SL3000-0CE21-0AA0 = 1 m / 10 A. Other lengths /
  // ratings: 0CE22 (2 m), 0CE23-6 (3.6 m / 24 A), 0CE24 (4 m), 0CE25-5
  // (5.5 m / 30 A).
  {
    id: "24v-supply",
    articleNumber: "6SL3000-0CE21-0AA0",
    name: "24 V DC supply cable for NCU / PPU (1 m)",
    category: "power_cable",
    quantity: 1,
    description: "SITOP 24 V DC supply cable for SINUMERIK ONE NCU/PPU and drive bus, 1 m. For longer runs use 6SL3000-0CE22…0CE25 lengths.",
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

  // (SD card entry removed — couldn't verify a single SINUMERIK ONE
  // spare-SD-card MLFB against the NC63 catalog. The catalog ships the
  // SD as part of the CNC Software variant article (6FC5852-…).)
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

  // Resolve user-preferred length. We pick a stocked variant from the
  // catalog (5m or 10m) as the *base* MLFB, then if the user requested a
  // different length, rewrite the cable's display fields so the BOM
  // shows what they asked for. The base MLFB is documented in the
  // description with the D21.4 length-suffix lookup hint.
  const rawLen = parseInt(config.cableLengthMeters || "10", 10);
  const resolvedLen = Number.isFinite(rawLen) && rawLen > 0 ? rawLen : 10;
  const userRequestedLen = resolvedLen;
  const catalogLen = resolvedLen <= 7 ? "5m" : "10m";

  /**
   * Stamp the user-requested length onto a catalog cable entry. When the
   * user asks for, say, 25 m and the catalog only stocks 5 m / 10 m, we
   * use the 10 m base MLFB but rewrite name + length + description to
   * reflect the user's request — that's what they typed and that's what
   * they want to see in the BOM. The MLFB suffix (-1AF0, -1BA0, …)
   * encodes the actual length and is selected at order time per D21.4.
   */
  const applyUserLength = (cable: CableAccessory): CableAccessory => {
    const stocked = cable.length === `${userRequestedLen}m`;
    if (stocked || !cable.length) return cable;
    return {
      ...cable,
      length: `${userRequestedLen} m`,
      name: cable.name.replace(/\b\d+\s*m\b/, `${userRequestedLen} m`),
      description:
        `${cable.description} ` +
        `User-specified length: ${userRequestedLen} m — confirm the matching MLFB suffix in catalog D21.4.`,
    };
  };

  if (isS210) {
    // S210 uses OCC (One Cable Connection) — one cable per axis.
    const shFeed = config.feedMotorShaftHeight || 40;
    const shPart = shFeed <= 30 ? "sh20-30" : shFeed <= 52 ? "sh40-52" : "sh63-100";
    const occId = `occ-cable-${shPart}-${catalogLen}`;
    const occ = cablesCatalog.find((c) => c.id === occId)
      ?? cablesCatalog.find((c) => c.id === `occ-cable-${shPart}-10m`)
      ?? cablesCatalog.find((c) => c.id === `occ-cable-${shPart}-5m`);
    if (occ) {
      cables.push(applyUserLength({ ...occ, quantity: config.feedAxes }));
    }
  } else {
    // S120 booksize DRIVE-CLiQ topology:
    // NCU→LineModule (1) + LineModule→MM1 (1) + MM daisy-chain (N-1) = N+1
    // (DRIVE-CLiQ cables are inside-cabinet runs — fixed 1m, not user-overridable.)
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
      cables.push(applyUserLength({ ...feedCable, quantity: config.feedAxes }));
    }

    // Spindle motor power cable — sized by spindle shaft height (typically larger)
    if (config.spindleAxes > 0) {
      const shSpindle = config.spindleMotorShaftHeight || 132;
      const spindleCableSize = getMotorCableSize(shSpindle);
      const spindleCable = cablesCatalog.find((c) => c.id === `motor-power-${spindleCableSize}-${catalogLen}`)
        ?? cablesCatalog.find((c) => c.id === `motor-power-${spindleCableSize}-10m`);
      if (spindleCable) {
        cables.push(applyUserLength({ ...spindleCable, quantity: config.spindleAxes }));
      }
    }

    // Encoder signal cables: one per axis. Modern SIMOTICS have integrated
    // DRIVE-CLiQ encoders that don't strictly need a separate signal cable,
    // but ordering practice conventionally includes them (for external
    // measuring systems, service spares, and commissioning probes).
    const encoderCable = cablesCatalog.find((c) => c.id === `signal-cable-${catalogLen}`)
      ?? cablesCatalog.find((c) => c.id === "signal-cable-10m");
    if (encoderCable) {
      cables.push(
        applyUserLength({ ...encoderCable, quantity: config.feedAxes + config.spindleAxes })
      );
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
