/**
 * Type definitions for the SIMOTICS motor MLFB option-suffix model.
 *
 * Real Siemens MLFBs are constructed by filling positional slots in the
 * article number with codes that select encoder type, holding brake,
 * shaft form, cabling style, etc. Each motor family (1FT7, 1FT2, 1FK2,
 * 1PH8, 1FE1, 1FN3, 1FW6, …) has its own slot layout.
 *
 *   Example — 1FT7 Compact
 *     1FT7064-5AF71-1DA1
 *     └────┘ └────┘ └──┘
 *      base  speed/  suffix
 *            iface
 *
 *     The "suffix" portion (`-1DA1`) is what the customer chooses at
 *     order time. Each character codes a property:
 *       1   → flange (Classic / Recessed)
 *       D   → shaft + accuracy + brake combination
 *       A   → terminal-box / connector outlet
 *       1   → spec / additional options
 *
 * For the configurator, the base portion is decided by the sizing
 * engine (family + shaft height + power/speed). The suffix is decided
 * by the option model defined below.
 */

/** A single allowed code for one slot. */
export interface OptionChoice {
  /**
   * Code inserted at this slot's position(s) in the suffix.
   * Usually 1 character; may be longer for compound slots.
   */
  code: string;
  /** Human-readable label shown in UI / tooltips. */
  label: string;
  /**
   * Optional gate: returns true when this choice is allowed given the
   * current selections of other slots. Used for inter-slot rules
   * (e.g. brake requires DRIVE-CLiQ encoder on certain families).
   */
  requires?: (selections: SlotSelections) => boolean;
}

/** A positional slot in the MLFB suffix. */
export interface OptionSlot {
  /**
   * Stable identifier — the key used in the {@link SlotSelections} map.
   * Examples: "flange", "encoder", "brake", "shaft", "terminal".
   */
  id: string;
  /** Human-readable name (UI). */
  label: string;
  /**
   * Suffix position the slot writes into. The `{id}` placeholder in
   * {@link MotorOptionModel.suffixTemplate} is replaced by the chosen
   * code.
   */
  defaultCode: string;
  /** All allowed codes. The first is conventionally the default fallback. */
  choices: OptionChoice[];
}

/** User-chosen codes by slot id. Missing entries fall back to defaults. */
export type SlotSelections = Record<string, string>;

/**
 * Full option model for one motor family / variant.
 *
 * The {@link suffixTemplate} is a string like `"-1{shaft_brake}{terminal}{spec}"`
 * with `{slotId}` placeholders. The builder substitutes each placeholder
 * with the chosen code (or the slot's default if unspecified).
 *
 * Fixed characters in the template (digits, hyphens, anything outside
 * `{…}`) are preserved verbatim. This lets each family encode its
 * idiosyncratic separators and constants.
 */
/**
 * Honest signal of how completely the model's output matches the
 * Siemens catalog's official ordering MLFB.
 *
 * - "verified"    All slot codes and positions confirmed against the
 *                 D21.4 / D32 / NC63 ordering tables for this family.
 *                 Output is directly orderable.
 * - "partial"     Brake / encoder slot codes verified, but full
 *                 position encoding (interfix, terminal, vibration
 *                 grade) not exhaustively cross-checked. Output looks
 *                 right but may need 1–2 character corrections by
 *                 the Siemens partner before procurement.
 * - "trunk-only"  We only have the catalog trunk (e.g. "1FT2206-4AF").
 *                 The 4–6 character suffix that encodes encoder /
 *                 brake / shaft / IP is NOT emitted at all. The
 *                 partner picks it during order entry from customer
 *                 preferences.
 */
export type MlfbCompleteness = "verified" | "partial" | "trunk-only";

export interface MotorOptionModel {
  /** Family identifier — used by the builder to dispatch on family. */
  family: string;
  /** Version variant — e.g. "Compact", "OCC", "Booksize". Optional. */
  variant?: string;
  /** Suffix template with `{slotId}` placeholders. */
  suffixTemplate: string;
  /** All slots referenced in the template. */
  slots: OptionSlot[];
  /**
   * How fully this model matches the Siemens catalog's official
   * ordering layout. Drives a UI badge on the BOM line so users (and
   * their Siemens partner) know which suffix characters are speculative.
   */
  completeness: MlfbCompleteness;
}
