import type { GeneratedConfiguration } from "@/types/catalog";
import { applySwap } from "./config-mutations";

export interface ModifyResult {
  updatedConfiguration?: GeneratedConfiguration;
  summary: string;
  warnings?: string[];
}

/**
 * Sends a modification request to the AI along with the current configuration.
 * The AI returns a partial config update which is merged into the existing config.
 */
export async function modifyConfiguration(
  current: GeneratedConfiguration,
  userRequest: string
): Promise<ModifyResult> {
  const currentSummary = buildCurrentConfigSummary(current);

  const systemPrompt = `You are a SINUMERIK ONE CNC configuration expert helping modify an existing configuration.

The user has an existing SINUMERIK ONE configuration and wants to make a specific change. Analyze their request and respond with JSON describing what to change.

Current configuration:
${currentSummary}

Respond with JSON ONLY (no markdown). Schema:
{
  "action": "swap" | "add" | "remove" | "no_change",
  "changes": {
    "controlUnit": { "articleNumber": "...", "reason": "..." },
    "lineModule": { "articleNumber": "...", "reason": "..." },
    "feedMotor": { "articleNumber": "...", "shaftHeight": 63, "reason": "..." },
    "spindleMotor": { "articleNumber": "...", "shaftHeight": 132, "reason": "..." },
    "feedMotorModule": { "articleNumber": "...", "reason": "..." },
    "spindleMotorModule": { "articleNumber": "...", "reason": "..." },
    "addOptions": [{ "orderCode": "A03", "name": "...", "quantity": 3, "reason": "..." }],
    "addPackages": [{ "id": "S43", "reason": "..." }]
  },
  "summary": "Plain-language explanation of what changed (1-3 sentences)",
  "warnings": ["Optional list of side effects or things the user should verify"]
}

Available motor article numbers (examples):
- Feed motors: 1FT7064-5AF71-1DA1 (SH63, 9Nm, 3000rpm), 1FT7086-5AF71-1DA1 (SH80, 28Nm), 1FT7108-5AC71-1DA1 (SH100, 70Nm), 1FT7138-5AB71-1DA1 (SH132, 170Nm)
- Heavy-duty forced ventilation: 1FT7086-5SF71-1DA1 (SH80, 36Nm), 1FT7132-5SC71-1DA1 (SH132, 140Nm), 1FT7138-5SB71-1DA1 (SH132, 280Nm)
- Spindle motors: 1PH8107-1FF10-0LA1 (7.5kW@1500rpm), 1PH8133-1FF10-0LA1 (11kW), 1PH8137-1FF10-0LA1 (18.5kW), 1PH8163-1FF10-0LA1 (30kW), 1PH8186-1FF10-0LA1 (55kW)

Motor Module article numbers: 6SL3120-1TE13-0AD0 (3A), -0AD0 (5A), 6SL3120-1TE21-0AD0 (9A), -8AD0 (18A), 6SL3120-1TE22-4AD0 (24A), 6SL3120-1TE23-0AD0 (30A), 6SL3120-1TE24-5AC0 (45A), 6SL3120-1TE26-0AC0 (60A), 6SL3120-1TE28-5AA3 (85A), 6SL3120-1TE31-3AA3 (132A)

Line Modules: Smart: 6SL3130-6AE21-0AB1 (10kW), 6SL3130-6TE23-6AA3 (36kW), 6SL3130-6TE25-5AA3 (55kW). Active: 6SL3130-7TE21-6AA4 (16kW), 6SL3130-7TE23-6AA3 (36kW), 6SL3130-7TE25-5AA3 (55kW), 6SL3130-7TE28-0AA3 (80kW)

Control Units: PPU_1740, NCU_1740, NCU_1750, NCU_1760

IMPORTANT: When swapping a motor to a larger size, also update the Motor Module AND Line Module to handle the increased current/power. Only return fields that need to change. Include only real, complete article numbers.`;

  const response = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      userMessage: userRequest,
      conversationHistory: [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Modification failed: ${response.statusText}`);
  }

  const data = await response.json();

  // Apply changes to the configuration
  return applyModifications(current, data);
}

function buildCurrentConfigSummary(config: GeneratedConfiguration): string {
  const feedMotor = config.motors.find((m) => m.motorType === "feed_servo_sync");
  const spindleMotor = config.motors.find((m) =>
    m.motorType === "main_spindle_async" || m.motorType === "main_spindle_sync"
  );
  const lineModule = config.drives.find((d) =>
    d.componentType === "line_module_active" ||
    d.componentType === "line_module_smart" ||
    d.componentType === "line_module_basic"
  );
  const feedMm = config.drives.find((d) => d.id.startsWith("feed-mm-"));
  const spindleMm = config.drives.find((d) => d.id.startsWith("spindle-mm-"));

  return `
- Control Unit: ${config.controlUnit.id} (${config.controlUnit.articleNumber})
- CNC Software: ${config.softwareVariant} SW ${config.cncSoftware.swVersion}
- Technology Packages: ${config.technologyPackages.map((p) => p.orderCode).join(", ") || "None"}
- Software Options: ${config.softwareOptions.map((o) => o.orderCode).join(", ") || "None"}
- Feed Motor: ${feedMotor?.articleNumber || "?"} (${feedMotor?.ratedTorque || "?"} @ ${feedMotor?.ratedSpeed || "?"})
- Feed Motor Module: ${feedMm?.articleNumber || "?"} (${feedMm?.ratedCurrent || "?"}) x${config.driveQuantities[feedMm?.id || ""] || 0}
- Spindle Motor: ${spindleMotor?.articleNumber || "none"} (${spindleMotor?.ratedPower || "?"})
- Spindle Motor Module: ${spindleMm?.articleNumber || "?"}
- Line Module: ${lineModule?.articleNumber || "?"} (${lineModule?.name || "?"})
- HMI: ${config.hmiComponents.find((h) => h.category === "thin_client" || h.category === "ppu_panel" || h.category === "panel_pc")?.name || "?"}
- Safety: ${config.safetyFunctions.filter((s) => !s.isBasicScope).map((s) => s.orderCode).join(", ") || "Basic only"}
- Total axes: ${config.totalAxes}, Channels: ${config.totalChannels}
`.trim();
}

interface ModifyChanges {
  action?: string;
  changes?: {
    controlUnit?: { articleNumber: string; reason: string };
    lineModule?: { articleNumber: string; reason: string };
    feedMotor?: { articleNumber: string; shaftHeight?: number; reason: string };
    spindleMotor?: { articleNumber: string; shaftHeight?: number; reason: string };
    feedMotorModule?: { articleNumber: string; reason: string };
    spindleMotorModule?: { articleNumber: string; reason: string };
    addOptions?: { orderCode: string; name: string; quantity: number; reason: string }[];
    addPackages?: { id: string; reason: string }[];
  };
  summary?: string;
  warnings?: string[];
}

function applyModifications(
  current: GeneratedConfiguration,
  response: ModifyChanges
): ModifyResult {
  if (!response.changes || response.action === "no_change") {
    return {
      summary: response.summary || "No changes made.",
      warnings: response.warnings,
    };
  }

  let updated = { ...current };
  const { changes } = response;

  // Apply swaps
  if (changes.lineModule) {
    updated = applySwap(updated, "line_module", changes.lineModule.articleNumber);
  }
  if (changes.feedMotor) {
    updated = applySwap(updated, "motor_feed", changes.feedMotor.articleNumber, {
      shaftHeight: changes.feedMotor.shaftHeight,
    });
  }
  if (changes.spindleMotor) {
    updated = applySwap(updated, "motor_spindle", changes.spindleMotor.articleNumber, {
      shaftHeight: changes.spindleMotor.shaftHeight,
    });
  }
  if (changes.feedMotorModule) {
    updated = applySwap(updated, "motor_module_feed", changes.feedMotorModule.articleNumber);
  }
  if (changes.spindleMotorModule) {
    updated = applySwap(updated, "motor_module_spindle", changes.spindleMotorModule.articleNumber);
  }
  if (changes.controlUnit) {
    updated = applySwap(updated, "control_unit", changes.controlUnit.articleNumber);
  }

  return {
    updatedConfiguration: updated,
    summary: response.summary || "Configuration updated.",
    warnings: response.warnings,
  };
}
