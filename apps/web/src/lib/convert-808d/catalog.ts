/**
 * 828D Smart catalogue used by the converter.
 *
 * Every article the converter may select lives here. `src` says where the
 * number comes from:
 *   - "PDF p.x"  — the "SINUMERIK 828D Smart system – Details" PDF
 *   - "outside"  — cables the user explicitly allowed, numbers verified in
 *                  Siemens / distributor listings
 *   - "derived"  — motor codes following the PDF's own pattern (p.48),
 *                  checked against Siemens listings
 *
 * Cross-checked 2026-09-10 against the catalogs in docs/:
 *   - NC 82 ch.2 "828D / 828D Smart – overview of functions" 09/2026:
 *     PPU 26x.5, MCP 1200U, SD cards, every -0YH0 option below, and the
 *     828D Smart limit of 5 axes/spindles.
 *   - D 37.1 11/2025: S200 converter articles (…A F 0 = PROFINET version),
 *     1FL2 article legend (brake digit, shaft digit, M = 21+12-bit multiturn
 *     encoder, B = metal circular connector) and MOTION-CONNECT 350 families.
 *   - NC 81.1 2018: the 808D ADVANCED side (PPU/MCP articles, V70 drives,
 *     1FL6 "-0xx1" codes, 1PH1 table, MC300 cables, option codes).
 */

import type { LineBasis, LineGroup } from "./types";

export interface CatalogItem {
  mlfb: string;
  desc: string;
  src: string;
  cls: LineBasis;
  grp: LineGroup;
}

export const CAT = {
  ppuH: {
    mlfb: "6FC5370-2AA50-0AA0",
    desc: 'SINUMERIK 828D Smart PPU 261.5, horizontal, 12.1" display, ONG keyboard, PROFINET to SINAMICS S200',
    src: "PDF p.12, p.48",
    cls: "pdf",
    grp: "CNC",
  },
  ppuV: {
    mlfb: "6FC5370-3AA50-0AA0",
    desc: 'SINUMERIK 828D Smart PPU 260.5, vertical, 12.1" display, QWERTY keyboard, PROFINET to SINAMICS S200',
    src: "PDF p.12, p.48",
    cls: "pdf",
    grp: "CNC",
  },
  mcpH: {
    mlfb: "6FC5303-0AF32-1AA1",
    desc: "SINUMERIK MCP 1200U-H machine control panel, horizontal (for PPU 261.5)",
    src: "PDF p.12, p.48",
    cls: "pdf",
    grp: "CNC",
  },
  mcpV: {
    mlfb: "6FC5303-0AF33-1AA1",
    desc: "SINUMERIK MCP 1200U-V machine control panel, vertical (for PPU 260.5)",
    src: "PDF p.12, p.48",
    cls: "pdf",
    grp: "CNC",
  },
  sdM: {
    mlfb: "6FC5835-2GY50-0YA0",
    desc: "SD card with SINUMERIK 828D Smart system software SW 24x – MILLING, incl. licence",
    src: "PDF p.48",
    cls: "pdf",
    grp: "CNC",
  },
  sdT: {
    mlfb: "6FC5835-1GY50-0YA0",
    desc: "SD card with SINUMERIK 828D Smart system software SW 24x – TURNING, incl. licence",
    src: "PDF p.48",
    cls: "pdf",
    grp: "CNC",
  },
} as const satisfies Record<string, CatalogItem>;

/** Software options, PDF p.15 (828D Smart column "O"). key = middle code group. */
export const OPTIONS: Record<string, string> = {
  "0AC20": "Axis/spindle, each additional",
  "0AC30": "Positioning axis/auxiliary spindle, each additional",
  "0AS50": "TRANSMIT/TRACYL transformation without Y axis",
  "0AS51": "Pair of synchronized axes (gantry axes), basic (max. 1 pair on 828D Smart)",
  "0AM72": "Generic coupling CP-Basic, e.g. multi-edge turning",
  "0AM54": "Leadscrew error compensation, bidirectional",
  "0AP64": "SINUMERIK Operate runtime licence OA Easy Screen (Run MyScreens standard for G-Tech)",
  "0AP54": "Access protection for cycles – Lock MyCycles",
  "0AS06": "Friction compensation with adaptive characteristics",
  "0AP76": "CNC lock function",
  "0AP58": "Advanced technology functions (T/M only)",
  "0AP16": "Extended operator functions",
  "0AQ08": "Basic technology functions",
  "0AQ06": "Extended operator basic functions",
  "0AP17": "ShopTurn/ShopMill machining step programming (T/M only)",
  "0AP13": "Residual material detection and machining for contour pockets and stock removal (T/M only)",
  "0AP22": "Simultaneous recording (real-time simulation of the current machining operation)",
  "0AM08": "Contour handwheel",
  "0AS17": "Top Surface (M only)",
  "0AP67": "Access MyMachine / OPC UA",
  "0AQ67": "Access MyMachine / OPC UA – Eco",
};

