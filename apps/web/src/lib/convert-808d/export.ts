/**
 * Export helpers for the 808D → 828D Smart converter:
 * Excel workbook (one sheet per configuration + summary), TSV for the
 * clipboard, and the empty 808D input template.
 *
 * `xlsx` is imported lazily so the converter page doesn't pull the
 * library into the initial bundle.
 */

import type { Conversion, LineBasis, ResultLine } from "./types";
import { isSelectedLine, needsReview } from "./engine";

export const BASIS_LABEL: Record<LineBasis, string> = {
  pdf: "PDF",
  derived: "Derived from PDF pattern",
  verified: "Outside PDF – verified",
  review: "Review",
  none: "No equivalent",
  replaced: "Superseded",
};

export function safeName(s: string): string {
  return s.replace(/[^\w\-]+/g, "_").slice(0, 60);
}

export function selectedLineCount(c: Conversion): number {
  return c.result.lines.filter(isSelectedLine).length;
}

export function reviewCount(c: Conversion): number {
  return c.result.lines.filter(needsReview).length;
}

function qtyCell(l: ResultLine): number | "" {
  return isSelectedLine(l) ? l.qty : "";
}

/** Tab-separated table for the clipboard (paste straight into Excel). */
export function conversionToTsv(c: Conversion): string {
  const header = "828D Smart article\tQty\tDescription\tBasis\tSource\tReplaces (808D)";
  const body = c.result.lines.map((l) =>
    [l.mlfb, qtyCell(l), l.desc, l.cls, l.src, l.orig].join("\t"),
  );
  return [header, ...body].join("\n");
}

type XlsxModule = typeof import("xlsx");

function resultSheet(XLSX: XlsxModule, c: Conversion) {
  const aoa: unknown[][] = [
    [
      "828D Smart article",
      "Qty",
      "Description",
      "Basis",
      "Source",
      "Replaces (808D)",
      "808D qty",
      "808D description",
      "Note",
    ],
  ];
  for (const l of c.result.lines) {
    aoa.push([
      l.mlfb,
      qtyCell(l),
      l.desc,
      BASIS_LABEL[l.cls] ?? l.cls,
      l.src,
      l.orig,
      l.origQty ?? "",
      l.origDesc || "",
      l.note || "",
    ]);
  }
  aoa.push([]);
  aoa.push(["Notes"]);
  for (const [k, t] of c.result.notes) aoa.push([k.toUpperCase(), t]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 28 },
    { wch: 5 },
    { wch: 70 },
    { wch: 22 },
    { wch: 34 },
    { wch: 22 },
    { wch: 8 },
    { wch: 40 },
    { wch: 50 },
  ];
  return ws;
}

/** Build and download an .xlsx with one sheet per conversion. */
export async function exportConversionsXlsx(list: Conversion[], filename: string): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  if (list.length > 1) {
    const sum: unknown[][] = [
      ["Configuration", "Technology", "PPU", "Axes/spindles", "828D Smart lines", "Lines to review"],
    ];
    for (const c of list) {
      sum.push([
        c.name,
        c.result.tech === "T" ? "Turning" : "Milling",
        c.result.orient === "V" ? "Vertical" : "Horizontal",
        c.result.axes,
        selectedLineCount(c),
        reviewCount(c),
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(sum);
    ws["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
  }
  const used = new Set<string>();
  for (const c of list) {
    const base = safeName(c.name).slice(0, 28) || "Config";
    let key = base;
    let i = 2;
    while (used.has(key)) key = `${base.slice(0, 25)}_${i++}`;
    used.add(key);
    XLSX.utils.book_append_sheet(wb, resultSheet(XLSX, c), key);
  }
  XLSX.writeFile(wb, filename);
}

/** Download the empty 808D input template with example rows. */
export async function downloadInputTemplate(): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const aoa: unknown[][] = [
    ["Configuration", "Article No.", "Qty", "Description"],
    ["Example – VMC 850", "6FC5370-2AM03-0AA0", 1, "SINUMERIK 808D ADVANCED M PPU 161.3 horizontal"],
    ["Example – VMC 850", "6FC5303-0AF35-0AA0", 1, "SINUMERIK 808D MCP horizontal, English"],
    ["Example – VMC 850", "1FL6064-1AC61-2AA1", 2, "SIMOTICS S-1FL6 1.5 kW 2000 rpm, without brake"],
    ["Example – VMC 850", "1FL6064-1AC61-2AB1", 1, "SIMOTICS S-1FL6 1.5 kW 2000 rpm, with brake"],
    ["Example – VMC 850", "6SL3210-5DE16-0UA0", 3, "SINAMICS V70 5.8 A"],
    ["Example – VMC 850", "6FX3002-5CL02-1BA0", 3, "Power cable 4x1.5 10 m"],
    ["Example – VMC 850", "6FX3002-2CT12-1BA0", 3, "Signal cable TTL encoder 10 m"],
    ["Example – VMC 850", "6FX3002-5BL03-1BA0", 1, "Brake cable 10 m"],
    ["Example – VMC 850", "6FC5548-0BA20-1AA3", 2, "V70–V70 bus cable 0.35 m"],
    ["Example – VMC 850", "6FC5548-0BA20-1AD0", 1, "PPU–V70 bus cable 3 m"],
    ["Example – VMC 850", "6FC5548-0BA05-1AD0", 1, "Setpoint cable PPU → analog spindle converter"],
    [],
    [
      "How to use",
      "Delete the example rows and fill one row per 808D article. Use the same Configuration name for all rows of one machine; several machines can share one file, or upload one file per machine.",
    ],
    [
      "",
      "Article No. is the Siemens MLFB (e.g. 1FL6062-1AC61-2AB1). Qty = pieces. Description is optional but helps (kW, cable length, vertical/horizontal, turning/milling).",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 6 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, "808D configuration");
  XLSX.writeFile(wb, "808D_configuration_template.xlsx");
}
