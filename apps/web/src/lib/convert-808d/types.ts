/**
 * 808D → 828D Smart converter — shared types.
 *
 * The converter reads a SINUMERIK 808D ADVANCED bill of materials
 * (article number + quantity + description per row) and re-selects every
 * line from the "SINUMERIK 828D Smart system – Details" catalogue.
 * Product selection is rule-based; the AI (optional) only reads messy
 * text into rows.
 */

/** One input row as read from the paste / file. */
export interface InputRow {
  /** Normalised Siemens article number, e.g. "1FL6064-1AC61-2AA1" */
  mlfb: string;
  qty: number;
  /** True when no quantity cell was found and 1 was assumed. */
  qtyAssumed: boolean;
  /** Free-text description (any remaining cells joined). */
  desc: string;
}

/**
 * How trustworthy the selected 828D Smart article is.
 *  pdf       — article listed verbatim in the 828D Smart PDF
 *  derived   — built from the PDF's own code pattern, family verified
 *  verified  — outside the PDF (cables / accessories), number verified
 *  review    — needs a manual decision
 *  none      — no 828D Smart equivalent exists
 *  replaced  — 808D item disappears; its function is covered elsewhere
 */
export type LineBasis =
  | "pdf"
  | "derived"
  | "verified"
  | "review"
  | "none"
  | "replaced";

export type LineGroup =
  | "CNC"
  | "Software options"
  | "Feed axes"
  | "Feed-axis cables"
  | "Spindle"
  | "PROFINET"
  | "Other";

/** One output line of the 828D Smart selection. */
export interface ResultLine {
  /** 828D Smart article, or "—" when nothing is selected. */
  mlfb: string;
  desc: string;
  qty: number;
  cls: LineBasis;
  grp: LineGroup;
  /** Where the number comes from (PDF page, manual, listing). */
  src: string;
  /** Extra guidance shown under the description. */
  note: string;
  /** The 808D article this line replaces, or a "(from …)" marker. */
  orig: string;
  origDesc: string;
  origQty: number | null;
}

export type NoteLevel = "info" | "warn" | "crit" | "ok";
export type ConversionNote = [NoteLevel, string];

export type Technology = "M" | "T";
export type Orientation = "H" | "V";

export interface ConversionResult {
  lines: ResultLine[];
  notes: ConversionNote[];
  tech: Technology;
  orient: Orientation;
  /** Total axes + spindles counted from the input (828D Smart max = 5). */
  axes: number;
}

/** A named 808D configuration and its conversion. */
export interface Conversion {
  id: string;
  name: string;
  rows: InputRow[];
  /** Input lines that carried no article number. */
  unparsed: string[];
  result: ConversionResult;
}

/** What is persisted between sessions (result is recomputed on load). */
export interface StoredConversion {
  name: string;
  rows: InputRow[];
  unparsed: string[];
}
