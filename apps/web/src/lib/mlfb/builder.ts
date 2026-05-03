import type { MotorOptionModel, SlotSelections, OptionChoice } from "./types";

/**
 * Build a complete MLFB from a base article and a slot-selection map.
 *
 *   buildMlfb(model, "1FT7064-5AF71", { flange: "1", shaft_brake: "B" })
 *     → "1FT7064-5AF71-10B1"
 *
 * The suffix template's `{slotId}` placeholders are replaced with each
 * slot's chosen code (or the slot's default if unspecified). Fixed
 * characters in the template pass through verbatim.
 *
 * The builder does NOT validate `baseMlfb` — that's the sizing engine's
 * job. It also does not enforce inter-slot `requires` predicates here;
 * use {@link validateSelections} for that and let the UI guide users
 * away from invalid combinations.
 */
export function buildMlfb(
  model: MotorOptionModel,
  baseMlfb: string,
  selections: SlotSelections = {},
): string {
  // Honest mode: when the family hasn't been verified against the
  // catalog ordering tables end-to-end, return ONLY the catalog trunk
  // and let the UI surface a "partner completes suffix" badge. Better
  // than emitting plausible-looking but speculative characters.
  if (model.completeness === "trunk-only") return baseMlfb;

  const suffix = model.suffixTemplate.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, slotId: string) => {
    const slot = model.slots.find((s) => s.id === slotId);
    if (!slot) {
      throw new Error(
        `MLFB builder: slot "${slotId}" referenced in suffix template but not defined for family ${model.family}`,
      );
    }
    const chosen = selections[slotId] ?? slot.defaultCode;
    if (!slot.choices.some((c) => c.code === chosen)) {
      throw new Error(
        `MLFB builder: slot "${slotId}" code "${chosen}" is not in the allowed choices for family ${model.family}`,
      );
    }
    return chosen;
  });
  return baseMlfb + suffix;
}

/**
 * Validate a full selection map against a model — checks every slot's
 * `requires` predicate, returning the list of slot ids whose chosen code
 * is illegal in the current context.
 *
 * Returns an empty array if all selections are consistent.
 */
export function validateSelections(
  model: MotorOptionModel,
  selections: SlotSelections,
): { slotId: string; reason: string }[] {
  const issues: { slotId: string; reason: string }[] = [];
  for (const slot of model.slots) {
    const chosen = selections[slot.id] ?? slot.defaultCode;
    const choice: OptionChoice | undefined = slot.choices.find((c) => c.code === chosen);
    if (!choice) {
      issues.push({
        slotId: slot.id,
        reason: `Code "${chosen}" is not in the allowed choices`,
      });
      continue;
    }
    if (choice.requires && !choice.requires(selections)) {
      issues.push({
        slotId: slot.id,
        reason: `Choice "${chosen}" (${choice.label}) is not allowed with the current selections`,
      });
    }
  }
  return issues;
}

/**
 * Helper: explain a built MLFB by listing each slot's chosen value.
 * Used by the BOM tooltip to show "this code means …" hover text.
 */
export function explainMlfb(
  model: MotorOptionModel,
  selections: SlotSelections,
): { slotId: string; label: string; code: string; choiceLabel: string }[] {
  return model.slots.map((slot) => {
    const chosen = selections[slot.id] ?? slot.defaultCode;
    const choice = slot.choices.find((c) => c.code === chosen);
    return {
      slotId: slot.id,
      label: slot.label,
      code: chosen,
      choiceLabel: choice?.label ?? "(unknown)",
    };
  });
}
