/**
 * Public surface of the MLFB option-suffix builder.
 *
 * Phase 1 ships the foundation + a working 1FT7 model. Subsequent
 * phases populate the remaining motor families and wire the builder
 * into the response parser so BOM rows get full orderable MLFBs.
 *
 * See `families/` for per-family option models and helper selection
 * functions. Each family file is self-contained and can be added /
 * revised without touching the builder core.
 */
export type {
  MotorOptionModel,
  OptionSlot,
  OptionChoice,
  SlotSelections,
} from "./types";
export { buildMlfb, validateSelections, explainMlfb } from "./builder";

import { ft7CompactDriveCliq, ft7SelectionsFor } from "./families/ft7";

/**
 * Registry of family models. Used by callers that only know the family
 * name (e.g. the response parser, which sees `motor.family = "1FT7"`).
 *
 * As more families are added in Phase 2, register them here so the
 * parser can look them up by name without coupling to specific files.
 */
export const FAMILY_MODELS = {
  "1FT7-compact-dq": ft7CompactDriveCliq,
} as const;

export { ft7CompactDriveCliq, ft7SelectionsFor };
