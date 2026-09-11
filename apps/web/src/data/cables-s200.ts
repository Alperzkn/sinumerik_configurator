/**
 * MOTION-CONNECT cables for SINAMICS S200 / S200 Spindle (828D Smart).
 * Article families and lengths come from the same tables the 808D → 828D
 * Smart converter uses (D 37.1 11/2025, 1PH3 Pro manual 06/2026 §3.2.4,
 * IK PI). Length codes seen only in listings are said so in the name.
 */
import type { CableAccessory } from "@/types/catalog";
import { LEN, MC350_VERIFIED, PH3, PH3_ENC_CABLE } from "@/lib/convert-808d/catalog";

const LENGTH_CODES: Array<[number, string]> = [[3, "1AD0"], [5, "1AF0"], [7, "1AH0"], [10, "1BA0"], [15, "1BF0"], [20, "1CA0"], [30, "1DA0"]];

function lengthCode(meters: number): string {
  return (LENGTH_CODES.find(([m]) => m >= meters) ?? LENGTH_CODES[LENGTH_CODES.length - 1])[1];
}

export function selectCablesS200(config: {
  feedAxes: number;
  spindleAxes: number;
  feedShaftHeight?: number;
  feedPowerKw?: number;
  feedBrakeAxes?: number;
  spindleArticle?: string;
  cableLengthMeters?: string;
}): CableAccessory[] {
  const cables: CableAccessory[] = [];
  const meters = Math.max(1, parseFloat(config.cableLengthMeters || "10") || 10);
  const len = lengthCode(meters);
  const lenLabel = LEN[len] ?? `${meters} m`;
  const listed = (fam: string) => (MC350_VERIFIED[fam] ?? []).includes(len);
  const tag = (fam: string) => (listed(fam) ? "" : " — length code seen only in Siemens listings, confirm in SiePortal");

  if (config.feedAxes > 0) {
    const sh = config.feedShaftHeight ?? 65;
    const kw = config.feedPowerKw ?? 1.5;
    const powerFam = sh <= 65 ? "5CL01" : kw > 3.5 ? "5CL12" : "5CL02";
    const xs = powerFam === "5CL01" ? "4x0.75" : powerFam === "5CL02" ? "4x1.5" : "4x2.5";
    cables.push({
      id: `s200-power-${powerFam}-${len}`,
      articleNumber: `6FX3502-${powerFam}-${len}`,
      name: `Power cable ${xs} mm² for 1FL2 SH${sh} with S200, MOTION-CONNECT 350, ${lenLabel}${tag(powerFam)}`,
      category: "power_cable",
      length: lenLabel,
      quantity: config.feedAxes,
      description: "Pre-assembled motor power cable (D 37.1 ch.4). Confirm the cross-section against the motor current in TIA Selection Tool.",
    });
    cables.push({
      id: `s200-encoder-2XB12-${len}`,
      articleNumber: `6FX3502-2XB12-${len}`,
      name: `Encoder cable 3x2x0.25 for 1FL2 with S200 (absolute encoder), MOTION-CONNECT 350, ${lenLabel}${tag("2XB12")}`,
      category: "encoder_cable",
      length: lenLabel,
      quantity: config.feedAxes,
      description: "Pre-assembled encoder cable (D 37.1 ch.4).",
    });
    if (config.feedBrakeAxes && config.feedBrakeAxes > 0) {
      cables.push({
        id: `s200-brake-5BL03-${len}`,
        articleNumber: `6FX3502-5BL03-${len}`,
        name: `Brake cable 2x0.75 mm² for 1FL2 with S200, MOTION-CONNECT 350, ${lenLabel}${tag("5BL03")}`,
        category: "signal_cable",
        length: lenLabel,
        quantity: config.feedBrakeAxes,
        description: "Only for motors with holding brake (Smart PDF p.47).",
      });
    }
  }

  if (config.spindleAxes > 0) {
    const encLen = PH3_ENC_CABLE.includes(len) ? len : "1BA0";
    cables.push({
      id: `s200-spindle-encoder-${encLen}`,
      articleNumber: `6FX3502-2XB13-${encLen}`,
      name: `Encoder cable for 1PH3 Pro (BiSS-C / TTL) with S200 Spindle, MOTION-CONNECT 350, ${LEN[encLen]}`,
      category: "encoder_cable",
      length: LEN[encLen],
      quantity: config.spindleAxes,
      description: "1PH3 Pro manual 06/2026 §3.2.4 (lengths 3–20 m).",
    });
    const m = config.spindleArticle?.match(/^1PH3(\d{3})-1[HL]([DEFGS])/);
    const variant = m ? PH3.find((x) => x.frame === m[1] && x.wind === m[2]) : undefined;
    const raw = variant?.cable ?? "1BB31";
    const xs: Record<string, string> = { "1BB21": "4x2.5", "1BB31": "4x4", "1BB51": "4x10", "1BB61": "4x16" };
    cables.push({
      id: `s200-spindle-power-${raw}`,
      articleNumber: `6FX5008-${raw}-1DA0`,
      name: `Power cable ${xs[raw]} mm² for 1PH3 Pro, MOTION-CONNECT 500, 30 m raw length (terminal-box motor)`,
      category: "power_cable",
      length: "30 m raw",
      quantity: config.spindleAxes,
      description: "Cross-section per 1PH3 Pro manual Table 3-2; connectors and glands assembled on site.",
    });
    cables.push({
      id: "s200-spindle-braking-resistor",
      articleNumber: "3rd party",
      name: "External braking resistor for the S200 Spindle converter (mandatory)",
      category: "accessory",
      quantity: config.spindleAxes,
      description: "Sized per the S200 Spindle operating instructions — not a Siemens catalog article (Smart PDF p.47).",
    });
  }

  const drives = config.feedAxes + config.spindleAxes;
  if (drives > 0) {
    cables.push({
      id: "s200-pn-ppu",
      articleNumber: "6XV1870-3QH20",
      name: "Industrial Ethernet TP Cord RJ45/RJ45 4x2, 2 m — PPU → first S200 (PROFINET)",
      category: "network_cable",
      length: "2 m",
      quantity: 1,
      description: "Listed in catalog IK PI.",
    });
    if (drives > 1) {
      cables.push({
        id: "s200-pn-chain",
        articleNumber: "6XV1870-3QE50",
        name: "Industrial Ethernet TP Cord RJ45/RJ45 4x2, 0.5 m — S200 → S200 daisy chain (PROFINET)",
        category: "network_cable",
        length: "0.5 m",
        quantity: drives - 1,
        description: "Listed in catalog IK PI.",
      });
    }
  }
  return cables;
}
