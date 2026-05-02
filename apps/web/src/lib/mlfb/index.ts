/**
 * Public surface of the MLFB option-suffix builder.
 *
 * Phase 2 covers all motor families we ship today:
 *
 *   Feed servos:     1FT2, 1FT7, 1FK2 (S210), 1FK7 (legacy)
 *   Spindle motors:  1PH8, 1PH3 (compact)
 *   Built-in:        1FE1, 1FE2 (newer)
 *   Linear:          1FN3
 *   Torque:          1FW6
 *
 * Each family exports:
 *   - A {@link MotorOptionModel} describing the suffix slot layout.
 *   - A `*SelectionsFor()` helper that maps user intent (brake yes/no,
 *     encoder type, cabling preference) to the catalog's slot codes.
 *
 * The model resolves an axis-level configuration (brake / encoder /
 * cabling) into a deterministic full MLFB. Phase 3 wires this into
 * the response parser so each axis gets its own orderable article.
 */
export type {
  MotorOptionModel,
  OptionSlot,
  OptionChoice,
  SlotSelections,
} from "./types";
export { buildMlfb, validateSelections, explainMlfb } from "./builder";

import { ft7CompactDriveCliq, ft7SelectionsFor } from "./families/ft7";
import { ft2DriveCliq, ft2SelectionsFor } from "./families/ft2";
import { fk2, fk2SelectionsFor } from "./families/fk2";
import { fk7Compact, fk7SelectionsFor } from "./families/fk7";
import { ph8, ph8SelectionsFor } from "./families/ph8";
import { ph3, ph3SelectionsFor } from "./families/ph3";
import { fe1, fe2, fe1SelectionsFor, fe2SelectionsFor } from "./families/fe1_fe2";
import { fn3, fn3SelectionsFor } from "./families/fn3";
import { fw6, fw6SelectionsFor } from "./families/fw6";

import type { MotorOptionModel } from "./types";

/**
 * Registry of family models keyed by family code. Used by the response
 * parser to look up the right model from a motor's `family` field.
 *
 * Where a family has multiple variants (1FT7 Compact / Forced-Vent;
 * 1FK2 OCC / RJ45) the *primary production* variant is registered
 * here. Variants are accessible by direct import.
 */
export const FAMILY_MODELS: Record<string, MotorOptionModel> = {
  "1FT2": ft2DriveCliq,
  "1FT7": ft7CompactDriveCliq,
  "1FK2": fk2,
  "1FK7": fk7Compact,
  "1PH8": ph8,
  "1PH3": ph3,
  "1FE1": fe1,
  "1FE2": fe2,
  "1FN3": fn3,
  "1FW6": fw6,
};

export {
  ft7CompactDriveCliq,
  ft7SelectionsFor,
  ft2DriveCliq,
  ft2SelectionsFor,
  fk2,
  fk2SelectionsFor,
  fk7Compact,
  fk7SelectionsFor,
  ph8,
  ph8SelectionsFor,
  ph3,
  ph3SelectionsFor,
  fe1,
  fe2,
  fe1SelectionsFor,
  fe2SelectionsFor,
  fn3,
  fn3SelectionsFor,
  fw6,
  fw6SelectionsFor,
};
