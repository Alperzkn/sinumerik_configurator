/**
 * 808D input parser — Excel paste / file rows → InputRow[].
 *
 * Pure functions, no DOM. Accepts tab-, semicolon- or wide-space-separated
 * cells in any column order; the article number is recognised by shape.
 */

import type { InputRow } from "./types";

/** Siemens MLFB shape, incl. optional "-Z T80"-style order suffixes. */
export const MLFB_RE =
  /\b[1-9][A-Z]{2}\d{4}-\d[A-Z0-9]{4}(?:-\d[A-Z0-9]{3})?(?:-Z(?:\s?[A-Z]\d{2})*)?/g;

export function normMlfb(s: string): string {
  return s
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\s?-Z\s?/, "-Z ")
    .trim();
}

/**
 * Excel / e-mail text often carries the letter O where the article number
 * has a zero (6FC5800-OAK70-OYB0). Fix only at positions that must be digits.
 */
export function fixOh(t: string): string {
  return t
    .toUpperCase()
    .replace(/\b([1-9][A-Z]{2})([0-9O]{4})-/g, (_, a: string, b: string) => a + b.replace(/O/g, "0") + "-")
    .replace(/-O(?=[A-Z0-9]{3,4}\b)/g, "-0")
    .replace(
      /-([0-9])([A-Z][A-Z0-9])([0-9O])([0-9O])(?=[-\s]|$)/g,
      (_, a: string, b: string, c: string, d: string) =>
        "-" + a + b + c.replace("O", "0") + d.replace("O", "0"),
    );
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");

/** Parse one row of cells. Returns null when no article number is present. */
export function parseCells(rawCells: string[]): InputRow | null {
  // Letter-O repair + upper-casing is only used to *find* the article
  // number; descriptions keep their original casing.
  const fixed = rawCells.map(fixOh);
  const m = fixed.join("\t").match(MLFB_RE);
  if (!m) return null;
  const mlfb = normMlfb(m[0]);
  const trunk = mlfb.split("-Z")[0];
  let qty: number | null = null;
  const descParts: string[] = [];
  for (let i = 0; i < rawCells.length; i++) {
    const c = rawCells[i].trim();
    if (!c) continue;
    if (fixed[i].includes(trunk)) {
      // cell holding the MLFB — keep any extra text as description
      const rest = c
        .replace(new RegExp(escapeRe(trunk), "i"), "")
        .replace(/-Z\s?T80/i, "")
        .trim();
      if (rest.length > 3) descParts.push(rest);
      continue;
    }
    if (qty === null && /^\d{1,4}([.,]0+)?$/.test(c)) {
      qty = parseInt(c, 10);
      continue;
    }
    if (qty === null && /^(\d{1,3})\s*(x|pcs?|adet|st|stk|ea)\.?$/i.test(c)) {
      qty = parseInt(c, 10);
      continue;
    }
    if (qty === null && /^(x)\s*(\d{1,3})$/i.test(c)) {
      qty = parseInt(c.replace(/\D/g, ""), 10);
      continue;
    }
    descParts.push(c);
  }
  return {
    mlfb,
    qty: qty === null ? 1 : qty,
    qtyAssumed: qty === null,
    desc: descParts.join(" ").replace(/\s+/g, " ").trim(),
  };
}

const HEADER_RE = /article|mlfb|qty|quantity|description|adet|malzeme/i;

/** Split a free-text line into cells (tab > semicolon > 2+ spaces / " | "). */
export function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(";")) return line.split(";");
  return line.split(/\s{2,}|\s\|\s/);
}

export interface ParsedText {
  rows: InputRow[];
  unparsed: string[];
}

/** Parse pasted text (one BOM line per text line). */
export function parseText(text: string): ParsedText {
  const rows: InputRow[] = [];
  const unparsed: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/ /g, " ");
    if (!line.trim()) continue;
    const r = parseCells(splitLine(line));
    if (r) rows.push(r);
    else if (!HEADER_RE.test(line)) unparsed.push(line.trim());
  }
  return { rows, unparsed };
}

export interface SheetConfig {
  name: string;
  rows: InputRow[];
  unparsed: string[];
}

/**
 * Turn a sheet matrix (array of cell arrays) into one or more configurations.
 * Supports an optional "Configuration" column that splits rows into
 * several named machines. Rows without an article number are collected
 * in `unparsed` (shared by all configurations from the same sheet).
 */
export function rowsFromSheetMatrix(matrix: unknown[][], fallbackName: string): SheetConfig[] {
  const out = new Map<string, InputRow[]>();
  const unparsed: string[] = [];
  let header: string[] | null = null;
  for (const r of matrix) {
    const cells = (r || []).map((v) => (v == null ? "" : String(v)));
    if (!cells.some((c) => c.trim())) continue;
    if (
      !header &&
      cells.some((c) => /configuration|article|mlfb/i.test(c)) &&
      !cells.join("\t").toUpperCase().match(MLFB_RE)
    ) {
      header = cells.map((c) => c.toLowerCase());
      continue;
    }
    let cfg = fallbackName;
    let work = cells;
    if (header) {
      const ci = header.findIndex((h) => /configuration|config|machine/.test(h));
      if (ci >= 0 && cells[ci]?.trim()) {
        cfg = cells[ci].trim();
        work = cells.filter((_, i) => i !== ci);
      }
    }
    const p = parseCells(work);
    if (p) {
      if (!out.has(cfg)) out.set(cfg, []);
      out.get(cfg)!.push(p);
    } else {
      unparsed.push(cells.filter(Boolean).join(" | "));
    }
  }
  if (out.size === 0) out.set(fallbackName, []);
  return [...out.entries()].map(([name, rows]) => ({ name, rows, unparsed }));
}

/** Plain-text file (csv / tsv / txt) → matrix for `rowsFromSheetMatrix`. */
export function textToMatrix(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => (l.includes("\t") ? l.split("\t") : l.split(/[;,]/)));
}
