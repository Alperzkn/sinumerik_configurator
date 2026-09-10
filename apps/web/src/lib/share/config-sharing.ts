import type { GeneratedConfiguration, MachineType } from "@/types/catalog";
import { buildBom } from "@/lib/export/bom";
import type { MachineSpecsState } from "@/store/configurator-store";

/**
 * Payload carried alongside the human-readable markdown so the full
 * wizard state can be restored deterministically on paste. Same shape
 * as saved-configs.ts `SavedConfig.data` to keep the two paths aligned.
 */
export interface SharedConfigPayload {
  machineDescription: string;
  selectedTemplate: MachineType | null;
  machineSpecs: MachineSpecsState;
  configuration: GeneratedConfiguration;
}

const PAYLOAD_TAG = "sinumerik-config-payload:v1";
const PAYLOAD_REGEX = new RegExp(
  `<!--\\s*${PAYLOAD_TAG}\\s+([A-Za-z0-9+/=]+)\\s*-->`
);

/**
 * base64 encode/decode that works in browser (btoa) and node (Buffer)
 * and tolerates Unicode via %-encoding.
 */
function encodeBase64(text: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(unescape(encodeURIComponent(text)));
  }
  return Buffer.from(text, "utf-8").toString("base64");
}

function decodeBase64(b64: string): string {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return decodeURIComponent(escape(window.atob(b64)));
  }
  return Buffer.from(b64, "base64").toString("utf-8");
}

/**
 * Serialize a full configuration snapshot into a shareable markdown blob.
 * Humans see a readable BOM; the app can round-trip via the trailing
 * base64 payload comment.
 */
export function serializeConfigAsShareableText(
  payload: SharedConfigPayload,
  opts?: { title?: string }
): string {
  const { configuration: cfg, selectedTemplate, machineSpecs, machineDescription } = payload;
  const title = opts?.title?.trim() || "Shared configuration";
  const today = new Date().toISOString().split("T")[0];

  const lines: string[] = [];
  lines.push(`# SINUMERIK ONE — ${title}`);
  lines.push("");
  lines.push(`**Generated**: ${today}`);
  if (selectedTemplate) {
    lines.push(`**Template**: ${selectedTemplate.replace(/_/g, " ")}`);
  }
  lines.push(
    `**Control Unit**: ${cfg.controlUnit.id.replace(/_/g, " ")} (${cfg.controlUnit.articleNumber})`
  );
  lines.push(
    `**CNC Software**: ${cfg.softwareVariant} — ${cfg.cncSoftware.swVersion}${cfg.cncSoftware.spLevel ? " " + cfg.cncSoftware.spLevel : ""}`
  );
  lines.push(`**Axes / Channels**: ${cfg.totalAxes} axes, ${cfg.totalChannels} channel(s)`);
  lines.push(`**Complexity**: ${cfg.estimatedComplexity}`);

  if (machineDescription.trim()) {
    lines.push("");
    lines.push("## Machine description");
    lines.push(machineDescription.trim());
  }

  const specsFilled = Object.entries(machineSpecs).filter(([, v]) => String(v || "").trim());
  if (specsFilled.length > 0) {
    lines.push("");
    lines.push("## Mechanical specs");
    for (const [k, v] of specsFilled) {
      lines.push(`- **${k}**: ${v}`);
    }
  }

  lines.push("");
  lines.push("## Bill of materials");
  lines.push("");
  lines.push("| # | MLFB | Qty | Description | Category |");
  lines.push("|---|------|-----|-------------|----------|");

  const rows = buildBom(cfg).map((l) => ({
    mlfb: l.articleNumber,
    qty: l.quantity,
    name: l.name,
    category: l.category,
    orderCode: l.orderCode,
  }));

  rows.forEach((r, i) => {
    const description = r.orderCode ? `${r.name} (${r.orderCode})` : r.name;
    // Pipe-escape the description so markdown stays valid.
    const safeDesc = description.replace(/\|/g, "\\|");
    const safeMlfb = r.mlfb.replace(/\|/g, "\\|");
    lines.push(`| ${i + 1} | \`${safeMlfb}\` | ${r.qty} | ${safeDesc} | ${r.category} |`);
  });

  if (cfg.notes.length > 0) {
    lines.push("");
    lines.push("## Notes");
    for (const note of cfg.notes) lines.push(`- ${note}`);
  }

  const warnings = cfg.warnings || [];
  if (warnings.length > 0) {
    lines.push("");
    lines.push("## Warnings");
    for (const w of warnings) {
      lines.push(`- **${w.severity}**: ${w.message}`);
    }
  }

  const payloadJson = JSON.stringify(payload);
  const encoded = encodeBase64(payloadJson);
  lines.push("");
  lines.push(
    "> Paste this whole message into the SINUMERIK configurator's \"Import\" dialog to load the exact configuration. You can optionally add a change request to modify it in one step."
  );
  lines.push("");
  lines.push(`<!-- ${PAYLOAD_TAG} ${encoded} -->`);

  return lines.join("\n");
}

