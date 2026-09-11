/**
 * 808D → 828D Smart mapping engine.
 *
 * `convert()` walks every 808D input row and emits the 828D Smart lines
 * that replace it, plus configuration-level notes (axis count vs. the
 * 828D Smart limit, missing PROFINET cords, braking resistor, …).
 *
 * Everything here is deterministic. No AI is involved in product choice.
 */

import {
  CAT,
  FL6,
  LEN,
  MAX_AXES_828D_SMART,
  MC350_VERIFIED,
  OPTIONS,
  OPTION_ALIASES,
  OPTION_KEYWORDS,
  OPTION_NONE,
  lookupPh1,
  PH3,
  PH3_ENC_CABLE,
  PH3_EXAMPLES,
  PN_CORDS,
  S200,
  SPINDLE_DRIVES,
  type Ph3Variant,
} from "./catalog";
import type {
  ConversionNote,
  ConversionResult,
  InputRow,
  LineGroup,
  Orientation,
  ResultLine,
  Technology,
} from "./types";

type LineInput = Partial<ResultLine> & Pick<ResultLine, "mlfb" | "desc">;

function line(o: LineInput): ResultLine {
  return {
    qty: 1,
    cls: "pdf",
    grp: "Other",
    src: "",
    note: "",
    orig: "",
    origDesc: "",
    origQty: null,
    ...o,
  };
}

/** Group display order in the result table. */
export const GROUP_ORDER: LineGroup[] = [
  "CNC",
  "Software options",
  "Feed axes",
  "Feed-axis cables",
  "Spindle",
  "PROFINET",
  "Other",
];

const NO_ARTICLE = "—";

/** Pick the smallest S200 Spindle drive for a 1PH3 Pro variant. */
function spindleDriveFor(v: Ph3Variant) {
  return (
    SPINDLE_DRIVES.find((x) => x.sh === v.sh && v.kw <= x.maxKw) ??
    SPINDLE_DRIVES[SPINDLE_DRIVES.length - 1]
  );
}

function brakingResistorLine(q: number, sizedNote = false): ResultLine {
  return line({
    mlfb: "3rd party",
    desc: `External braking resistor – mandatory for the S200 Spindle drive (PDF p.47)${sizedNote ? "; sized per drive operating instructions" : ""}`,
    qty: q,
    orig: "(from spindle)",
    origDesc: "",
    origQty: q,
    cls: "review",
    grp: "Spindle",
    src: "PDF p.47",
  });
}

/** Detect technology (milling / turning) and PPU orientation from the rows. */
function detectTechAndOrientation(rows: InputRow[]): {
  tech: Technology | null;
  orient: Orientation;
} {
  let tech: Technology | null = null;
  let orient: Orientation | null = null;
  for (const r of rows) {
    const m = r.mlfb;
    // 2A/3A = horizontal (PPU 161.3 / 151.3), 2B = vertical (PPU 160.3); 1A = 808D basic
    if (/^6FC5370-[123][AB][MT]0\d-0[AC]A0/.test(m)) {
      tech = m.charAt(10) as Technology;
      orient = m.charAt(9) === "B" ? "V" : "H";
    }
    if (!orient && /^6FC5303-0AF35-[23][AC]A0/.test(m)) orient = "V"; // 808D vertical MCP variants
  }
  const txt = rows.map((r) => r.desc).join(" ").toLowerCase();
  if (!tech) {
    if (/turn|lathe|torna/.test(txt)) tech = "T";
    else if (/mill|vmc|freze/.test(txt)) tech = "M";
  }
  if (!orient) orient = /vertical|dikey/.test(txt) ? "V" : "H";
  return { tech, orient };
}

