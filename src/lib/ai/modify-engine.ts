import type { GeneratedConfiguration, DriveComponent, Motor } from "@/types/catalog";
import {
  applySwap,
  addSoftwareOption,
  removeSoftwareOption,
  addTechnologyPackage,
  removeTechnologyPackage,
  addSafetyFunction,
  removeSafetyFunctions,
  setCncSoftwareVariant,
  setHmiPanelSize,
  swapHmi,
  swapMcp,
  regenerateCablesFor,
} from "./config-mutations";
import { sizeConfiguration, type UserSpecsInput } from "@/lib/sizing";
import { selectLineModule } from "@/lib/validation/drive-system-rules";
import { softwareOptions as catalogOptions } from "@/data/software-options";
import { technologyPackages as catalogPackages } from "@/data/technology-packages";
import { safetyFunctions as catalogSafetyFunctions } from "@/data/safety";
import { cncSoftwareOptions as catalogCncSoftware } from "@/data/cnc-software";
import { hmiComponents as catalogHmi } from "@/data/hmi-components";

export interface ModifyResult {
  updatedConfiguration?: GeneratedConfiguration;
  /** True when at least one apply branch actually mutated the config. */
  hadChanges?: boolean;
  summary: string;
  warnings?: string[];
}

interface ModifyInstruction {
  /** "swap" | "add" | "remove" | "resize" | "no_change" */
  action?: string;
  changes?: {
    /** Override user mechanical specs and re-run sizing engine */
    userSpecsOverride?: Partial<UserSpecsInput>;

    /** Control unit */
    controlUnitId?: string;
    controlUnitArticle?: string;

    /** CNC software */
    cncSoftwareVariant?: "export" | "full_scope";

    /** Drive system */
    lineModuleArticle?: string;
    feedMotorArticle?: string;
    spindleMotorArticle?: string;
    feedMotorModuleArticle?: string;
    spindleMotorModuleArticle?: string;
    preferActiveLineModule?: boolean;

    /** HMI / MCP */
    hmiPanelSizeInch?: number;
    hmiArticle?: string;
    mcpArticle?: string;

    /** Software options (orderCode form preferred — AI may not know internal ids) */
    addOptions?: { orderCode: string; quantity?: number; reason?: string }[];
    removeOptions?: string[];
    addPackages?: { id: string; reason?: string }[];
    removePackages?: string[];

    /** Safety — strings can be order codes (S60, S61, K06) or ids */
    addSafety?: string[];
    removeSafety?: string[];
  };
  summary?: string;
  warnings?: string[];
}

/**
 * Send a modification request to the AI along with the current configuration
 * and the user's current mechanical specs, then apply the returned change set.
 */