/** Error thrown when shared text can't be decoded. */
export class ShareParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShareParseError";
  }
}

/**
 * Extract the configuration payload from shared text produced by
 * `serializeConfigAsShareableText`. Also accepts:
 *   - a raw JSON SharedConfigPayload (for convenience)
 *   - a SavedConfig JSON (same shape under .data)
 * Throws ShareParseError with an actionable message on failure.
 */
export function parseSharedConfigText(text: string): SharedConfigPayload {
  const trimmed = text.trim();
  if (!trimmed) throw new ShareParseError("Paste is empty.");

  // 1. Look for the embedded base64 payload marker
  const match = trimmed.match(PAYLOAD_REGEX);
  if (match) {
    let json: string;
    try {
      json = decodeBase64(match[1]);
    } catch {
      throw new ShareParseError("Embedded payload is not valid base64.");
    }
    try {
      const parsed = JSON.parse(json);
      return validateSharedConfigPayload(parsed);
    } catch (e) {
      throw new ShareParseError(
        e instanceof ShareParseError
          ? e.message
          : "Embedded payload is not valid JSON."
      );
    }
  }

  // 2. Try raw JSON — either SharedConfigPayload or SavedConfig shape
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      if ("data" in parsed && parsed.data && typeof parsed.data === "object") {
        return validateSharedConfigPayload(parsed.data);
      }
      return validateSharedConfigPayload(parsed);
    }
  } catch {
    // fall through
  }

  throw new ShareParseError(
    "Could not find a configuration payload. Paste the full shared text (including the trailing <!-- sinumerik-config-payload --> line) or a .json export."
  );
}

function validateSharedConfigPayload(value: unknown): SharedConfigPayload {
  if (!value || typeof value !== "object") {
    throw new ShareParseError("Payload is not an object.");
  }
  const v = value as Record<string, unknown>;
  const cfg = v.configuration as GeneratedConfiguration | undefined;
  if (!cfg || typeof cfg !== "object") {
    throw new ShareParseError("Payload is missing the `configuration` field.");
  }
  if (!cfg.controlUnit || !cfg.cncSoftware) {
    throw new ShareParseError("Configuration payload looks corrupt (missing controlUnit/cncSoftware).");
  }
  return {
    machineDescription: typeof v.machineDescription === "string" ? v.machineDescription : "",
    selectedTemplate:
      (v.selectedTemplate as MachineType | null | undefined) ?? null,
    machineSpecs: (v.machineSpecs as MachineSpecsState) ?? {
      axisTravel: "",
      movingMass: "",
      rapidTraverse: "",
      spindlePower: "",
      spindleSpeed: "",
      material: "",
      machineSize: "",
      safetyLevel: "",
      handheldUnit: "",
      ioModule: "",
      cableLengthMeters: "",
    },
    configuration: cfg,
  };
}
