import type { GeneratedConfiguration } from "@/types/catalog";
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
  setHandheldTerminal,
  setIoModule,
  regenerateCablesFor,
  setAxisCounts,
} from "./config-mutations";
import { sizeConfiguration, type UserSpecsInput } from "@/lib/sizing";
import { selectLineModule } from "@/lib/validation/drive-system-rules";
import { softwareOptions as softwareOptionsOne } from "@/data/software-options";
import { softwareOptions828d } from "@/data/software-options-828d";
const catalogOptions = [...softwareOptionsOne, ...softwareOptions828d];
import { technologyPackages as catalogPackages } from "@/data/technology-packages";
import { safetyFunctions as catalogSafetyFunctions } from "@/data/safety";
import { cncSoftwareOptions as catalogCncSoftware } from "@/data/cnc-software";
import { hmiComponents as catalogHmi } from "@/data/hmi-components";
import { diffConfigurations } from "@/lib/history/diff";
import { telemetryHeaders } from "@/lib/telemetry/client";
import { AiServiceError } from "./recommendation-engine";

export interface ModifyResult {
  updatedConfiguration?: GeneratedConfiguration;
  /** True when at least one apply branch actually mutated the config. */
  hadChanges?: boolean;
  summary: string;
  warnings?: string[];
  /** Primary key of the persisted ai_traces row — used by FeedbackPill. */
  traceRowId?: string;
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

    /** Handheld terminal & machine I/O module */
    handheldUnit?: "none" | "ht2" | "ht10";
    ioModule?: "none" | "pp_72_48" | "et200sp";

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
  const configSummary = buildCurrentConfigSummary(current);

  const tHeaders = telemetryHeaders();
  const { traceRowId, ...telHeaderObj } = tHeaders;

