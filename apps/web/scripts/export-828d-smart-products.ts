/**
 * Export every 828D Smart product the configurator knows into a categorized
 * Excel workbook (docs/828D_Smart_products.xlsx). Run from the repo root:
 *
 *   npx tsx --tsconfig apps/web/tsconfig.json apps/web/scripts/export-828d-smart-products.ts
 */
import * as XLSX from "xlsx";
import { catalogBundle } from "@/data/catalog-bundle";
import { MOTOR_SPECS, S200_CONVERTER_SPECS } from "@/lib/validation/drive-system-rules";
import { CAT, OPTIONS, OPTION_NONE, FL6, S200, PH3, PH3_EXAMPLES, MC350_VERIFIED, MC350_LABEL, LEN, PH3_ENC_CABLE, PN_CORDS, SPINDLE_DRIVES } from "@/lib/convert-808d/catalog";

type Row = { Category: string; Subcategory: string; "Article No.": string; Name: string; "Key data": string; Source: string; Notes: string };
const rows: Row[] = [];
const add = (r: Row) => rows.push(r);
const smartCu = (c: Record<string, unknown>) => "PPU_260_5" in c || "PPU_261_5" in c;

// 1. CNC hardware
for (const cu of catalogBundle.controlUnits.filter((c) => c.family === "828d_smart")) {
  add({ Category: "1 CNC hardware", Subcategory: "PPU", "Article No.": cu.articleNumber, Name: cu.name, "Key data": `${cu.orientation ?? ""} · max ${cu.maxAxesSpindles} axes/spindles · ${cu.driveInterface ?? "PROFINET"}`, Source: "NC 82 ch.2 09/2026; 828D Smart details p.12/p.48", Notes: cu.description });
}
// 2. System software
for (const sw of catalogBundle.cncSoftware.filter((s) => s.swVersion === "24x")) {
  add({ Category: "2 System software", Subcategory: "SD card SW 24x", "Article No.": sw.articleNumber, Name: sw.description, "Key data": `technology ${sw.technology ?? ""} · SW ${sw.swVersion}`, Source: "NC 82 ch.2; 828D Smart details p.48", Notes: "" });
}
// 3. Software options (828D Smart column of the details PDF p.15)
const opt828 = catalogBundle.softwareOptions.filter((o) => o.family === "828d");
for (const [key, name] of Object.entries(OPTIONS)) {
  const o = opt828.find((x) => x.orderCode === key);
  add({ Category: "3 Software options", Subcategory: "Option (0YH0 licence)", "Article No.": `6FC5800-${key}-0YH0`, Name: o?.name ?? name, "Key data": key, Source: "828D Smart details p.15; NC 82 ch.2", Notes: o?.description ?? "" });
}
for (const [key, why] of Object.entries(OPTION_NONE)) {
  add({ Category: "3 Software options", Subcategory: "NOT available on 828D Smart", "Article No.": `6FC5800-${key}-…`, Name: why, "Key data": key, Source: "828D Smart details p.15", Notes: "808D option with no Smart equivalent" });
}
// 4. Operator panels / HMI
for (const h of catalogBundle.hmiComponents.filter((x) => x.id.startsWith("hmi828-") && smartCu(x.compatibility as Record<string, unknown>))) {
  add({ Category: "4 HMI / operating", Subcategory: h.category, "Article No.": h.articleNumber, Name: h.name, "Key data": h.screenSize ? `${h.screenSize}"` : "", Source: "NC 82 ch.2", Notes: h.description });
}
// 5. Drives
for (const [art, s] of Object.entries(S200_CONVERTER_SPECS)) {
  const d = catalogBundle.driveComponents.find((x) => x.articleNumber === art);
  add({ Category: "5 Drives (SINAMICS S200)", Subcategory: s.spindle ? "S200 Spindle converter" : "S200 PN 400 V feed converter", "Article No.": art, Name: d?.name ?? art, "Key data": `${s.power} kW · ${s.current} A · ${s.frame}`, Source: "828D Smart details p.27/p.35; D 37.1 11/2025", Notes: s.spindle ? "External braking resistor mandatory (3rd party)" : "Option T80, STO, integrated braking resistor" });
}
add({ Category: "5 Drives (SINAMICS S200)", Subcategory: "Accessory", "Article No.": "3rd party", Name: "External braking resistor for S200 Spindle converter", "Key data": "sized per operating instructions", Source: "828D Smart details p.47", Notes: "Mandatory per spindle converter" });
// 6. Motors
for (const [trunk, m] of Object.entries(MOTOR_SPECS).filter(([k]) => k.startsWith("1FL2"))) {
  add({ Category: "6 Motors", Subcategory: "SIMOTICS S-1FL2 HI 400 V feed motor", "Article No.": `${trunk}[0|1]1-[0|1]MB0`, Name: `${m.family} SH${m.shaftHeight} ${m.ratedPower}`, "Key data": `${m.ratedTorque} · ${m.ratedSpeed} · ${m.ratedCurrent} · pairs with ${m.motorModule}`, Source: "828D Smart details p.25/p.27; D 37.1", Notes: "digit 12: brake 0/1 · digit 14: shaft 0 plain / 1 key · M = 21+12 bit absolute encoder · B = metal connector" });
}
for (const v of PH3) {
  for (const enc of v.enc.split("")) {
    for (const shaft of ["0", "2"]) {
      const code = `1PH3${v.frame}-1${enc}${v.wind}12-${shaft}${v.sfx}`;
      add({ Category: "6 Motors", Subcategory: "SIMOTICS M-1PH3 Pro spindle motor", "Article No.": code, Name: `1PH3 Pro SH${v.sh} ${v.kw} kW, ${v.n} / ${v.nmax} rpm, ${enc === "H" ? "BiSS-C absolute" : "TTL incremental"} encoder, ${shaft === "2" ? "shaft with key (half-key balancing)" : "plain shaft"}`, "Key data": `${v.kw} kW · nN ${v.n} · nmax ${v.nmax} · power cable 6FX5008-${v.cable}`, Source: PH3_EXAMPLES[code] ? "828D Smart details p.48 (printed)" : "828D Smart details p.33/p.35; 1PH3 Pro manual 06/2026 Table 3-2; shaft digit per Siemens Industry Mall", Notes: PH3_EXAMPLES[code] ? "Complete article printed in the PDF" : "Composed from the catalog pattern" });
    }
  }
}
// 7. Cables
for (const [fam, lens] of Object.entries(MC350_VERIFIED)) {
  for (const len of lens) {
    add({ Category: "7 Cables", Subcategory: `MOTION-CONNECT 350 · ${MC350_LABEL[fam]}`, "Article No.": `6FX3502-${fam}-${len}`, Name: `${MC350_LABEL[fam]} mm², ${LEN[len]} — for 1FL2 with S200`, "Key data": fam === "5CL01" ? "SH45 / SH65" : fam === "5CL02" ? "SH90 ≤ 3.5 kW" : fam === "5CL12" ? "SH90 > 3.5 kW" : "", Source: "D 37.1 (family); length code seen in Siemens listings", Notes: "" });
  }
}
for (const len of PH3_ENC_CABLE) add({ Category: "7 Cables", Subcategory: "MOTION-CONNECT 350 · 1PH3 Pro encoder", "Article No.": `6FX3502-2XB13-${len}`, Name: `Encoder cable for 1PH3 Pro (BiSS-C / TTL) with S200 Spindle, ${LEN[len]}`, "Key data": "", Source: "1PH3 Pro manual 06/2026 §3.2.4", Notes: "" });
for (const [c, xs] of Object.entries({ "1BB21": "4x2.5", "1BB31": "4x4", "1BB51": "4x10", "1BB61": "4x16" })) add({ Category: "7 Cables", Subcategory: "MOTION-CONNECT 500 · 1PH3 Pro power (raw)", "Article No.": `6FX5008-${c}-1DA0`, Name: `Power cable ${xs} mm², 30 m raw length, no connectors (terminal-box motor)`, "Key data": "", Source: "1PH3 Pro manual Table 3-2; NC 81.1", Notes: "Cross-section per 1PH3 frame/power" });
for (const [m, art, label, listed] of PN_CORDS) add({ Category: "7 Cables", Subcategory: "PROFINET cord", "Article No.": art, Name: `Industrial Ethernet TP Cord RJ45/RJ45 4x2, ${label}`, "Key data": `${m} m`, Source: listed ? "IK PI 2015" : "Siemens listings only", Notes: "PPU → first S200, then S200 → S200 daisy chain" });
// 8. Converter mapping tables
for (const [size, d] of Object.entries(FL6)) add({ Category: "8 808D → Smart mapping", Subcategory: "1FL6 → 1FL2", "Article No.": `1FL6${size}… → ${d.pre}-${d.p}A${d.s}`, Name: `${d.kw} kW ${d.nm} Nm SH${d.sh}`, "Key data": `S200 drive ${S200[String(d.kw)].mlfb}`, Source: "828D Smart details p.25/p.27, p.48", Notes: "" });
for (const s of SPINDLE_DRIVES) add({ Category: "8 808D → Smart mapping", Subcategory: "1PH3 Pro → S200 Spindle", "Article No.": s.mlfb, Name: `S200 Spindle ${s.fs} ${s.a}`, "Key data": `≤ ${s.maxKw} kW, SH${s.sh}`, Source: "828D Smart details p.35", Notes: "" });
for (const [k, v] of Object.entries(CAT)) add({ Category: "8 808D → Smart mapping", Subcategory: "Converter fixed products", "Article No.": v.mlfb, Name: v.desc, "Key data": k, Source: v.src, Notes: "" });

