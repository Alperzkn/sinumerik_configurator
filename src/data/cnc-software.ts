import type { CncSoftware } from "@/types/catalog";

const allUnitsOption = {
  PPU_1740: "option" as const,
  NCU_1740: "option" as const,
  NCU_1750: "option" as const,
  NCU_1760: "option" as const,
};

export const cncSoftwareOptions: CncSoftware[] = [
  {
    id: "cnc-sw-31-3-export-6.25-sp1",
    articleNumber: "6FC5852-1YG25-1YA0",
    variant: "export",
    swVersion: "6.25",
    spLevel: "SP1",
    deliveryFormat: "sd_card_with_license",
    languages: ["de", "en", "fr", "es", "it", "pt", "zh", "ja", "ko"],
    compatibility: allUnitsOption,
    requiresExportApproval: false,
    description:
      "CNC software 31-3, export version, V6.25 SP1 on SD card with license. Standard delivery for machines without export-restricted features.",
  },
  {
    id: "cnc-sw-31-3-export-6.25",
    articleNumber: "6FC5852-1YG00-0YA0",
    variant: "export",
    swVersion: "6.25",
    deliveryFormat: "sd_card_with_license",
    languages: ["de", "en", "fr", "es", "it", "pt", "zh", "ja", "ko"],
    compatibility: allUnitsOption,
    requiresExportApproval: false,
    description:
      "CNC software 31-3, export version, V6.25 on SD card with license.",
  },
  {
    id: "cnc-sw-31-3-full-6.25-sp1",
    articleNumber: "6FC5852-1XG25-1YA0",
    variant: "full_scope",
    swVersion: "6.25",
    spLevel: "SP1",
    deliveryFormat: "sd_card_with_license",
    languages: ["de", "en", "fr", "es", "it", "pt", "zh", "ja", "ko"],
    compatibility: allUnitsOption,
    requiresExportApproval: true,
    description:
      "CNC software 31-3, full scope version, V6.25 SP1 on SD card with license. Requires export approval. Includes 5-axis transformation and other restricted functions.",
  },
  {
    id: "cnc-sw-31-3-full-6.25",
    articleNumber: "6FC5852-1XG00-0YA0",
    variant: "full_scope",
    swVersion: "6.25",
    deliveryFormat: "sd_card_with_license",
    languages: ["de", "en", "fr", "es", "it", "pt", "zh", "ja", "ko"],
    compatibility: allUnitsOption,
    requiresExportApproval: true,
    description:
      "CNC software 31-3, full scope version, V6.25 on SD card with license. Requires export approval.",
  },
  {
    id: "cnc-sw-31-3-export-6.15-sp5",
    articleNumber: "6FC5852-1YG15-5YA0",
    variant: "export",
    swVersion: "6.15",
    spLevel: "SP5",
    deliveryFormat: "sd_card_with_license",
    languages: ["de", "en", "fr", "es", "it", "pt", "zh", "ja", "ko"],
    compatibility: allUnitsOption,
    requiresExportApproval: false,
    description:
      "CNC software 31-3, export version, V6.15 SP5 on SD card with license. Previous major release with latest service pack.",
  },
  {
    id: "cnc-sw-31-3-full-6.15-sp5",
    articleNumber: "6FC5852-1XG15-5YA0",
    variant: "full_scope",
    swVersion: "6.15",
    spLevel: "SP5",
    deliveryFormat: "sd_card_with_license",
    languages: ["de", "en", "fr", "es", "it", "pt", "zh", "ja", "ko"],
    compatibility: allUnitsOption,
    requiresExportApproval: true,
    description:
      "CNC software 31-3, full scope version, V6.15 SP5 on SD card with license. Requires export approval.",
  },
];