export async function modifyConfiguration(
  current: GeneratedConfiguration,
  userRequest: string,
  /** Current user-provided mechanical specs — used as baseline for re-sizing */
  baselineSpecs?: UserSpecsInput
): Promise<ModifyResult> {
  const summary = buildCurrentConfigSummary(current);
  const systemPrompt = buildModifyPrompt(summary);

  const response = await fetch("/api/modify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userMessage: userRequest }),
  });

  if (!response.ok) {
    throw new Error(`Modification failed: ${response.statusText}`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const instruction = normaliseInstruction(raw);
  return applyModifications(current, instruction, baselineSpecs);
}

/**
 * The AI doesn't always return our exact schema. Common variations we've
 * seen: `controlUnit: { id }` instead of `controlUnitId`, `controlUnit` as
 * a plain string, `spindleMotor: { articleNumber }` instead of
 * `spindleMotorArticle`, `cncSoftware: { variant }` instead of
 * `cncSoftwareVariant`, `safety: { add, remove }` etc.
 *
 * This pass folds those shapes back into the canonical schema so
 * applyModifications has one shape to consume.
 */
function normaliseInstruction(raw: Record<string, unknown>): ModifyInstruction {
  const inChanges = (raw.changes ?? raw) as Record<string, unknown>;
  const out: ModifyInstruction["changes"] = {};

  // Helper: pick a string field from an object regardless of whether the AI
  // gave us a plain string, an { id } / { articleNumber } object, or a
  // typo-ed key.
  const pickStr = (...vals: unknown[]): string | undefined => {
    for (const v of vals) {
      if (typeof v === "string" && v.trim()) return v.trim();
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.articleNumber === "string") return o.articleNumber;
        if (typeof o.id === "string") return o.id;
        if (typeof o.value === "string") return o.value;
        if (typeof o.code === "string") return o.code;
      }
    }
    return undefined;
  };

  // Control unit — accept controlUnitId | controlUnit | controlUnitArticle
  const cuArticle = pickStr(inChanges.controlUnitArticle);
  const cuId = pickStr(inChanges.controlUnitId, inChanges.controlUnit, inChanges.cu);
  if (cuArticle) out.controlUnitArticle = cuArticle;
  if (cuId) out.controlUnitId = cuId;

  // CNC software variant — accept cncSoftwareVariant | cncSoftware.variant | softwareVariant
  const swVariant = pickStr(
    inChanges.cncSoftwareVariant,
    inChanges.softwareVariant,
    inChanges.cncSoftware
  );
  if (swVariant === "export" || swVariant === "full_scope") {
    out.cncSoftwareVariant = swVariant;
  }

  // Line / motor / motor-module articles — accept *Article OR nested object
  const lm = pickStr(inChanges.lineModuleArticle, inChanges.lineModule);
  if (lm) out.lineModuleArticle = lm;
  const fm = pickStr(inChanges.feedMotorArticle, inChanges.feedMotor);
  if (fm) out.feedMotorArticle = fm;
  const sm = pickStr(inChanges.spindleMotorArticle, inChanges.spindleMotor);
  if (sm) out.spindleMotorArticle = sm;
  const fmm = pickStr(inChanges.feedMotorModuleArticle, inChanges.feedMotorModule);
  if (fmm) out.feedMotorModuleArticle = fmm;
  const smm = pickStr(inChanges.spindleMotorModuleArticle, inChanges.spindleMotorModule);
  if (smm) out.spindleMotorModuleArticle = smm;

  if (typeof inChanges.preferActiveLineModule === "boolean") {
    out.preferActiveLineModule = inChanges.preferActiveLineModule;
  }

  // HMI
  if (typeof inChanges.hmiPanelSizeInch === "number") {
    out.hmiPanelSizeInch = inChanges.hmiPanelSizeInch;
  } else if (inChanges.hmi && typeof inChanges.hmi === "object") {
    const h = inChanges.hmi as Record<string, unknown>;
    if (typeof h.panelSizeInch === "number") out.hmiPanelSizeInch = h.panelSizeInch;
  }
  const hmiArt = pickStr(inChanges.hmiArticle);
  if (hmiArt) out.hmiArticle = hmiArt;
  const mcpArt = pickStr(inChanges.mcpArticle);
  if (mcpArt) out.mcpArticle = mcpArt;

  // userSpecsOverride — pass through if shape looks reasonable
  if (inChanges.userSpecsOverride && typeof inChanges.userSpecsOverride === "object") {
    out.userSpecsOverride = inChanges.userSpecsOverride as Partial<UserSpecsInput>;
  }

  // Software options — addOptions / removeOptions / addPackages / removePackages
  // Accept arrays of strings (just order codes) or arrays of objects.
  const toOptionList = (v: unknown): { orderCode: string; quantity?: number; reason?: string }[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    return v
      .map((item) => {
        if (typeof item === "string") return { orderCode: item.toUpperCase() };
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          const code = pickStr(o.orderCode, o.code, o.id);
          if (!code) return null;
          return {
            orderCode: code.toUpperCase(),
            quantity: typeof o.quantity === "number" ? o.quantity : undefined,
            reason: typeof o.reason === "string" ? o.reason : undefined,
          };
        }
        return null;
      })
      .filter((x): x is { orderCode: string } => x !== null);
  };
  const addOpts = toOptionList(inChanges.addOptions);
  if (addOpts && addOpts.length > 0) out.addOptions = addOpts;
  if (Array.isArray(inChanges.removeOptions)) {
    out.removeOptions = (inChanges.removeOptions as unknown[])
      .map((v) => (typeof v === "string" ? v : pickStr(v)))
      .filter((v): v is string => Boolean(v));
  }
  if (Array.isArray(inChanges.addPackages)) {
    out.addPackages = (inChanges.addPackages as unknown[])
      .map((v) => {
        if (typeof v === "string") return { id: v };
        if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          const id = pickStr(o.id, o.orderCode, o.code);
          return id ? { id, reason: typeof o.reason === "string" ? o.reason : undefined } : null;
        }
        return null;
      })
      .filter((v): v is { id: string } => v !== null);
  }
  if (Array.isArray(inChanges.removePackages)) {
    out.removePackages = (inChanges.removePackages as unknown[])
      .map((v) => (typeof v === "string" ? v : pickStr(v)))
      .filter((v): v is string => Boolean(v));
  }

  // Safety — addSafety / removeSafety, also support safety: { add, remove }
  const safetyObj = inChanges.safety as Record<string, unknown> | undefined;
  const addSafetyRaw = inChanges.addSafety ?? safetyObj?.add ?? safetyObj?.addOptions;
  const removeSafetyRaw = inChanges.removeSafety ?? safetyObj?.remove ?? safetyObj?.removeOptions;
  if (Array.isArray(addSafetyRaw)) {
    out.addSafety = (addSafetyRaw as unknown[])
      .map((v) => (typeof v === "string" ? v : pickStr(v)))
      .filter((v): v is string => Boolean(v));
  }
  if (Array.isArray(removeSafetyRaw)) {
    out.removeSafety = (removeSafetyRaw as unknown[])
      .map((v) => (typeof v === "string" ? v : pickStr(v)))
      .filter((v): v is string => Boolean(v));
  }

  return {
    action: typeof raw.action === "string" ? raw.action : undefined,
    changes: out,
    summary: typeof raw.summary === "string" ? raw.summary : undefined,
    warnings: Array.isArray(raw.warnings)
      ? (raw.warnings as unknown[]).filter((w): w is string => typeof w === "string")
      : undefined,
  };
}