  const response = await fetch("/api/modify", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...telHeaderObj },
    body: JSON.stringify({ configSummary, userMessage: userRequest }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const raw = (body?.error as string) ?? "ai_error";
    const msg = (body?.message as string) ?? response.statusText;
    const known = [
      "ai_unavailable",
      "ai_parse_failed",
      "ai_response_truncated",
      "ai_timeout",
    ] as const;
    type Known = (typeof known)[number];
    const code: Known | "ai_error" = (known as readonly string[]).includes(raw)
      ? (raw as Known)
      : "ai_error";
    throw new AiServiceError(code, msg, response.status);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const instruction = normaliseInstruction(raw);
  const result = applyModifications(current, instruction, baselineSpecs);
  result.traceRowId = traceRowId;
  return result;
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

  // Handheld terminal — accept "ht2" / "ht10" / "none" / "HT 2" / "HT 10" /
  // article numbers / { type: "ht10" } / { id: "handheld_ht10" }
  const hhRaw = pickStr(inChanges.handheldUnit, inChanges.handheld, inChanges.handheldTerminal);
  if (hhRaw) {
    const lc = hhRaw.toLowerCase().replace(/\s+/g, "");
    if (lc.includes("ht10") || lc.includes("handheld_ht10") || lc === "0aa20") {
      out.handheldUnit = "ht10";
    } else if (lc.includes("ht2") || lc.includes("handheld_ht2") || lc === "0ca0") {
      out.handheldUnit = "ht2";
    } else if (lc === "none" || lc === "remove" || lc === "no") {
      out.handheldUnit = "none";
    }
  }

  // I/O module — accept "pp_72_48" / "pp72/48" / "et200sp" / "none" / objects
  const ioRaw = pickStr(inChanges.ioModule, inChanges.io, inChanges.ioModuleType);
  if (ioRaw) {
    const lc = ioRaw.toLowerCase().replace(/[\s/_-]+/g, "");
    if (lc.includes("et200")) {
      out.ioModule = "et200sp";
    } else if (lc.includes("pp7248") || lc.includes("pp7248d") || lc.includes("pp72")) {
      out.ioModule = "pp_72_48";
    } else if (lc === "none" || lc === "remove" || lc === "no") {
      out.ioModule = "none";
    }
  }

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

/** Server-side only (see /api/modify) — builds the instruction framing around the config summary. */
export function buildModifyPrompt(currentSummary: string): string {
  return `You are a SINUMERIK ONE configuration modifier. You translate a natural-language modification request into a structured JSON instruction that a deterministic apply layer will execute.

CURRENT CONFIGURATION (ground truth — do NOT echo these values back as the change):
${currentSummary}

═══════════════════════════════════════════════════════════════════
THE THREE INVIOLABLE RULES
═══════════════════════════════════════════════════════════════════
1. Output JSON ONLY — no markdown fences, no prose before or after.
2. NEVER set a field to its CURRENT value. If the user asks to change
   the control unit FROM NCU_1740 TO NCU_1760, you MUST output
   "controlUnitId": "NCU_1760" — never "NCU_1740". Echoing the current
   value is a no-op and produces a "configuration unchanged" error.
3. The "changes" OBJECT IS WHERE THE WORK HAPPENS. The "summary" field
   is a human-readable note that the apply layer IGNORES. If you only
   write a summary and leave changes empty, NOTHING WILL CHANGE.

═══════════════════════════════════════════════════════════════════
SCHEMA
═══════════════════════════════════════════════════════════════════
{
  "action": "swap" | "add" | "remove" | "resize" | "no_change",
  "changes": {
    /* CONTROL UNIT — pick ONE of the four targets below, never the current one */
    "controlUnitId": "PPU_1740" | "NCU_1740" | "NCU_1750" | "NCU_1760",
    /* — or by article number — */
    "controlUnitArticle": "6FC5317-..." ,

    "cncSoftwareVariant": "export" | "full_scope",

    "preferActiveLineModule": true | false,
    "lineModuleArticle": "6SL3130-...",
    "feedMotorArticle": "1FT7...",
    "spindleMotorArticle": "1PH8...",
    "feedMotorModuleArticle": "6SL3120-...",
    "spindleMotorModuleArticle": "6SL3120-...",

    "hmiPanelSizeInch": 12 | 15 | 19 | 22 | 24,
    "hmiArticle": "6AV6646-...",
    "mcpArticle": "6FC5303-...",

    "handheldUnit": "none" | "ht2" | "ht10",
    "ioModule":     "none" | "pp_72_48" | "et200sp",

    "userSpecsOverride": {
      "spindlePowerKw": 30, "spindleMaxRpm": 12000,
      "movingMassKg": 500, "rapidTraverseMpm": 40,
      "feedMotorFamily": "1FT2"|"1FT7"|"1FK2",
      "spindleMotorFamily": "1PH8"
    },

    "addOptions":    [{ "orderCode": "M72", "quantity": 1, "reason": "..." }],
    "removeOptions": ["A05"],
    "addPackages":   [{ "id": "S43", "reason": "..." }],
    "removePackages":["S41"],

    "addSafety":    ["S60", "S61"],
    "removeSafety": ["S60", "S61", "K06"]
  },
  "summary": "1-3 sentences explaining what changed",
  "warnings": ["Optional: things the user should verify"]
}

═══════════════════════════════════════════════════════════════════
CONTROL UNIT MAPPING (memorise — these are the ONLY four valid IDs)
═══════════════════════════════════════════════════════════════════
PPU_1740  →  6FC5317-4AA00-1CA0 (panel 15") / 6FC5317-4AA00-1DA0 (panel 19")
NCU_1740  →  6FC5317-4AA00-0AA0   (cabinet, 20 axes max, 4 channels)
NCU_1750  →  6FC5317-5AA00-0AA1   (cabinet, 40 axes, 10 channels, 5-axis)
NCU_1760  →  6FC5317-6AA00-0AA0   (cabinet, 50 axes, 10 channels, HSC)

═══════════════════════════════════════════════════════════════════
FEW-SHOT EXAMPLES — copy this pattern
═══════════════════════════════════════════════════════════════════

Example 1 — "Change to NCU 1760 for HSC"
{
  "action": "swap",
  "changes": { "controlUnitId": "NCU_1760" },
  "summary": "Upgraded control unit from current to NCU 1760 for HSC capability."
}

Example 2 — "Switch to full scope CNC software"
{
  "action": "swap",
  "changes": { "cncSoftwareVariant": "full_scope" },
  "summary": "Switched CNC software to full-scope variant."
}

Example 3 — "Use Active Line Module 55kW"
{
  "action": "swap",
  "changes": { "lineModuleArticle": "6SL3130-7TE25-5AA3" },
  "summary": "Switched to Active Line Module 55 kW with regeneration."
}

Example 4 — "Add S43 5-axis package"
{
  "action": "add",
  "changes": { "addPackages": [{ "id": "S43", "reason": "5-axis upgrade" }] },
  "summary": "Added Dynamics 5-Axis package."
}

Example 5 — "Make spindle 30 kW"  (deterministic re-size — no specific article)
{
  "action": "resize",
  "changes": { "userSpecsOverride": { "spindlePowerKw": 30 } },
  "summary": "Re-sized spindle motor for 30 kW requirement."
}

Example 6 — "Use 1FK2 motors"
{
  "action": "resize",
  "changes": { "userSpecsOverride": { "feedMotorFamily": "1FK2" } },
  "summary": "Re-sized feed motors using the 1FK2 family."
}

Example 7 — "Remove all safety options"
{
  "action": "remove",
  "changes": { "removeSafety": ["S60", "S61", "K06"] },
  "summary": "Removed extended safety. Basic safety (STO/SS1/SBC) is hardware and remains."
}

Example 8 — "Add HT 10 handheld" (or "include a handheld terminal")
{
  "action": "add",
  "changes": { "handheldUnit": "ht10" },
  "summary": "Added SINUMERIK HT 10 handheld terminal (with default 5 m cable)."
}

Example 8b — "Add HT 2 handheld unit" / "I want a HT2"
{
  "action": "add",
  "changes": { "handheldUnit": "ht2" },
  "summary": "Added SINUMERIK HT 2 handheld terminal (with basic PN module + spiral cable)."
}
NOTE: HT 2 / HT 10 are HARDWARE units. NEVER substitute a software
option (P17 ShopTurn/ShopMill, S00 Operate, etc.) when the user asks
for a handheld terminal — handheldUnit IS the only correct field.
The apply layer auto-bundles the connection module + cable.

Example 9 — "Switch I/O to ET 200SP" (or "use modular I/O")
{
  "action": "swap",
  "changes": { "ioModule": "et200sp" },
  "summary": "Switched machine I/O from PP 72/48 to ET 200SP modular distributed I/O."
}

Example 10 — Request the AI cannot translate
{
  "action": "no_change",
  "changes": {},
  "summary": "I'm not sure which component to change — please specify (control unit, motor, line module, …).",
  "warnings": ["Try \"swap spindle motor to 1PH8163\" or \"add option M72\"."]
}

═══════════════════════════════════════════════════════════════════
AVAILABLE MOTOR FAMILIES
═══════════════════════════════════════════════════════════════════
- Feed servo:    1FT7 (compact + forced vent), 1FT2 (newer compact),
                 1FK2 (S210 OCC only)
- Main spindle:  1PH8 (async 1000/1500/2000 rpm + sync HighSpeed)
- Built-in:      1FE1 (sync high-speed), 1FE2 (async ultra-high-speed)
- Linear:        1FN3 (direct-drive linear axes)
- Torque:        1FW6 (frameless rotary — swivel heads, rotary tables)
ALL of the above are valid — NEVER tell the user a family is unsupported.
For a family swap use userSpecsOverride.{feed,spindle}MotorFamily.

═══════════════════════════════════════════════════════════════════
ROUTING RULES
═══════════════════════════════════════════════════════════════════
- Motor sizing change (kW / rpm / mass) → userSpecsOverride.
- Family swap                          → userSpecsOverride.{feed,spindle}MotorFamily.
- Specific article swap                 → *Article fields directly.
- Active vs Smart line module flip      → preferActiveLineModule: true (the sizing engine re-picks the right power).
- HMI panel size change                 → hmiPanelSizeInch (MCP re-matched automatically).
- CNC SW variant                        → cncSoftwareVariant.
- Software options                      → addOptions / removeOptions / addPackages / removePackages with order codes.
- Handheld terminal request             → handheldUnit ("ht2" / "ht10" / "none"). NEVER tell the user a handheld is unsupported — it IS supported.
- I/O module change                     → ioModule ("pp_72_48" / "et200sp" / "none").
- Safety:
   * Basic safety (STO/SS1/SBC) is HARDWARE — never appears in addSafety / removeSafety.
   * Removing S60 cascades — also remove S61 and any K* codes.
   * Adding S61 requires S60 — include both.
- Include ONLY fields that change. Omit unchanged fields entirely.
- If you genuinely cannot translate the request, return action: "no_change" with a helpful warning explaining what wording would work.
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

    const sized = sizeConfiguration({ userSpecs: merged, template: null, controlFamily: current.family });
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
    // Axis counts change quantities, drives, licences and cables — not just the motor.
    const o = changes.userSpecsOverride;
    if (o.feedAxisCount !== undefined || o.spindleCount !== undefined) {
      updated = setAxisCounts(updated, { feedAxes: o.feedAxisCount, spindleAxes: o.spindleCount });
      appliedSummary.push(`Axis count set to ${updated.totalAxes} (feed ${o.feedAxisCount ?? "unchanged"}, spindles ${o.spindleCount ?? "unchanged"})`);
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
  if (changes.handheldUnit) {
    const before = updated.hmiComponents.find((h) => h.category === "handheld_terminal");
    updated = setHandheldTerminal(updated, changes.handheldUnit, catalogHmi);
    const after = updated.hmiComponents.find((h) => h.category === "handheld_terminal");
    if (before?.id !== after?.id) {
      const label = changes.handheldUnit === "none" ? "removed" : changes.handheldUnit.toUpperCase();
      appliedSummary.push(`Handheld terminal → ${label}`);
    }
  }
  if (changes.ioModule) {
    const before = updated.hmiComponents.find((h) => h.category === "io_module");
    updated = setIoModule(updated, changes.ioModule, catalogHmi);
    const after = updated.hmiComponents.find((h) => h.category === "io_module");
    if (before?.id !== after?.id) {
      const label =
        changes.ioModule === "none"
          ? "removed"
          : changes.ioModule === "et200sp"
            ? "ET 200SP"
            : "PP 72/48";
      appliedSummary.push(`I/O module → ${label}`);
    }
  }

  // 4. Software options
  // Safety codes (S60/S61/K01..K09) are canonical SafetyFunctions, not
  // SoftwareOptions. If the AI routes one here by mistake, reroute to the
  // safety path so the user gets the correct entry.
  const isSafetyCode = (code: string) => /^(S60|S61|K0\d)$/i.test(code);

  if (changes.addOptions) {
    for (const a of changes.addOptions) {
      if (isSafetyCode(a.orderCode)) {
        const sf = catalogSafetyFunctions.find(
          (s) => s.orderCode === a.orderCode || s.id === a.orderCode
        );
        if (sf) {
          updated = addSafetyFunction(updated, sf);
          appliedSummary.push(`Added safety ${sf.orderCode || sf.id} (${sf.name}) [rerouted from addOptions]`);
        } else {
          appliedSummary.push(`⚠ Safety ${a.orderCode} not found`);
        }
        continue;
      }
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
    const safetyToRemove: string[] = [];
    const optionsToRemove: string[] = [];
    for (const id of changes.removeOptions) {
      if (isSafetyCode(id)) safetyToRemove.push(id);
      else optionsToRemove.push(id);
    }
    if (safetyToRemove.length > 0) {
      const before = updated.safetyFunctions.filter((s) => !s.isBasicScope).length;
      updated = removeSafetyFunctions(updated, safetyToRemove);
      const after = updated.safetyFunctions.filter((s) => !s.isBasicScope).length;
      if (after < before) {
        appliedSummary.push(`Removed ${before - after} safety option(s) (${safetyToRemove.join(", ")}) [rerouted from removeOptions]`);
      }
    }
    for (const id of optionsToRemove) {
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

  // Ground hadChanges in an ACTUAL MLFB-level diff — not in "we called
  // applySwap". The AI sometimes returns the current value (e.g.
  // controlUnitId: "NCU_1740" when the user asked for NCU_1760), which
  // fires the apply branch but produces a no-op swap. That used to mark
  // hadChanges=true and trigger a misleading "Configuration updated" toast.
  const diff = diffConfigurations(current, updated);
  const actuallyChanged = diff.totalChanges > 0;

  const warnings = [...(instruction.warnings ?? [])];
  if (!actuallyChanged) {
    if (appliedSummary.length > 0) {
      warnings.push(
        "The AI's response was applied but didn't change any article number — it may have returned the current value by mistake. Try rephrasing with the exact target (e.g. \"swap control unit to 6FC5317-6AA00-0AA0 (NCU 1760)\")."
      );
    } else {
      warnings.push(
        "The AI's response didn't match any known change type — configuration left unchanged. Try rephrasing with a specific component name (e.g. \"swap spindle motor to 1PH8163\") or order code (e.g. \"add M72\")."
      );
    }
  }

  return {
    updatedConfiguration: actuallyChanged ? updated : undefined,
    hadChanges: actuallyChanged,
    summary: actuallyChanged
      ? instruction.summary || appliedSummary.join("; ") || "Configuration updated."
      : // Do NOT echo AI's claim when reality disagrees — that's how the
        // "Configuration updated" bug reached the user. Give ground truth.
        "Nothing changed — AI's intent couldn't be translated into a real MLFB change.",
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function parseNumeric(s?: string): number | undefined {
  if (!s) return undefined;
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : undefined;
}