/**
 * 808D option codes with a different key on 828D.
 * Verified: 0AK70 = 808D "additional 1 axis/spindle",
 *           0AK80 = "additional positioning axis/auxiliary spindle".
 */
export const OPTION_ALIASES: Record<string, string> = {
  "0AK70": "0AC20", // NC 81.1: "Axis/spindle, each additional"
  "0AK80": "0AC30", // not in NC 81.1 (2018) — later 808D SW; kept from the user's own list
  "0AS71": "0AP76", // NC 81.1: "CNC lock function" → NC 82 09/2026 p.2/x CNC lock function
};

/** 808D options with no 828D Smart counterpart in the PDF. */
export const OPTION_NONE: Record<string, string> = {
  "0AP07": "Manual Machine Plus (MM+), 808D turning – not offered on 828D Smart in the PDF",
};

/** Last resort: match an unknown 808D option by the words in its description. */
export const OPTION_KEYWORDS: Array<[RegExp, string]> = [
  [/positioning axis|auxiliary spindle|positionier/i, "0AC30"],
  [/additional (1 )?axis|additional axes|zus[aä]tzlich.*achse|ek eksen|\baxis\/spindle\b/i, "0AC20"],
  [/gantry|synchron/i, "0AS51"],
  [/contour handwheel/i, "0AM08"],
  [/transmit|tracyl/i, "0AS50"],
  [/leadscrew|lead screw/i, "0AM54"],
  [/simultaneous recording|real-time simulation/i, "0AP22"],
  [/shopmill|shopturn|machining step/i, "0AP17"],
  [/residual material/i, "0AP13"],
  [/easy screen|myscreens/i, "0AP64"],
  [/lock mycycles|access protection/i, "0AP54"],
  [/friction/i, "0AS06"],
  [/opc ua|access mymachine/i, "0AP67"],
  [/cnc lock/i, "0AP76"],
  [/extended operator basic/i, "0AQ06"],
  [/basic technology/i, "0AQ08"],
  [/extended operator/i, "0AP16"],
  [/advanced technology/i, "0AP58"],
  [/top surface/i, "0AS17"],
  [/generic coupling|multi-edge/i, "0AM72"],
];

export interface S200Drive {
  mlfb: string;
  fs: string;
  a: string;
}

/** Feed drives, PDF p.27 — keyed by motor rated power (kW). */
export const S200: Record<string, S200Drive> = {
  "0.4": { mlfb: "6SL5510-1BE10-4AF0-Z T80", fs: "FSA", a: "1.3 A" },
  "0.75": { mlfb: "6SL5510-1BE10-8AF0-Z T80", fs: "FSB", a: "3.0 A" },
  "1": { mlfb: "6SL5510-1BE11-0AF0-Z T80", fs: "FSB", a: "3.0 A" },
  "1.5": { mlfb: "6SL5510-1BE11-5AF0-Z T80", fs: "FSC (1.75 kW unit)", a: "7.8 A" },
  "1.75": { mlfb: "6SL5510-1BE12-5AF0-Z T80", fs: "FSC", a: "7.8 A" },
  "2": { mlfb: "6SL5510-1BE12-5AF0-Z T80", fs: "FSC", a: "7.8 A" },
  "2.5": { mlfb: "6SL5510-1BE13-5AF0-Z T80", fs: "FSD", a: "13.2 A" },
  "3.5": { mlfb: "6SL5510-1BE13-5AF0-Z T80", fs: "FSD", a: "13.2 A" },
  "5": { mlfb: "6SL5510-1BE15-0AF0-Z T80", fs: "FSD", a: "13.2 A" },
  "7": { mlfb: "6SL5510-1BE17-0AF0-Z T80", fs: "FSD", a: "13.2 A" },
};

