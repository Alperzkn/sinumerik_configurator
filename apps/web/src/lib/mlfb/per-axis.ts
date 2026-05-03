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

/**
 * Strip a true configurable suffix segment from the end of an article
 * number. Suffixes are exactly 4 characters in the shape
 * `<digit><letters><digit>` (e.g. `1DA1`, `0LA1`, `2AB0`).
 *
 * Many MOTOR_SPECS entries store only the catalog *base* with no
 * suffix attached (e.g. `1FT2206-4AF`, `1FK2103-2AG`) — the trailing
 * 3-char segment is the speed/torque-code part of the base and must
 * NOT be stripped, otherwise the resulting MLFB is too short to be
 * orderable.
 */
export function getBaseMlfb(article: string): string {
  const idx = article.lastIndexOf("-");
  if (idx < 0) return article;
  const last = article.slice(idx + 1);
  // Only 4-char segments matching the canonical suffix shape get
  // stripped. Catalog bases like "4AF" / "2AG" (3 chars) stay intact.
  if (last.length === 4 && /^[0-9][A-Z]+[0-9]$/.test(last)) {
    return article.slice(0, idx);
  }
  return article;
}

/** Detect the family code (e.g. "1FT2") from an article number. */
export function getFamilyCode(article: string): string | null {
  const m = article.match(/^(1[A-Z]{2}\d?)/);
  return m ? m[1] : null;
}

/**
 * Build a full default MLFB (no brake, factory-default encoder/flange)
 * for a given sized motor article. Used for the BOM line itself —
 * `Motor.articleNumber` should be a complete orderable code regardless
 * of whether per-axis info was captured.
 *
 * If the article ALREADY carries a 4-char suffix (e.g. 1FT7 stored as
 * "1FT7034-5AK71-1DA1" or 1PH8 as "1PH8133-1FF10-0LA1"), it's returned
 * unchanged — those families' MOTOR_SPECS entries are already complete
 * and may encode a specific catalog variant we should preserve.
 *
 * Returns the original article unchanged when the family has no
 * registered option model.
 */
export function resolveFullMotorMlfb(article: string): {
  mlfb: string;
  completeness: "verified" | "partial" | "trunk-only";
} {
  const base = getBaseMlfb(article);
  // If a suffix was stripped, the article was already complete.
  if (base !== article) return { mlfb: article, completeness: "verified" };
  const familyCode = getFamilyCode(article);
  const model = familyCode ? FAMILY_MODELS[familyCode] : null;
  if (!model) return { mlfb: article, completeness: "trunk-only" };
  // Trunk-only families: emit just the trunk, no speculative suffix.
  if (model.completeness === "trunk-only") {
    return { mlfb: article, completeness: "trunk-only" };
  }
  // Default-no-brake selections per family. Spindle / built-in / linear
  // / torque families don't have a brake concept, so we just pass {} —
  // the model's defaults pick up cleanly.
  let selections: Record<string, string>;
  switch (familyCode) {
    case "1FT7":
      selections = ft7SelectionsFor({ brake: false });
      break;
    case "1FT2":
      selections = ft2SelectionsFor({ brake: false });
      break;
    case "1FK2":
      selections = fk2SelectionsFor({ brake: false, connection: "OCC" });
      break;
    case "1FK7":
      selections = fk7SelectionsFor({ brake: false });
      break;
    case "1PH8":
      selections = ph8SelectionsFor({});
      break;
    case "1PH3":
      selections = ph3SelectionsFor({});
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
      return { mlfb: article, completeness: "trunk-only" };
  }
  return { mlfb: buildMlfb(model, base, selections), completeness: model.completeness };
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
    const decoded =
      model.completeness === "trunk-only"
        ? undefined
        : explainMlfb(model, selections).map((row) => ({
            label: row.label,
            code: row.code,
            choiceLabel: row.choiceLabel,
          }));
    return {
      axis,
      mlfb: buildMlfb(model, base, selections),
      brake,
      decoded,
      completeness: model.completeness,
    };
  });
}