function buildModifyPrompt(currentSummary: string): string {
  return `You are a SINUMERIK ONE configuration modifier.

The user has an existing configuration. Translate their request into a structured modification instruction.

CURRENT CONFIGURATION:
${currentSummary}

Respond with JSON ONLY (no markdown, no prose). Every field is optional — include only what changes. Schema:
{
  "action": "swap" | "add" | "remove" | "resize" | "no_change",
  "changes": {
    "userSpecsOverride": { "spindlePowerKw": 30, "spindleMaxRpm": 12000, "movingMassKg": 500, "rapidTraverseMpm": 40, "feedMotorFamily": "1FT2", "spindleMotorFamily": "1PH8" },

    "controlUnitId": "NCU_1750",
    "controlUnitArticle": "6FC5317-5AA00-0AA1",

    "cncSoftwareVariant": "full_scope",

    "preferActiveLineModule": true,
    "lineModuleArticle": "6SL3130-7TE25-5AA3",
    "feedMotorArticle": "1FT7086-5AF71-1DA1",
    "spindleMotorArticle": "1PH8163-1FF10-0LA1",
    "feedMotorModuleArticle": "6SL3120-1TE21-0AD0",
    "spindleMotorModuleArticle": "6SL3120-1TE24-5AC0",

    "hmiPanelSizeInch": 19,
    "hmiArticle": "6AV6646-1BA15-0NA1",
    "mcpArticle": "6FC5303-0AP02-0AA0",

    "addOptions": [{ "orderCode": "M72", "quantity": 1, "reason": "TRAORI requested" }],
    "removeOptions": ["A05"],
    "addPackages": [{ "id": "S43", "reason": "5-axis upgrade" }],
    "removePackages": ["S41"],

    "addSafety": ["S60", "S61"],
    "removeSafety": ["S60", "S61", "K06"]
  },
  "summary": "1-3 sentences explaining what changed",
  "warnings": ["Optional: things the user should verify"]
}

AVAILABLE MOTOR FAMILIES (the deterministic sizing engine picks the article)
- Feed servo: 1FT7 (compact + forced ventilation), 1FT2 (newer compact, higher torque density at small SH), 1FK2 (S210 OCC), 1FK7 (legacy 2-cable)
- Main spindle: 1PH8 (async 1000/1500/2000 rpm + sync HighSpeed), 1PH3 (older async, conventional spindles)
ALL of the above are valid choices. NEVER tell the user a family is unsupported — instead, use userSpecsOverride.feedMotorFamily / spindleMotorFamily to bias the sizing engine to that family.

RULES
- For motor sizing changes (e.g. "make spindle 30 kW"), use userSpecsOverride. Do NOT pick a specific motor article — the deterministic sizing engine picks the right motor from the catalog when userSpecsOverride is provided.
- For "switch to <family>" requests (e.g. "use 1FK2", "swap spindle to 1PH3"), set userSpecsOverride.feedMotorFamily or spindleMotorFamily to the family code (e.g. "1FK2", "1PH3"). The sizing engine re-runs with that family preference.
- For specific component swaps (e.g. "use Active Line Module 55 kW"), use the article-number fields directly.
- For preference flips (e.g. "switch to active line module"), use preferActiveLineModule: true.
- For HMI panel size changes (e.g. "use 19\" panel"), use hmiPanelSizeInch — the matching MCP is re-derived automatically.
- For CNC SW variant ("switch to full scope" / "downgrade to export"), use cncSoftwareVariant.
- For software options, use addOptions (orderCode form e.g. "M72") / removeOptions (also orderCode e.g. "A03") / addPackages / removePackages.
- For safety changes:
  * "remove safety" / "drop S60" / "no safety options" → removeSafety: ["S60", "S61", ...all extended safety codes currently in the config]
  * "add safe axis monitoring" / "add S61" → addSafety: ["S60", "S61"] (S61 requires S60)
  * "add per-axis safety" → addSafety: ["S60", "K06"] (or appropriate K0N for axis count)
  * Basic safety (STO/SS1/SBC) is HARDWARE — it can never be removed and never needs to be added; do NOT include it in either array.
- Include only fields that change. Omit everything else.
- Article numbers must be COMPLETE (no wildcards). Order codes are 2-3 chars (A01, M72, S43, K06, P17, etc.)
- If the request is ambiguous or impossible, return action: "no_change" with a helpful summary explaining why.

VALID CONTROL UNITS: PPU_1740, NCU_1740, NCU_1750, NCU_1760
VALID LINE MODULES: 6SL3130-6AE15-0AB1 (Smart 5kW), 6SL3130-6AE21-0AB1 (Smart 10kW), 6SL3130-6TE23-6AA3 (Smart 36kW), 6SL3130-6TE25-5AA3 (Smart 55kW), 6SL3130-7TE21-6AA4 (Active 16kW), 6SL3130-7TE23-6AA3 (Active 36kW), 6SL3130-7TE25-5AA3 (Active 55kW), 6SL3130-7TE28-0AA3 (Active 80kW), 6SL3130-7TE31-2AA3 (Active 120kW)`;
}