export interface Fl6Size {
  sh: number;
  kw: number;
  nm: number;
  n: string;
  /** power digit in the 1FL2 code */
  p: string;
  /** speed letter in the 1FL2 code */
  s: string;
  /** 1FL2 prefix (frame) */
  pre: string;
}

/**
 * 1FL6 HI 400 V (808D) → 1FL2 HI 400 V (828D Smart).
 * Motor data PDF p.25/p.27; code pattern PDF p.48. Keyed by the 3-digit
 * 1FL6 size (characters 5-7 of the 808D article).
 */
export const FL6: Record<string, Fl6Size> = {
  "042": { sh: 45, kw: 0.4, nm: 1.27, n: "3000/4000", p: "2", s: "F", pre: "1FL2304" },
  "044": { sh: 45, kw: 0.75, nm: 2.39, n: "3000/4000", p: "4", s: "F", pre: "1FL2304" },
  "061": { sh: 65, kw: 0.75, nm: 3.58, n: "2000/3000", p: "1", s: "C", pre: "1FL2306" },
  "062": { sh: 65, kw: 1, nm: 4.78, n: "2000/3000", p: "2", s: "C", pre: "1FL2306" },
  "064": { sh: 65, kw: 1.5, nm: 7.16, n: "2000/3000", p: "4", s: "C", pre: "1FL2306" },
  "066": { sh: 65, kw: 1.75, nm: 8.36, n: "2000/3000", p: "6", s: "C", pre: "1FL2306" },
  "067": { sh: 65, kw: 2, nm: 9.55, n: "2000/3000", p: "7", s: "C", pre: "1FL2306" },
  "090": { sh: 90, kw: 2.5, nm: 11.9, n: "2000/3000", p: "0", s: "C", pre: "1FL2310" },
  "092": { sh: 90, kw: 3.5, nm: 16.7, n: "2000/3000", p: "2", s: "C", pre: "1FL2310" },
  "094": { sh: 90, kw: 5, nm: 23.9, n: "2000/2500", p: "4", s: "C", pre: "1FL2310" },
  "096": { sh: 90, kw: 7, nm: 33.4, n: "2000/2000", p: "6", s: "C", pre: "1FL2310" },
};

export interface SpindleDrive {
  maxKw: number;
  sh: number;
  mlfb: string;
  fs: string;
  a: string;
}

/** Spindle: S200 Spindle drives for 1PH3 Pro, PDF p.35. Ordered smallest first. */
export const SPINDLE_DRIVES: SpindleDrive[] = [
  { maxKw: 3.7, sh: 100, mlfb: "6SL5510-1EE13-7AF0", fs: "FSE", a: "13 A" },
  { maxKw: 11, sh: 100, mlfb: "6SL5510-1EE17-5AF0", fs: "FSE", a: "18 A" },
  { maxKw: 11, sh: 132, mlfb: "6SL5510-1EE21-1AF0", fs: "FSF", a: "30 A" },
  { maxKw: 15, sh: 132, mlfb: "6SL5510-1EE21-5AF0", fs: "FSF", a: "43 A" },
];

/** Complete 1PH3 Pro MLFBs printed verbatim in the PDF (p.48). */
export const PH3_EXAMPLES: Record<string, string> = {
  "1PH3105-1HG12-0KA1":
    "SIMOTICS M-1PH3 Pro SH100, 7.5 kW, BiSS encoder, nn = 2000 rpm, nmax = 12 000 rpm (PDF p.48)",
  "1PH3131-1LF12-0KA1":
    "SIMOTICS M-1PH3 Pro SH132, 11 kW, TTL encoder, nn = 1500 rpm, nmax = 10 000 rpm (PDF p.48)",
};

