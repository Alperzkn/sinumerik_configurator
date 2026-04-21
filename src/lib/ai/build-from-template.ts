import type { GeneratedConfiguration, MachineType } from "@/types/catalog";
import { parseAiResponse, setCatalogData } from "./response-parser";
import { getTemplateArchitecture } from "./template-architectures";
import type { UserSpecsInput } from "@/lib/sizing";

/**
 * Build a complete GeneratedConfiguration for a known machine template
 * without calling the AI. Uses the same response-parser pipeline as the
 * AI flow so the result (motor sizing, line module, MCP matching, cables)
 * is identical — just skips the AI round-trip.
 *
 * Returns null if the template has no pre-defined architecture.
 */
export async function buildConfigFromTemplate(
  template: MachineType,
  specs: UserSpecsInput
): Promise<GeneratedConfiguration | null> {
  const architecture = getTemplateArchitecture(template);
  if (!architecture) return null;

  // Lazy-load the catalog and register it with the response-parser
  const catalog = await import("@/data");
  setCatalogData({
    controlUnits: catalog.controlUnits,
    cncSoftware: catalog.cncSoftwareOptions,
    technologyPackages: catalog.technologyPackages,
    softwareOptions: catalog.softwareOptions,
    driveComponents: catalog.driveComponents,
    motors: catalog.motors,
    measuringSystems: catalog.measuringSystems,
    hmiComponents: catalog.hmiComponents,
    safetyFunctions: catalog.safetyFunctions,
    selectCables: catalog.selectCables,
  });

  return parseAiResponse(architecture, specs, template);
}