const wb = XLSX.utils.book_new();
const readme = [
  ["SINUMERIK 828D Smart — product list known to the configurator"],
  ["Generated 2026-09-16 from apps/web/src/data, lib/validation/drive-system-rules.ts and lib/convert-808d/catalog.ts"],
  [""],
  ["Sheet", "Content"],
  ["All products", "Every item with Category / Subcategory / Article / Name / Key data / Source / Notes"],
  ["1 CNC hardware", "PPU 260.5 / 261.5"],
  ["2 System software", "SD cards SW 24x (T / M / G)"],
  ["3 Software options", "Options available on 828D Smart (details PDF p.15) and 808D options with no Smart equivalent"],
  ["4 HMI / operating", "MCP 1200U / 1500U / 398C, MCP interface, handwheels, handheld"],
  ["5 Drives (SINAMICS S200)", "S200 PN 400 V feed converters and S200 Spindle converters"],
  ["6 Motors", "1FL2 HI 400 V feed motors (trunk + digit legend) and every 1PH3 Pro variant"],
  ["7 Cables", "MOTION-CONNECT 350 / 500 cables and PROFINET cords with verified lengths"],
  ["8 808D → Smart mapping", "Tables the converter uses to translate an 808D list"],
  [""],
  ["Article numbers marked 'Composed' follow the catalog code pattern; confirm in SiePortal / TIA Selection Tool before ordering."],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), "README");
const all = XLSX.utils.json_to_sheet(rows);
all["!cols"] = [{ wch: 24 }, { wch: 34 }, { wch: 28 }, { wch: 70 }, { wch: 46 }, { wch: 44 }, { wch: 60 }];
XLSX.utils.book_append_sheet(wb, all, "All products");
for (const cat of [...new Set(rows.map((r) => r.Category))]) {
  const sh = XLSX.utils.json_to_sheet(rows.filter((r) => r.Category === cat).map(({ Category: _c, ...rest }) => rest));
  sh["!cols"] = [{ wch: 34 }, { wch: 28 }, { wch: 70 }, { wch: 46 }, { wch: 44 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, sh, cat.replace(/[\/\\?*\[\]:→]/g, "-").slice(0, 31));
}
const out = "/Users/alperzkn/Documents/dev/sinumerik_configurator/docs/828D_Smart_products.xlsx";
XLSX.writeFile(wb, out);
const counts: Record<string, number> = {};
for (const r of rows) counts[r.Category] = (counts[r.Category] ?? 0) + 1;
console.log(out, rows.length, counts);
