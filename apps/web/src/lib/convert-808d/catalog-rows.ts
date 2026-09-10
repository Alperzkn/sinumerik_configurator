/**
 * Flattened view of everything the converter can select — rendered as the
 * "828D Smart catalogue" table so the user can audit the rule base.
 */

import {
  CAT,
  FL6,
  LEN,
  MC350_LABEL,
  MC350_VERIFIED,
  OPTIONS,
  PH3,
  PH3_EXAMPLES,
  S200,
  SPINDLE_DRIVES,
} from "./catalog";

export interface CatalogRow {
  article: string;
  desc: string;
  src: string;
}

export function buildCatalogRows(): CatalogRow[] {
  const rows: CatalogRow[] = [];
  for (const item of Object.values(CAT)) rows.push({ article: item.mlfb, desc: item.desc, src: item.src });
  for (const k in OPTIONS) rows.push({ article: `6FC5800-${k}-0YH0`, desc: `Option: ${OPTIONS[k]}`, src: "PDF p.15" });

  const seen = new Set<string>();
  for (const kw in S200) {
    const d = S200[kw];
    if (seen.has(d.mlfb)) continue;
    seen.add(d.mlfb);
    const kws = Object.keys(S200).filter((x) => S200[x].mlfb === d.mlfb).join(" / ");
    rows.push({
      article: d.mlfb,
      desc: `SINAMICS S200 PN 400 V ${d.fs}, ${d.a} – for 1FL2 ${kws} kW`,
      src: "PDF p.27",
    });
  }
  for (const d of SPINDLE_DRIVES) {
    rows.push({
      article: d.mlfb,
      desc: `SINAMICS S200 Spindle ${d.fs}, ${d.a}, SH${d.sh} 1PH3 Pro up to ${d.maxKw} kW`,
      src: "PDF p.35",
    });
  }
  for (const k in FL6) {
    const d = FL6[k];
    rows.push({
      article: `${d.pre}-${d.p}A${d.s}[0|1]1-[0|1]MB0`,
      desc: `SIMOTICS S-1FL2 HI SH${d.sh} ${d.kw} kW / ${d.nm} Nm / ${d.n} rpm – [brake 0/1] [shaft plain 0 / key 1] – replaces 1FL6${k}`,
      src: "PDF p.25/p.27 data; code pattern p.48",
    });
  }
  for (const k in PH3_EXAMPLES) rows.push({ article: k, desc: PH3_EXAMPLES[k], src: "PDF p.48" });
  for (const x of PH3) {
    rows.push({
      article: `1PH3${x.frame}-1[${x.enc.split("").join("|")}]${x.wind}12-[0|2]${x.sfx}`,
      desc: `SIMOTICS M-1PH3 Pro SH${x.sh}, ${x.kw} kW, ${x.n} / ${x.nmax} rpm – [H BiSS-C | L TTL] – [0 plain shaft | 2 key, half-key balancing]`,
      src: "PDF p.33/p.35 data; code per Siemens 1PH3 Pro manual 06/2026 Table 3-2; shaft digit per Siemens listings",
    });
  }
  rows.push({
    article: "6FX3502-2XB13-[1AD0|1AF0|1AH0|1BA0|1BF0|1CA0]",
    desc: "Encoder cable 1PH3 Pro (BiSS/TTL) with S200 Spindle, MOTION-CONNECT 350, 3–20 m",
    src: "Outside PDF – Siemens 1PH3 Pro manual 06/2026",
  });
  rows.push({
    article: "6FX5008-1BB21/31/51/61-1DA0",
    desc: "Power cable 1PH3 Pro, MOTION-CONNECT 500 raw 30 m, 4x2.5 / 4x4 / 4x10 / 4x16 mm²",
    src: "Outside PDF – Siemens 1PH3 Pro manual 06/2026",
  });
  for (const f in MC350_VERIFIED) {
    const lens = MC350_VERIFIED[f];
    rows.push({
      article: `6FX3502-${f}-[${lens.join("|")}]`,
      desc: `${MC350_LABEL[f]} for S-1FL2 SH45/65/90 with S200, MOTION-CONNECT 350 – confirmed lengths: ${lens.map((c) => LEN[c]).join(", ")}; other lengths are flagged for confirmation`,
      src: "Outside PDF – allowed, listed codes verified",
    });
  }
  rows.push({
    article: "6XV1870-3QE30 / 3QE50 / 3QH10 / 3QH20 / 3QH30 / 3QH60 / 3QN10 / 3QN20 / 3QN30",
    desc: "Industrial Ethernet TP Cord RJ45/RJ45 4x2 Cat 6A, pre-assembled 0.3–30 m (PROFINET)",
    src: "Outside PDF – allowed, every code verified",
  });
  return rows;
}