export function convert(rows: InputRow[]): ConversionResult {
  const out: ResultLine[] = [];
  const notes: ConversionNote[] = [];
  const { tech: detectedTech, orient } = detectTechAndOrientation(rows);
  const tech: Technology = detectedTech ?? "M";

  let feedMotorQty = 0;
  const feedMotorsListed: string[] = [];
  let v70Qty = 0;
  let spindleQty = 0;
  let analogSpindle = false;
  let posAxisQty = 0;
  let fullAxisQty = 0;
  let pnDriveCount = 0;
  let lastPh3: Ph3Variant | null = null;

  // Converted 1FL2 motors, scanned up front so the power-cable cross-section
  // follows the new motor's shaft height regardless of row order (D 37.1
  // motor table: SH45/65 → 4×0.75, SH90 → 4×1.5 / 4×2.5).
  const fl2Motors = rows.flatMap((r) => {
    const fm = r.mlfb.match(/^1FL6(\d{3})-1A[CF]6\d-[02][AL][ABGH]1$/);
    const d = fm ? FL6[fm[1]] : undefined;
    return d ? [{ sh: d.sh, kw: d.kw, qty: r.qty }] : [];
  });
  const powerFamFor = (sh: number, kw: number) => (sh <= 65 ? "5CL01" : kw > 3.5 ? "5CL12" : "5CL02");

  for (const r of rows) {
    const m = r.mlfb;
    const q = r.qty;
    const o = { orig: m, origDesc: r.desc, origQty: q };
    const mid = m.split("-")[1] || "";

    // --- PPU ---
    if (/^6FC5370-/.test(m)) {
      const ppu = orient === "V" ? CAT.ppuV : CAT.ppuH;
      out.push(
        line({
          ...ppu,
          qty: q,
          ...o,
          note: `Replaces 808D PPU ${m}. Technology ${tech === "T" ? "turning" : "milling"} comes from the SD card, not the PPU.`,
        }),
      );
      const sd = tech === "T" ? CAT.sdT : CAT.sdM;
      out.push(
        line({
          ...sd,
          qty: q,
          orig: m,
          origDesc: "(808D firmware was on the PPU)",
          origQty: q,
          note: detectedTech
            ? ""
            : "Technology not recognised – MILLING assumed; switch to 6FC5835-1GY50-0YA0 for turning.",
        }),
      );
      if (!detectedTech) {
        notes.push([
          "warn",
          "Could not tell milling from turning in the 808D list – milling SD card selected. Change it if this is a lathe.",
        ]);
      }
      continue;
    }

    // --- MCP ---
    if (/^6FC5303-/.test(m)) {
      const mcp = orient === "V" ? CAT.mcpV : CAT.mcpH;
      out.push(
        line({
          ...mcp,
          qty: q,
          ...o,
          note: "Orientation follows the PPU. Key-label language is a separate insert-strip kit on 828D – not in the PDF.",
        }),
      );
      continue;
    }

    // --- Software options ---
    if (/^6FC5800-/.test(m)) {
      let key: string | null = OPTION_ALIASES[mid] || (OPTIONS[mid] ? mid : null);
      let how = "";
      if (!key && !OPTION_NONE[mid]) {
        const kw = OPTION_KEYWORDS.find(([re]) => re.test(r.desc || ""));
        if (kw) {
          key = kw[1];
          how = `808D code ${m} is not in the alias table – matched by its description text. Check that the function is the same.`;
        }
      }
      if (key && OPTIONS[key]) {
        const aliasNote =
          mid === "0AK80"
            ? "808D 'additional positioning axis/auxiliary spindle' → 828D positioning-axis licence. If the axis must interpolate (e.g. gantry following axis as full axis) use 6FC5800-0AC20-0YH0 instead."
            : mid === "0AK70"
              ? "808D 'additional 1 axis/spindle' → 828D 'Axis/spindle, each additional' (full axis licence)."
              : "";
        out.push(
          line({
            mlfb: `6FC5800-${key}-0YH0`,
            desc: `Option: ${OPTIONS[key]}`,
            qty: q,
            ...o,
            src: "PDF p.15",
            cls: how ? "review" : "pdf",
            grp: "Software options",
            note: how || aliasNote,
          }),
        );
        if (key === "0AC30") posAxisQty += q;
        if (key === "0AC20") fullAxisQty += q;
      } else if (OPTION_NONE[mid]) {
        out.push(
          line({
            mlfb: NO_ARTICLE,
            desc: `No 828D Smart equivalent: ${OPTION_NONE[mid]} (808D option ${m})`,
            qty: q,
            ...o,
            src: "PDF p.15 option table",
            cls: "none",
            grp: "Software options",
          }),
        );
      } else {
        out.push(
          line({
            mlfb: NO_ARTICLE,
            desc: `No 828D Smart equivalent listed in the PDF for 808D option ${m}${r.desc ? " (" + r.desc + ")" : ""}`,
            qty: q,
            ...o,
            src: "PDF p.15 option table",
            cls: "none",
            grp: "Software options",
            note: "Check whether the function is part of the 828D Smart basic scope or truly unavailable.",
          }),
        );
      }
      continue;
    }

    // --- 1FL6 feed motors ---
    // NC 81.1 (V70 for 808D) lists the codes as 1FL6xxx-1Ax61-0■■1; the V90
    // variants of the same motors read -2■■1. Both are the same HI 400 V motor.
    const fm = m.match(/^1FL6(\d{3})-1A[CF]6\d-[02]([AL])([ABGH])1$/);
    if (fm) {
      const d = FL6[fm[1]];
      if (!d) {
        out.push(
          line({
            mlfb: NO_ARTICLE,
            desc: `1FL6 motor ${m} is not a HI 400 V size covered by the PDF motor table (p.25/p.27)`,
            qty: q,
            ...o,
            cls: "review",
            grp: "Feed axes",
            src: "PDF p.25",
          }),
        );
        continue;
      }
      // Siemens V90 catalog: A/B = feather key, G/H = plain shaft; B/H = with brake
      const brake = /[BH]/.test(fm[3]) ? 1 : 0;
      const key = /[AB]/.test(fm[3]) ? 1 : 0;
      const code = `${d.pre}-${d.p}A${d.s}${brake}1-${key}MB0`;
      out.push(
        line({
          mlfb: code,
          qty: q,
          ...o,
          cls: "derived",
          grp: "Feed axes",
          src: "PDF p.25/p.27 data, code pattern p.48",
          desc: `SIMOTICS S-1FL2 HI 3AC 400 V, SH${d.sh}, Pn = ${d.kw} kW, Mn = ${d.nm} Nm, ${d.n} rpm, absolute multiturn encoder 21+12 bit, ${key ? "shaft with key" : "plain shaft"}, ${brake ? "WITH holding brake" : "without brake"}, IP65`,
          note: `Same flange as 1FL6 SH${d.sh} (PDF p.26). Encoder changes from ${fm[2] === "A" ? "TTL incremental 2500 ppr" : "absolute 20-bit"} to absolute multiturn 21+12 bit. Shaft: ${key ? "feather key" : "plain"} (1FL6 code letter ${fm[3]}).`,
        }),
      );
      const drv = S200[String(d.kw)];
      out.push(
        line({
          mlfb: drv.mlfb,
          qty: q,
          orig: "(from motor)",
          origDesc: `for ${code}`,
          origQty: q,
          cls: "pdf",
          grp: "Feed axes",
          src: "PDF p.27",
          desc: `SINAMICS S200 PN 400 V servo drive ${drv.fs}, ${drv.a}, PROFINET, STO, integrated braking resistor, option T80 – for 1FL2 ${d.kw} kW`,
        }),
      );
      feedMotorQty += q;
      feedMotorsListed.push(`${q}× ${d.kw} kW`);
      pnDriveCount += q;
      continue;
    }

    // --- 1FL6 other spellings / 1FL6 LI ---
    if (/^1FL6/.test(m)) {
      out.push(
        line({
          mlfb: NO_ARTICLE,
          desc: `Motor ${m} not recognised as 1FL6 HI 400 V (${r.desc})`,
          qty: q,
          ...o,
          cls: "review",
          grp: "Feed axes",
          src: "PDF p.25",
        }),
      );
      continue;
    }

    // --- V70 drives: superseded ---
    if (/^6SL3210-5DE/.test(m)) {
      v70Qty += q;
      out.push(
        line({
          mlfb: NO_ARTICLE,
          desc: `SINAMICS V70 ${r.desc || m} – superseded. S200 drives are generated from the motor lines (PDF p.27 pairing).`,
          qty: q,
          ...o,
          cls: "replaced",
          grp: "Feed axes",
          src: "PDF p.27",
        }),
      );
      continue;
    }

    // --- 1PH3 pasted directly: only the Pro / S200-Spindle variants (…12-…A1, encoder H or L) are allowed ---
    if (/^1PH3/.test(m)) {
      const pro = m.match(/^1PH3(\d{3})-1([HL])([DEFGS])12-([02])([KG]A1)$/);
      const inTable =
        pro &&
        PH3.find(
          (x) =>
            x.frame === pro[1] && x.wind === pro[3] && x.sfx === pro[5] && x.enc.includes(pro[2]),
        );
      if (pro && inTable) {
        out.push(
          line({
            mlfb: m,
            desc: `SIMOTICS M-1PH3 Pro SH${inTable.sh}, ${inTable.kw} kW, ${inTable.n} / ${inTable.nmax} rpm, ${pro[2] === "H" ? "BiSS-C" : "TTL"} encoder, ${pro[4] === "2" ? "shaft with key (half-key balancing)" : "plain shaft"} – kept`,
            qty: q,
            ...o,
            cls: PH3_EXAMPLES[m] ? "pdf" : "derived",
            grp: "Spindle",
            src: "PDF p.33/p.35; 1PH3 Pro manual 06/2026 Table 3-2",
          }),
        );
        const drv = spindleDriveFor(inTable);
        out.push(
          line({
            mlfb: drv.mlfb,
            desc: `SINAMICS S200 Spindle drive ${drv.fs}, ${drv.a}, PROFINET – for 1PH3 Pro SH${inTable.sh} ${inTable.kw} kW`,
            qty: q,
            orig: "(from spindle motor)",
            origDesc: m,
            origQty: q,
            cls: "pdf",
            grp: "Spindle",
            src: "PDF p.35",
          }),
        );
        out.push(brakingResistorLine(q));
        spindleQty += q;
        pnDriveCount += q;
        lastPh3 = inTable;
        continue;
      }
      out.push(
        line({
          mlfb: NO_ARTICLE,
          desc: `${m} is a 1PH3 variant for SINAMICS S120/S220 (DRIVE-CLiQ encoder or no encoder, "…02-…A0") – not usable with S200 Spindle / 828D Smart, which needs the 1PH3 Pro TTL or BiSS-C variants "…12-…A1" (PDF p.31/p.32/p.35). Enter the 808D 1PH1 motor instead, or choose from the catalogue.`,
          qty: q,
          ...o,
          cls: "none",
          grp: "Spindle",
          src: "PDF p.32/p.35",
        }),
      );
      continue;
    }

    // --- Spindle motor 1PH1 (808D) → 1PH3 Pro + S200 Spindle ---
    if (/^1PH1/.test(m)) {
      const known = lookupPh1(m);
      const kwM = (r.desc || "").match(/(\d+(?:[.,]\d+)?)\s*kW/i);
      const nM = (r.desc || "").match(/(\d{3,4})\s*(?:rpm|1\/min|min-1|dev)/i);
      const kw = known ? known.kw : kwM ? parseFloat(kwM[1].replace(",", ".")) : null;
      const n = known ? known.n : nM ? parseInt(nM[1], 10) : null;
      const encPref = known ? known.enc : "L"; // 1PH1 has a TTL encoder → TTL variant by default
      let cands = kw != null ? PH3.filter((x) => x.kw === kw) : [];
      if (cands.length && known?.sh) {
        const same = cands.filter((x) => x.sh === known.sh);
        if (same.length) cands = same;
      }
      if (cands.length && n) cands.sort((a, b) => Math.abs(a.n - n) - Math.abs(b.n - n));
      const pick = cands.find((x) => x.enc.includes(encPref)) || cands[0];
      if (pick) {
        const enc = pick.enc.includes(encPref) ? encPref : pick.enc[0];
        const ph1Key = /-1[A-Z]A0$/.test(m); // 1PH1 …-1GA0 = shaft with feather key, …-0GA0 = plain shaft
        const shaft = ph1Key ? "2" : "0";
        const code = `1PH3${pick.frame}-1${enc}${pick.wind}12-${shaft}${pick.sfx}`;
        const exact = PH3_EXAMPLES[code] ? code : null;
        const alt = cands
          .filter((x) => x !== pick)
          .map((x) => `${x.n} rpm/${x.nmax} rpm SH${x.sh} (${x.enc.split("").join("/")})`)
          .join("; ");
        out.push(
          line({
            mlfb: exact || code,
            qty: q,
            ...o,
            cls: exact ? "pdf" : "derived",
            grp: "Spindle",
            src: exact
              ? "PDF p.48; 1PH3 Pro manual 06/2026 Table 3-2"
              : "PDF p.33/p.35 motor data; code per Siemens 1PH3 Pro manual 06/2026 Table 3-2; shaft digit per Siemens product listings",
            desc: `SIMOTICS M-1PH3 Pro SH${pick.sh}, ${pick.kw} kW, nn = ${pick.n} rpm, nmax = ${pick.nmax} rpm, ${enc === "H" ? "BiSS-C absolute 21-bit" : "TTL incremental 2500 ppr"} encoder, ${shaft === "2" ? "shaft with key (half-key balancing)" : "plain shaft"}${known ? ` – replaces 1PH1 ${known.kw} kW ${known.n} rpm SH${known.sh}` : ""}`,
            note:
              `Shaft: ${shaft === "2" ? "with key, half-key balancing (digit 2) – the 1PH1 had a feather key" : "plain shaft (digit 0) – like the 1PH1"}; the other variant is …-${shaft === "2" ? "0" : "2"}${pick.sfx}. Full-key balancing (PDF p.33) is a third variant whose digit is not verified. ` +
              (pick.enc === "HL"
                ? `Encoder letter: L = TTL (like the 1PH1), H = BiSS-C absolute – both exist for this size. `
                : "") +
              (alt ? `Other ${pick.kw} kW variants: ${alt}.` : ""),
          }),
        );
        const drv = spindleDriveFor(pick);
        out.push(
          line({
            mlfb: drv.mlfb,
            desc: `SINAMICS S200 Spindle drive ${drv.fs}, ${drv.a}, PROFINET – for 1PH3 Pro SH${pick.sh} ${pick.kw} kW`,
            qty: q,
            orig: "(from spindle motor)",
            origDesc: m,
            origQty: q,
            cls: "pdf",
            grp: "Spindle",
            src: "PDF p.35",
          }),
        );
      } else {
        out.push(
          line({
            mlfb: "1PH3 Pro – select",
            desc: `SIMOTICS M-1PH3 Pro spindle motor: rated power${kw ? "" : " not found in the 808D description"}${kw ? ` ${kw} kW is not in the 1PH3 Pro table (3.7 / 5.5 / 7.5 / 9 / 11 / 12 / 15 kW)` : ""} – pick from PDF p.33/p.35`,
            qty: q,
            ...o,
            cls: "review",
            grp: "Spindle",
            src: "PDF p.33/p.35",
          }),
        );
        out.push(
          line({
            mlfb: "S200 Spindle – select",
            desc: "SINAMICS S200 Spindle drive – pick from PDF p.35 once the motor is fixed",
            qty: q,
            orig: m,
            origDesc: r.desc,
            origQty: q,
            cls: "review",
            grp: "Spindle",
            src: "PDF p.35",
          }),
        );
      }
      out.push(brakingResistorLine(q, true));
      spindleQty += q;
      pnDriveCount += q;
      lastPh3 = pick || null;
      continue;
    }

    // --- 808D (basic) V60 setpoint cable / 1FL5 motors: no S200 rule ---
    if (/^6FC5548-0BA00/.test(m) || /^1FL5/.test(m)) {
      out.push(
        line({
          mlfb: NO_ARTICLE,
          desc: `${m} belongs to the SINUMERIK 808D (basic) with SINAMICS V60 / 1FL5 (NC 81.1). There is no S200 counterpart for V60 — re-select the axis as 1FL2 + S200 by torque and speed.`,
          qty: q,
          ...o,
          cls: "none",
          grp: /^1FL5/.test(m) ? "Feed axes" : "Feed-axis cables",
          src: "NC 81.1 2018 – 808D basic scope",
        }),
      );
      continue;
    }

    // --- Analog spindle setpoint cable ---
    if (/^6FC5548-0BA05/.test(m)) {
      analogSpindle = true;
      out.push(
        line({
          mlfb: NO_ARTICLE,
          desc: "Analog spindle setpoint (±10 V) is wired directly to the PPU 26x.5 analog output terminals; optional TTL spindle encoder to the PPU encoder input. No dedicated cable article.",
          qty: q,
          ...o,
          cls: "replaced",
          grp: "Spindle",
          src: "PDF p.11, p.13, p.16",
        }),
      );
      continue;
    }

    // --- 1PH1 spindle encoder cables (NC 81.1: 2CT30 = incremental, 2DB30 = absolute encoder)
    //     → 1PH3 Pro with S200 Spindle (1PH3 Pro manual 06/2026 §3.2.4) ---
    if (/^6FX3002-2(CT|DB)30-/.test(m)) {
      const len = m.split("-")[2];
      const ok = PH3_ENC_CABLE.includes(len);
      out.push(
        line({
          mlfb: `6FX3502-2XB13-${len}`,
          desc: `Encoder cable pre-assembled for 1PH3 Pro (BiSS-C or TTL) with S200 Spindle, MOTION-CONNECT 350, ${LEN[len] || len}`,
          qty: q,
          ...o,
          cls: ok ? "verified" : "review",
          grp: "Spindle",
          src: ok
            ? "Outside PDF – family and length listed in the Siemens 1PH3 Pro manual 06/2026"
            : `Outside PDF – family in the 1PH3 Pro manual, but ${LEN[len] || len} is not among its listed lengths (${PH3_ENC_CABLE.map((c) => LEN[c]).join(", ")})`,
        }),
      );
      continue;
    }
    if (/^6FX5008-1BB[2-6]1-/.test(m)) {
      const pick = lastPh3;
      const XS: Record<string, string> = { "1BB21": "4x2.5", "1BB31": "4x4", "1BB51": "4x10", "1BB61": "4x16" };
      const code = pick ? `6FX5008-${pick.cable}-1DA0` : null;
      out.push(
        line({
          mlfb: code || "6FX5008-1BB?1-1DA0",
          desc: `Power cable for 1PH3 Pro, MOTION-CONNECT 500, sold as 30 m raw length without connectors (terminal-box motor)${pick ? ` – ${XS[pick.cable]} mm² for 1PH3${pick.frame} ${pick.kw} kW (Table 3-2)` : " – cross-section 4x2.5 / 4x4 / 4x10 / 4x16 mm² (1BB21 / 1BB31 / 1BB51 / 1BB61) per motor current; no spindle motor line preceded this cable"}. Replaces ${m}.`,
          qty: q,
          ...o,
          cls: code ? "verified" : "review",
          grp: "Spindle",
          src: "Outside PDF – cross-section: 1PH3 Pro manual 06/2026 Table 3-2; article: NC 81.1 (same MC500 raw cables as for 1PH1)",
          note: "Raw cable: order length and glands per installation; the 808D pre-assembled length no longer applies.",
        }),
      );
      continue;
    }

    // --- Analog spindle inverter (G120C etc.) and its operator panel: kept, outside the PDF ---
    if (/^6SL3210-1[KP]E/.test(m) || /^6SL3255-0AA00/.test(m)) {
      analogSpindle = true;
      out.push(
        line({
          mlfb: m,
          desc: `${r.desc || m} – analog spindle inverter${/^6SL3255/.test(m) ? " operator panel" : ""} kept and driven from the PPU analog output (PDF p.11 "Inverter"). Not a PDF product – reuse the existing article or move the spindle to S200 Spindle + 1PH3 Pro (PDF p.35).`,
          qty: q,
          ...o,
          cls: "review",
          grp: "Spindle",
          src: "Outside PDF – existing article reused",
        }),
      );
      continue;
    }

    // --- V70 bus cables → PROFINET cords ---
    if (/^6FC5548-0BA2/.test(m)) {
      const last = m.split("-")[2] || "";
      const lm = (r.desc || "").match(/(\d+(?:[.,]\d+)?)\s*m\b/i);
      const L = lm
        ? parseFloat(lm[1].replace(",", "."))
        : last === "1AA3"
          ? 0.35
          : LEN[last]
            ? parseFloat(LEN[last])
            : 3;
      const cord = PN_CORDS.find((c) => c[0] >= L) || PN_CORDS[PN_CORDS.length - 1];
      const listed = cord[3];
      out.push(
        line({
          mlfb: cord[1],
          desc: `Industrial Ethernet TP Cord RJ45/RJ45 4x2, pre-assembled, ${cord[2]} (PROFINET) – ${/PPU/i.test(r.desc) ? "PPU → first S200" : "S200 → S200 daisy chain"}`,
          qty: q,
          ...o,
          cls: listed ? "verified" : "review",
          grp: "PROFINET",
          src: listed
            ? "Outside PDF – PDF p.47 requires PN cables; article listed in catalog IK PI 2015"
            : "Outside PDF – PDF p.47 requires PN cables; this length is seen only in Siemens Industry Mall / distributor listings",
          note: `Nearest length at or above the ${L} m V70 cable.${listed ? "" : " Confirm the article in SiePortal before ordering."}`,
        }),
      );
      continue;
    }

    // --- Motor cables 1FL6 → 1FL2 (MC300 → MC350). NC 81.1 lists 5CL01/5CL11 (power),
    //     2CT10 (incremental encoder), 2DB10 (absolute encoder), 5BL02 (brake) for V70. ---
    const cm = m.match(/^6FX3002-(5CL0[12]|5CL1[12]|2CT1[02]|2DB1[02]|2DB2[02]|5BL0[23])-(1[A-D][A-H]0)$/);
    if (cm) {
      const typ = cm[1];
      const len = cm[2];
      const Lt = LEN[len] || len;
      let fam: string;
      let d: string;
      if (/^5CL/.test(typ)) {
        // Cross-section by the converted 1FL2 motor, not by the 808D cable:
        // the SH45/65 cable (4×0.75) also has the smaller motor connector.
        const need = new Map<string, { qty: number; sh: number[] }>();
        for (const mo of fl2Motors) {
          const f = powerFamFor(mo.sh, mo.kw);
          const e = need.get(f) ?? { qty: 0, sh: [] };
          e.qty += mo.qty;
          if (!e.sh.includes(mo.sh)) e.sh.push(mo.sh);
          need.set(f, e);
        }
        const totalMotors = [...need.values()].reduce((a, e) => a + e.qty, 0);
        if (need.size > 0) {
          const oldXs = typ === "5CL01" ? "4x0.75" : typ === "5CL02" ? "4x1.5" : "4x2.5";
          for (const [f, e] of need) {
            const xs = f === "5CL01" ? "4x0.75" : f === "5CL02" ? "4x1.5" : "4x2.5";
            const shTxt = e.sh.map((x) => `SH${x}`).join("/");
            const n = `6FX3502-${f}-${len}`;
            const verifiedLens = MC350_VERIFIED[f] || [];
            const ok = verifiedLens.includes(len);
            const confirmed = verifiedLens.map((c) => LEN[c] || c).join(", ");
            out.push(
              line({
                mlfb: n,
                desc: `Power cable pre-assembled ${xs} mm² for motor S-1FL2 ${shTxt} with S200, MOTION-CONNECT 350, ${Lt}`,
                qty: need.size === 1 ? q : e.qty,
                ...o,
                cls: ok ? "verified" : "review",
                grp: "Feed-axis cables",
                src: ok
                  ? "Outside PDF – cross-section per D 37.1 motor table; exact code seen in Siemens listing"
                  : `Outside PDF – cable family exists, but this ${Lt} variant was not found in any listing (confirmed lengths: ${confirmed})`,
                note:
                  (ok ? "" : "Confirm the exact article in TIA Selection Tool / SiePortal before ordering. ") +
                  `${xs} mm² is what D 37.1 pairs with 1FL2 ${shTxt}${xs !== oldXs ? ` (the 808D cable was ${oldXs} mm²; the connector differs too)` : ""}.` +
                  (f !== "5CL01" ? " SH90: 4x1.5 up to 3.5 kW, 4x2.5 above – confirm against motor current in TIA Selection Tool." : "") +
                  (need.size > 1 && totalMotors !== q ? ` Split by motor: ${totalMotors} motors vs ${q} cables in the 808D BOM – check quantities.` : ""),
              }),
            );
          }
          continue;
        }
        fam = typ === "5CL11" ? "5CL02" : typ;
        d = `Power cable pre-assembled ${fam === "5CL01" ? "4x0.75" : fam === "5CL02" ? "4x1.5" : "4x2.5"} mm² for motor S-1FL2 SH45/65/90 with S200, MOTION-CONNECT 350, ${Lt}`;
      } else if (/^(2CT|2DB)/.test(typ)) {
        fam = "2XB12";
        d = `Encoder cable pre-assembled 3x2x0.25 for motor S-1FL2 SH45/65/90 with S200 (absolute encoder), MOTION-CONNECT 350, ${Lt}`;
      } else {
        fam = "5BL03";
        d = `Brake cable pre-assembled 2x0.75 mm² for motor S-1FL2 SH45/65/90 with S200, MOTION-CONNECT 350, ${Lt}`;
      }
      const n = `6FX3502-${fam}-${len}`;
      const verifiedLens = MC350_VERIFIED[fam] || [];
      const ok = verifiedLens.includes(len);
      const confirmed = verifiedLens.map((c) => LEN[c] || c).join(", ");
      out.push(
        line({
          mlfb: n,
          desc: d,
          qty: q,
          ...o,
          cls: ok ? "verified" : "review",
          grp: "Feed-axis cables",
          src: ok
            ? "Outside PDF – PDF p.47 lists the cable types; exact code seen in Siemens listing"
            : `Outside PDF – cable family exists, but this ${Lt} variant was not found in any listing (confirmed lengths: ${confirmed})`,
          note:
            (ok ? "" : "Confirm the exact article in TIA Selection Tool / SiePortal before ordering. ") +
            (/^5CL/.test(typ)
              ? "No 1FL6 motor line in this BOM, so the 808D cross-section was kept; D 37.1 pairs 4x0.75 with SH45/65 and 4x1.5 / 4x2.5 with SH90 – confirm against the motor."
              : ""),
        }),
      );
      continue;
    }
    if (/^6FX3002-/.test(m)) {
      out.push(
        line({
          mlfb: NO_ARTICLE,
          desc: `Cable ${m} (${r.desc}) – no MOTION-CONNECT 350 rule; select the S200 equivalent manually`,
          qty: q,
          ...o,
          cls: "review",
          grp: "Feed-axis cables",
          src: "Outside PDF",
        }),
      );
      continue;
    }

    // --- Handwheels / other hardware kept ---
    if (/^6FC9320-5DB/.test(m)) {
      out.push(
        line({
          mlfb: m,
          desc: `${r.desc || "Handwheel"} – electronic handwheel can be reused (PPU 26x.5 has 2 handwheel inputs, PDF p.13)`,
          qty: q,
          ...o,
          cls: "review",
          grp: "Other",
          src: "Outside PDF – reuse existing article",
        }),
      );
      continue;
    }
    if (/^6EP/.test(m)) {
      out.push(
        line({
          mlfb: m,
          desc: `${r.desc || "SITOP power supply"} – 24 V supply carried over (PDF p.47 lists SITOP in the package)`,
          qty: q,
          ...o,
          cls: "review",
          grp: "Other",
          src: "Outside PDF – reuse existing article",
        }),
      );
      continue;
    }

    // --- Unknown ---
    out.push(
      line({
        mlfb: NO_ARTICLE,
        desc: `No conversion rule for ${m}${r.desc ? " – " + r.desc : ""}`,
        qty: q,
        ...o,
        cls: "review",
        grp: "Other",
        src: "Not covered by the PDF",
      }),
    );
  }

  // --- configuration-level checks ---
  // analog spindle counted once even if setpoint cable + inverter + BOP are all listed
  const spindles = spindleQty + (analogSpindle ? 1 : 0);
  const axes = feedMotorQty + spindles;
  if (feedMotorQty) {
    const spindleText = spindles
      ? `Spindles: ${spindles} (${[
          spindleQty ? `${spindleQty} × S200 Spindle + 1PH3 Pro` : "",
          analogSpindle ? "1 × analog via third-party inverter" : "",
        ]
          .filter(Boolean)
          .join(", ")}).`
      : "No spindle recognised.";
    notes.push([
      "info",
      `Feed axes: ${feedMotorsListed.join(", ")} → ${feedMotorQty} S200 drives. ${spindleText} Total ${axes} axes/spindles – 828D Smart maximum is ${MAX_AXES_828D_SMART} (PDF p.14).`,
    ]);
  }
  if (axes > MAX_AXES_828D_SMART) {
    notes.push([
      "crit",
      `${axes} axes/spindles exceed the 828D Smart limit of ${MAX_AXES_828D_SMART} – a standard SINUMERIK 828D is needed (PDF p.7/p.14).`,
    ]);
  }
  if (v70Qty && v70Qty !== feedMotorQty + spindleQty) {
    notes.push([
      "warn",
      `808D list has ${v70Qty} V70 drives but ${feedMotorQty + spindleQty} motors – check the motor lines; S200 drives are counted from motors.`,
    ]);
  }
  if (axes) {
    notes.push([
      "info",
      `Axis licences carried over from the 808D list: ${fullAxisQty} × axis/spindle (6FC5800-0AC20-0YH0), ${posAxisQty} × positioning axis (6FC5800-0AC30-0YH0). The number of axes included in the 828D Smart SD-card basic scope is not stated in the PDF – confirm with Siemens that ${axes} axes/spindles are covered.`,
    ]);
  }
  if (!out.some((l) => /^6FC5370/.test(l.mlfb))) {
    notes.push([
      "warn",
      "No 808D PPU found in this list – add the 828D Smart PPU and SD card manually (6FC5370-2AA50-0AA0 / 6FC5835-xGY50-0YA0).",
    ]);
  }
  const assumed = rows.filter((r) => r.qtyAssumed).length;
  if (assumed) notes.push(["warn", `Quantity not found for ${assumed} line(s) – 1 assumed.`]);
  if (pnDriveCount && !out.some((l) => /^6XV/.test(l.mlfb))) {
    notes.push([
      "info",
      `PROFINET cabling not in the 808D list: you need 1 cord PPU → S200 and ${Math.max(pnDriveCount - 1, 0)} cord(s) S200 → S200 (PDF p.47), e.g. 6XV1870-3QH20 (2 m, PPU → S200) and 6XV1870-3QE50 (0.5 m, S200 → S200) – both listed in catalog IK PI.`,
    ]);
  }
  if (spindleQty) {
    notes.push([
      "info",
      "S200 Spindle drive requires an external braking resistor (3rd party, PDF p.47). A 2nd (direct) spindle encoder is optional (PDF p.47).",
    ]);
  }
  notes.push([
    "ok",
    "24 V DC supply (SITOP), line filter/reactor, contactor and STO wiring are project-specific and not part of the 808D list – see PDF p.47.",
  ]);

  // order lines by group, then PPU → SD card → MCP → rest inside a group
  const rank = (l: ResultLine) =>
    /^6FC5370/.test(l.mlfb) ? 0 : /^6FC5835/.test(l.mlfb) ? 1 : /^6FC5303/.test(l.mlfb) ? 2 : 5;
  out.sort(
    (a, b) => GROUP_ORDER.indexOf(a.grp) - GROUP_ORDER.indexOf(b.grp) || rank(a) - rank(b),
  );
  return { lines: out, notes, tech, orient, axes };
}

/** Lines that carry no article number (placeholders) are excluded from counts. */
export function isSelectedLine(l: ResultLine): boolean {
  return l.mlfb !== NO_ARTICLE;
}

export function needsReview(l: ResultLine): boolean {
  return l.cls === "review" || l.cls === "none";
}

export { NO_ARTICLE };
