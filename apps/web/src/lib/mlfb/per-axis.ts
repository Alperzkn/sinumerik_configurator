import { FAMILY_MODELS, buildMlfb, explainMlfb } from "./index";
import { ft7SelectionsFor } from "./families/ft7";
import { ft2SelectionsFor } from "./families/ft2";
import { fk2SelectionsFor } from "./families/fk2";
import { fk7SelectionsFor } from "./families/fk7";
import { ph8SelectionsFor } from "./families/ph8";
import { ph3SelectionsFor } from "./families/ph3";
import { fe1SelectionsFor } from "./families/fe1_fe2";
import { fn3SelectionsFor } from "./families/fn3";
import { fw6SelectionsFor } from "./families/fw6";
import type { AxisMlfb } from "@/types/catalog";

/** Strip a trailing suffix group (the segment after the last hyphen). */
export function getBaseMlfb(article: string): string {
  const idx = article.lastIndexOf("-");
  if (idx < 0) return article;
  // If the last segment looks like a suffix (3-5 alphanumeric chars), strip it.
  const last = article.slice(idx + 1);
  if (/^[A-Z0-9]{3,5}$/.test(last)) return article.slice(0, idx);
  return article;
}

/** Detect the family code (e.g. "1FT2") from an article number. */
export function getFamilyCode(article: string): string | null {
  const m = article.match(/^(1[A-Z]{2}\d?)/);
  return m ? m[1] : null;
}

interface ResolvePerAxisInput {
  /** Article number from the sizing engine (may include or omit suffix). */
  baseArticle: string;
  /** User's per-axis labels — order = axis index. */
  axisNames: string[];
  /** Subset of axisNames that should have integrated holding brakes. */
  brakeAxes?: string[];
  /** Optional encoder preference applied to all axes. */
  encoder?: "incremental" | "resolver" | "absolute_single" | "absolute_multi" | "none";
  /** For 1FK2: connection technology preference. */
  connection?: "OCC" | "RJ45";
}

/**
 * Build per-axis full MLFBs for a feed-motor selection.
 *
 * Returns one {@link AxisMlfb} per axis. If the family has no
 * registered option model, returns a list with the original article
 * for each axis (so the BOM still renders one row per axis).
 */
export function resolveFeedAxisMlfbs(input: ResolvePerAxisInput): AxisMlfb[] {
  const { baseArticle, axisNames, brakeAxes = [], encoder } = input;
  if (axisNames.length === 0) return [];

  const familyCode = getFamilyCode(baseArticle);
  const model = familyCode ? FAMILY_MODELS[familyCode] : null;
  const base = getBaseMlfb(baseArticle);
  const brakeSet = new Set(brakeAxes.map((a) => a.toLowerCase()));

  return axisNames.map((axis) => {
    const brake = brakeSet.has(axis.toLowerCase());
    if (!model) {
      // No model for this family — fall back to the article as-is.
      return { axis, mlfb: baseArticle, brake };
    }
    let selections: Record<string, string>;
    switch (familyCode) {
      case "1FT7":
        selections = ft7SelectionsFor({ brake });
        break;
      case "1FT2":
        selections = ft2SelectionsFor({ brake });
        break;
      case "1FK2":
        selections = fk2SelectionsFor({ brake, connection: input.connection });
        break;
      case "1FK7":
        selections = fk7SelectionsFor({ brake });
        break;
      case "1PH8":
        // Spindles don't have brake choice — encoder is the user-facing knob.
        selections = ph8SelectionsFor({ encoder });
        break;
      case "1PH3":
        // 1PH3 catalog has no multi-turn absolute encoder option;
        // collapse "absolute_multi" → "absolute_single" gracefully.
        selections = ph3SelectionsFor({
          encoder: encoder === "absolute_multi" ? "absolute_single" : encoder,
        });
        break;
      case "1FE1":
      case "1FE2":
        selections = fe1SelectionsFor({});
        break;
      case "1FN3":
        selections = fn3SelectionsFor({});
        break;
      case "1FW6":
        selections = fw6SelectionsFor({});
        break;
      default:
        return { axis, mlfb: baseArticle, brake };
    }
    const decoded = explainMlfb(model, selections).map((row) => ({
      label: row.label,
      code: row.code,
      choiceLabel: row.choiceLabel,
    }));
    return { axis, mlfb: buildMlfb(model, base, selections), brake, decoded };
  });
}
