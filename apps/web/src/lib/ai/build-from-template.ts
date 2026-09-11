import type { ControlSystemFamily, GeneratedConfiguration, MachineType } from "@/types/catalog";
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
  specs: UserSpecsInput,
  family: ControlSystemFamily = "sinumerik_one"
): Promise<GeneratedConfiguration | null> {
  const architecture = getTemplateArchitecture(template, family);
  if (!architecture) return null;

  // Lazy-load the catalog (all families) and register it with the parser
  const { catalogBundle } = await import("@/data/catalog-bundle");
  setCatalogData(catalogBundle);

  return parseAiResponse(architecture, specs, template, family);
}