export interface Ph3Variant {
  frame: string;
  sh: number;
  kw: number;
  n: number;
  nmax: number;
  /** winding letter: D/E/F/G = 1000/1200/1500/2000 rpm */
  wind: string;
  /** encoder letters available: H = BiSS-C 21-bit, L = TTL 2500 ppr */
  enc: string;
  /** suffix after the shaft digit */
  sfx: string;
  /** MOTION-CONNECT 500 raw power cable (6FX5008-{cable}-1DA0) — cross-section per 1PH3 Pro manual 06/2026 Table 3-2 */
  cable: "1BB21" | "1BB31" | "1BB51" | "1BB61";
}

/**
 * SIMOTICS M-1PH3 Pro for S200 Spindle — Siemens 1PH3 Pro manual 06/2026
 * (docs/1PH3_Pro_man_0626_en-US.pdf) Table 3-2, verified row by row incl.
 * rated current and power-cable cross-section; motor data also PDF p.33/p.35.
 *
 * Code = 1PH3{frame}-1{enc}{wind}12-{shaft}{sfx}
 * Shaft digit: 0 = plain shaft (without keyway), 2 = shaft with key,
 * half-key balancing (verified in Siemens listings). The full-key
 * balancing digit was not seen in any listing and is never generated.
 *
 * NOTE: 1PH3 variants with DRIVE-CLiQ encoder (letter D, "…02-…A0") or
 * without encoder (letter A) belong to S120/S220 + standard 828D and are
 * NOT usable with S200 Spindle (PDF p.31/p.32/p.35).
 */
export const PH3: Ph3Variant[] = [
  { frame: "103", sh: 100, kw: 3.7, n: 1000, nmax: 10000, wind: "D", enc: "HL", sfx: "GA1", cable: "1BB21" },
  { frame: "101", sh: 100, kw: 3.7, n: 1500, nmax: 12000, wind: "F", enc: "H", sfx: "KA1", cable: "1BB21" },
  { frame: "101", sh: 100, kw: 3.7, n: 1500, nmax: 10000, wind: "F", enc: "L", sfx: "GA1", cable: "1BB21" },
  { frame: "105", sh: 100, kw: 5.5, n: 1000, nmax: 10000, wind: "D", enc: "HL", sfx: "GA1", cable: "1BB31" },
  { frame: "103", sh: 100, kw: 5.5, n: 1500, nmax: 12000, wind: "F", enc: "H", sfx: "KA1", cable: "1BB31" },
  { frame: "103", sh: 100, kw: 5.5, n: 1500, nmax: 10000, wind: "F", enc: "L", sfx: "GA1", cable: "1BB31" },
  { frame: "105", sh: 100, kw: 7.5, n: 2000, nmax: 12000, wind: "G", enc: "H", sfx: "KA1", cable: "1BB31" },
  { frame: "105", sh: 100, kw: 7.5, n: 2000, nmax: 10000, wind: "G", enc: "L", sfx: "GA1", cable: "1BB31" },
  { frame: "107", sh: 100, kw: 9, n: 1500, nmax: 12000, wind: "F", enc: "H", sfx: "KA1", cable: "1BB51" },
  { frame: "107", sh: 100, kw: 11, n: 2000, nmax: 12000, wind: "G", enc: "H", sfx: "KA1", cable: "1BB51" },
  { frame: "131", sh: 132, kw: 7.5, n: 1200, nmax: 8000, wind: "E", enc: "HL", sfx: "GA1", cable: "1BB51" },
  { frame: "132", sh: 132, kw: 9, n: 1200, nmax: 8000, wind: "E", enc: "HL", sfx: "GA1", cable: "1BB51" },
  { frame: "131", sh: 132, kw: 11, n: 1500, nmax: 10000, wind: "F", enc: "HL", sfx: "KA1", cable: "1BB51" },
  { frame: "133", sh: 132, kw: 11, n: 1000, nmax: 8000, wind: "D", enc: "HL", sfx: "GA1", cable: "1BB51" },
  { frame: "135", sh: 132, kw: 12, n: 1000, nmax: 8000, wind: "D", enc: "HL", sfx: "GA1", cable: "1BB51" },
  { frame: "133", sh: 132, kw: 15, n: 2000, nmax: 10000, wind: "G", enc: "HL", sfx: "KA1", cable: "1BB51" },
  { frame: "136", sh: 132, kw: 15, n: 1000, nmax: 8000, wind: "S", enc: "HL", sfx: "GA1", cable: "1BB51" }, // Y/Δ winding: 1000 rpm (Y) / 2000 rpm (Δ)
  { frame: "136", sh: 132, kw: 15, n: 1000, nmax: 8000, wind: "D", enc: "HL", sfx: "GA1", cable: "1BB61" },
];