function buildCurrentConfigSummary(config: GeneratedConfiguration): string {
  const feedMotor = config.motors.find((m) => m.motorType === "feed_servo_sync");
  const spindleMotor = config.motors.find(
    (m) => m.motorType === "main_spindle_async" || m.motorType === "main_spindle_sync"
  );
  const lineModule = config.drives.find(
    (d) =>
      d.componentType === "line_module_active" ||
      d.componentType === "line_module_smart" ||
      d.componentType === "line_module_basic"
  );

  return `
- Control Unit: ${config.controlUnit.id} (${config.controlUnit.articleNumber})
- CNC Software: ${config.softwareVariant} SW ${config.cncSoftware.swVersion}
- Technology Packages: ${config.technologyPackages.map((p) => p.orderCode).join(", ") || "None"}
- Software Options: ${config.softwareOptions.map((o) => o.orderCode).join(", ") || "None"}
- Feed Motor: ${feedMotor?.articleNumber || "?"} (${feedMotor?.ratedTorque || "?"} @ ${feedMotor?.ratedSpeed || "?"})
- Spindle Motor: ${spindleMotor?.articleNumber || "none"} (${spindleMotor?.ratedPower || "?"}, max ${spindleMotor?.maxSpeed || "?"})
- Line Module: ${lineModule?.articleNumber || "?"} (${lineModule?.componentType || "?"})
- HMI: ${config.hmiComponents.find((h) => h.category === "thin_client" || h.category === "ppu_panel" || h.category === "panel_pc")?.name || "?"}
- Safety: ${config.safetyFunctions.filter((s) => !s.isBasicScope).map((s) => s.orderCode).join(", ") || "Basic only"}
- Total axes: ${config.totalAxes}, Channels: ${config.totalChannels}
`.trim();
}