/** 6FX3502-2XB13 length codes listed in the 1PH3 Pro manual. */
export const PH3_ENC_CABLE = ["1AD0", "1AF0", "1AH0", "1BA0", "1BF0", "1CA0"];

export interface Ph1Motor {
  kw: number;
  n: number;
  sh: number;
  enc: string;
}

/**
 * 808D spindle motors — NC 81.1 (2018) selection table, page 4/2x:
 * 1PH1{frame}-1{enc}{wind}1x-{shaft}GA0, winding D = 1000 rpm, F = 1500 rpm,
 * encoder letter L = incremental (TTL); shaft digit 0 = plain shaft.
 * Keyed by frame + winding letter.
 */
export const PH1_TABLE: Record<string, Ph1Motor> = {
  "101F": { kw: 3.7, n: 1500, sh: 100, enc: "L" },
  "103D": { kw: 3.7, n: 1000, sh: 100, enc: "L" },
  "103F": { kw: 5.5, n: 1500, sh: 100, enc: "L" },
  "105D": { kw: 5.5, n: 1000, sh: 100, enc: "L" },
  "105F": { kw: 7.5, n: 1500, sh: 100, enc: "L" },
  "131D": { kw: 7.5, n: 1000, sh: 132, enc: "L" },
  "133D": { kw: 11, n: 1000, sh: 132, enc: "L" },
};

/** Look up an 808D 1PH1 motor by its article number (frame + winding letter). */
export function lookupPh1(article: string): Ph1Motor | undefined {
  const m = article.match(/^1PH1(\d{3})-1[A-Z]([DF])1/);
  return m ? PH1_TABLE[m[1] + m[2]] : undefined;
}

/** MOTION-CONNECT length code → human length. */
export const LEN: Record<string, string> = {
  "1AD0": "3 m",
  "1AF0": "5 m",
  "1AH0": "7 m",
  "1BA0": "10 m",
  "1BF0": "15 m",
  "1CA0": "20 m",
  "1DA0": "30 m",
};

/**
 * IE TP Cord RJ45/RJ45 4x2 (PROFINET). [metres, article, label, catalog-listed],
 * ascending. `true` = printed in catalog IK PI 2015 (docs/); `false` = seen
 * only in Siemens Industry Mall / distributor listings.
 */
export const PN_CORDS: Array<[number, string, string, boolean]> = [
  [0.3, "6XV1870-3QE30", "0.3 m", false],
  [0.5, "6XV1870-3QE50", "0.5 m", true],
  [1, "6XV1870-3QH10", "1 m", true],
  [2, "6XV1870-3QH20", "2 m", true],
  [3, "6XV1870-3QH30", "3 m", false],
  [6, "6XV1870-3QH60", "6 m", true],
  [10, "6XV1870-3QN10", "10 m", true],
  [20, "6XV1870-3QN20", "20 m", false],
  [30, "6XV1870-3QN30", "30 m", false],
];

/**
 * Exact MOTION-CONNECT 350 codes seen in Siemens/distributor listings.
 * Other lengths are flagged for confirmation, never assumed.
 */
export const MC350_VERIFIED: Record<string, string[]> = {
  "5CL01": ["1AF0", "1AH0", "1BA0", "1BF0", "1CA0", "1DA0"],
  "5CL02": ["1AD0", "1AF0", "1BA0"],
  "5CL12": ["1AD0", "1AH0", "1BA0"],
  "2XB12": ["1AD0", "1BA0", "1BF0", "1CA0"],
  "5BL03": ["1AF0", "1BA0"],
};

export const MC350_LABEL: Record<string, string> = {
  "5CL01": "Power cable 4x0.75",
  "5CL02": "Power cable 4x1.5",
  "5CL12": "Power cable 4x2.5",
  "2XB12": "Encoder cable 3x2x0.25",
  "5BL03": "Brake cable 2x0.75",
};

/** 828D Smart hard limit on axes + spindles (PDF p.14). */
export const MAX_AXES_828D_SMART = 5;