/**
 * Apply a modify instruction. Order matters:
 *   1. userSpecsOverride → re-run sizing engine to pick new motor + drives
 *   2. preferActiveLineModule → re-select line module
 *   3. Direct article swaps (motor / line module / control unit)
 *   4. Software adds/removes
 */
function applyModifications(
  current: GeneratedConfiguration,
  instruction: ModifyInstruction,
  baselineSpecs?: UserSpecsInput
): ModifyResult {
  const changes = instruction.changes;
  if (!changes || instruction.action === "no_change" || Object.keys(changes).length === 0) {
    return {
      summary: instruction.summary || "No changes made.",
      warnings: instruction.warnings,
    };
  }

  let updated: GeneratedConfiguration = current;
  const appliedSummary: string[] = [];

  // 1. Re-run sizing engine if user wants to change spec-driven sizing
  if (changes.userSpecsOverride) {
    const merged: UserSpecsInput = { ...(baselineSpecs || {}), ...changes.userSpecsOverride };
    // Derive baseline from current motors if no baseline provided
    if (!baselineSpecs) {
      const spindle = current.motors.find(
        (m) => m.motorType === "main_spindle_async" || m.motorType === "main_spindle_sync"
      );
      const feed = current.motors.find((m) => m.motorType === "feed_servo_sync");
      if (spindle?.ratedPower && merged.spindlePowerKw === undefined) {
        merged.spindlePowerKw = parseNumeric(spindle.ratedPower);
      }
      if (spindle?.maxSpeed && merged.spindleMaxRpm === undefined) {
        merged.spindleMaxRpm = parseNumeric(spindle.maxSpeed);
      }
      if (feed?.ratedTorque && merged.movingMassKg === undefined) {
        // Approximate inverse — torque was sized at mass/40, so mass ≈ torque*40
        merged.movingMassKg = (parseNumeric(feed.ratedTorque) || 5) * 40;
      }
    }

    const sized = sizeConfiguration({ userSpecs: merged, template: null });
    if (sized.spindle) {
      updated = applySwap(updated, "motor_spindle", sized.spindle.article, {
        shaftHeight: sized.spindle.specs.shaftHeight,
      });
      // Sync the spindle motor module to the freshly-sized spindle's MM
      updated = applySwap(updated, "motor_module_spindle", sized.spindle.specs.motorModule);
      appliedSummary.push(`Re-sized spindle to ${sized.spindle.article} (${sized.spindle.specs.ratedPower}, max ${sized.spindle.specs.maxSpeed})`);
    }
    if (sized.feed) {
      updated = applySwap(updated, "motor_feed", sized.feed.article, {
        shaftHeight: sized.feed.specs.shaftHeight,
      });
      updated = applySwap(updated, "motor_module_feed", sized.feed.specs.motorModule);
      appliedSummary.push(`Re-sized feed motor to ${sized.feed.article} (${sized.feed.specs.ratedTorque})`);
    }
  }

  // 2. Active line module preference flip
  if (changes.preferActiveLineModule) {
    const feedMm = updated.drives.find((d) => d.id.startsWith("feed-mm-"));
    const spindleMm = updated.drives.find((d) => d.id.startsWith("spindle-mm-"));
    const feedQty = feedMm ? updated.driveQuantities[feedMm.id] || 1 : 0;
    const spindleQty = spindleMm ? updated.driveQuantities[spindleMm.id] || 1 : 0;
    const lm = selectLineModule(
      feedMm?.articleNumber || "",
      feedQty,
      spindleMm?.articleNumber,
      spindleQty,
      true
    );
    updated = applySwap(updated, "line_module", lm.articleNumber);
    appliedSummary.push(`Switched to Active Line Module: ${lm.name}`);
  }

  // 3. Direct article swaps
  if (changes.lineModuleArticle) {
    updated = applySwap(updated, "line_module", changes.lineModuleArticle);
    appliedSummary.push(`Line Module → ${changes.lineModuleArticle}`);
  }
  if (changes.feedMotorArticle) {
    updated = applySwap(updated, "motor_feed", changes.feedMotorArticle);
    appliedSummary.push(`Feed motor → ${changes.feedMotorArticle}`);
  }
  if (changes.spindleMotorArticle) {
    updated = applySwap(updated, "motor_spindle", changes.spindleMotorArticle);
    appliedSummary.push(`Spindle motor → ${changes.spindleMotorArticle}`);
  }
  if (changes.feedMotorModuleArticle) {
    updated = applySwap(updated, "motor_module_feed", changes.feedMotorModuleArticle);
    appliedSummary.push(`Feed Motor Module → ${changes.feedMotorModuleArticle}`);
  }
  if (changes.spindleMotorModuleArticle) {
    updated = applySwap(updated, "motor_module_spindle", changes.spindleMotorModuleArticle);
    appliedSummary.push(`Spindle Motor Module → ${changes.spindleMotorModuleArticle}`);
  }
  if (changes.controlUnitArticle) {
    updated = applySwap(updated, "control_unit", changes.controlUnitArticle);
    appliedSummary.push(`Control unit → ${changes.controlUnitArticle}`);
  } else if (changes.controlUnitId) {
    const articleMap: Record<string, string> = {
      PPU_1740: "6FC5317-4AA00-1CA0",
      NCU_1740: "6FC5317-4AA00-0AA0",
      NCU_1750: "6FC5317-5AA00-0AA1",
      NCU_1760: "6FC5317-6AA00-0AA0",
    };
    const article = articleMap[changes.controlUnitId];
    if (article) {
      updated = applySwap(updated, "control_unit", article);
      appliedSummary.push(`Control unit → ${changes.controlUnitId}`);
    }
  }

  // 3b. CNC software variant
  if (changes.cncSoftwareVariant) {
    const before = updated.softwareVariant;
    updated = setCncSoftwareVariant(updated, changes.cncSoftwareVariant, catalogCncSoftware);
    if (updated.softwareVariant !== before) {
      appliedSummary.push(`CNC software variant → ${changes.cncSoftwareVariant}`);
    }
  }

  // 3c. HMI / MCP
  if (changes.hmiPanelSizeInch) {
    updated = setHmiPanelSize(updated, changes.hmiPanelSizeInch, catalogHmi);
    appliedSummary.push(`HMI panel size → ${changes.hmiPanelSizeInch}" (MCP re-matched)`);
  }
  if (changes.hmiArticle) {
    updated = swapHmi(updated, changes.hmiArticle, catalogHmi);
    appliedSummary.push(`HMI → ${changes.hmiArticle}`);
  }
  if (changes.mcpArticle) {
    updated = swapMcp(updated, changes.mcpArticle, catalogHmi);
    appliedSummary.push(`MCP → ${changes.mcpArticle}`);
  }

  // 4. Software options
  if (changes.addOptions) {
    for (const a of changes.addOptions) {
      const opt = catalogOptions.find((o) => o.orderCode === a.orderCode);
      if (opt) {
        updated = addSoftwareOption(updated, opt, a.quantity || 1);
        appliedSummary.push(`Added option ${opt.orderCode} (${opt.name})`);
      } else {
        appliedSummary.push(`⚠ Option ${a.orderCode} not found in catalog`);
      }
    }
  }
  if (changes.removeOptions) {
    for (const id of changes.removeOptions) {
      const before = updated.softwareOptions.length;
      updated = removeSoftwareOption(updated, id);
      if (updated.softwareOptions.length < before) appliedSummary.push(`Removed option ${id}`);
    }
  }
  if (changes.addPackages) {
    for (const p of changes.addPackages) {
      const pkg = catalogPackages.find((tp) => tp.id === p.id || tp.orderCode === p.id);
      if (pkg) {
        updated = addTechnologyPackage(updated, pkg);
        appliedSummary.push(`Added package ${pkg.orderCode} (${pkg.name})`);
      } else {
        appliedSummary.push(`⚠ Package ${p.id} not found in catalog`);
      }
    }
  }
  if (changes.removePackages) {
    for (const id of changes.removePackages) {
      const before = updated.technologyPackages.length;
      updated = removeTechnologyPackage(updated, id);
      if (updated.technologyPackages.length < before) {
        appliedSummary.push(`Removed package ${id}`);
      }
    }
  }

  // 5. Safety functions
  if (changes.removeSafety && changes.removeSafety.length > 0) {
    const before = updated.safetyFunctions.filter((s) => !s.isBasicScope).length;
    updated = removeSafetyFunctions(updated, changes.removeSafety);
    const after = updated.safetyFunctions.filter((s) => !s.isBasicScope).length;
    appliedSummary.push(`Removed ${before - after} safety option(s) (${changes.removeSafety.join(", ")})`);
  }
  if (changes.addSafety && changes.addSafety.length > 0) {
    for (const code of changes.addSafety) {
      const sf = catalogSafetyFunctions.find(
        (s) => s.orderCode === code || s.id === code
      );
      if (sf) {
        updated = addSafetyFunction(updated, sf);
        appliedSummary.push(`Added safety ${sf.orderCode || sf.id} (${sf.name})`);
      } else {
        appliedSummary.push(`⚠ Safety ${code} not found in catalog`);
      }
    }
  }

  // Always refresh cables after a modify — motor swaps change shaft height
  // (and so the cable cross-section), control unit swaps may change S120↔S210
  // routing, and option/safety changes don't affect cables but the cost is
  // negligible and a single source of truth is safer than per-branch logic.
  updated = regenerateCablesFor(updated);

  // If the AI claimed a change but none of our apply branches fired, tell
  // the user instead of silently pretending it worked.
  const warnings = [...(instruction.warnings ?? [])];
  if (appliedSummary.length === 0) {
    warnings.push(
      "The AI's response didn't match any known change type — configuration left unchanged. Try rephrasing with a specific component name (e.g. \"swap spindle motor to 1PH8163\") or order code (e.g. \"add M72\")."
    );
  }

  return {
    updatedConfiguration: appliedSummary.length > 0 ? updated : undefined,
    hadChanges: appliedSummary.length > 0,
    summary:
      instruction.summary ||
      appliedSummary.join("; ") ||
      "No actionable change — configuration unchanged.",
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function parseNumeric(s?: string): number | undefined {
  if (!s) return undefined;
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : undefined;
}

// Hint to find drives by ID prefix — utility kept for clarity in callers
export type _UnusedDriveTypes = DriveComponent | Motor;
