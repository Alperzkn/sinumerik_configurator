import type { GeneratedConfiguration } from "@/types/catalog";

export interface ChangeItem {
  articleNumber: string;
  name: string;
  category: string;
  /** Set when quantity changed (kept undefined for plain add / remove) */
  prevQuantity?: number;
  newQuantity?: number;
}

export interface HistoryDiff {
  added: ChangeItem[];
  removed: ChangeItem[];
  quantityChanged: ChangeItem[];
  /** Total number of MLFB changes (sum of the three groups) */
  totalChanges: number;
}

interface ItemSlot {
  articleNumber: string;
  name: string;
  category: string;
  quantity: number;
}

/**
 * Flatten a configuration into a map of (articleNumber → slot). When the same
 * MLFB appears in multiple sections (rare but possible — same option article
 * shared across order codes) we combine them so the diff stays accurate.
 *
 * The map key is `${category}::${articleNumber}` so two different categories
 * sharing one MLFB still appear separately in the diff (they're ordered
 * differently in the BOM).
 */
function flatten(config: GeneratedConfiguration): Map<string, ItemSlot> {
  const map = new Map<string, ItemSlot>();
  const push = (slot: ItemSlot) => {
    const key = `${slot.category}::${slot.articleNumber}`;
    const existing = map.get(key);
    if (existing) existing.quantity += slot.quantity;
    else map.set(key, { ...slot });
  };

  // Control unit
  push({
    articleNumber: config.controlUnit.articleNumber,
    name: config.controlUnit.name,
    category: "Control Unit",
    quantity: 1,
  });

  // CNC software
  push({
    articleNumber: config.cncSoftware.articleNumber,
    name: config.cncSoftware.description,
    category: "CNC Software",
    quantity: 1,
  });

  // Technology packages
  for (const pkg of config.technologyPackages) {
    push({
      articleNumber: pkg.articleNumber,
      name: `${pkg.orderCode} — ${pkg.name}`,
      category: "Technology Package",
      quantity: 1,
    });
  }

  // Software options
  for (const opt of config.softwareOptions) {
    push({
      articleNumber: opt.articleNumber,
      name: `${opt.orderCode} — ${opt.name}`,
      category: "Software Option",
      quantity: config.optionQuantities[opt.id] || 1,
    });
  }

  // Drives
  for (const d of config.drives) {
    push({
      articleNumber: d.articleNumber,
      name: d.name,
      category: "Drive",
      quantity: config.driveQuantities[d.id] || 1,
    });
  }

  // Motors
  for (const m of config.motors) {
    if (!m.articleNumber) continue;
    push({
      articleNumber: m.articleNumber,
      name: m.name,
      category: "Motor",
      quantity: config.motorQuantities[m.id] || 1,
    });
  }

  // HMI / I/O / handheld / MCP / handwheel — all live on hmiComponents
  for (const h of config.hmiComponents) {
    push({
      articleNumber: h.articleNumber,
      name: h.name,
      category:
        h.category === "io_module"
          ? "I/O Module"
          : h.category === "handheld_terminal"
            ? "Handheld Terminal"
            : h.category === "mcp"
              ? "MCP"
              : "HMI",
      quantity: 1,
    });
  }

  // Safety (skip basic — that's hardware, never changes)
  for (const sf of config.safetyFunctions) {
    if (sf.isBasicScope || !sf.articleNumber) continue;
    push({
      articleNumber: sf.articleNumber,
      name: `${sf.orderCode || sf.id} — ${sf.name}`,
      category: "Safety",
      quantity: 1,
    });
  }

  // Cables
  for (const c of config.cables) {
    push({
      articleNumber: c.articleNumber,
      name: c.name,
      category: "Cable / Accessory",
      quantity: c.quantity,
    });
  }

  return map;
}

/**
 * Compute an MLFB-level diff between two configurations. Each ChangeItem
 * carries its category so the UI can group adds / removes / quantity changes.
 */
export function diffConfigurations(
  prev: GeneratedConfiguration | null | undefined,
  next: GeneratedConfiguration
): HistoryDiff {
  const nextMap = flatten(next);
  const prevMap = prev ? flatten(prev) : new Map<string, ItemSlot>();

  const added: ChangeItem[] = [];
  const removed: ChangeItem[] = [];
  const quantityChanged: ChangeItem[] = [];

  // Items in next that aren't in prev → added; or quantity changed
  for (const [key, nextSlot] of nextMap) {
    const prevSlot = prevMap.get(key);
    if (!prevSlot) {
      added.push({
        articleNumber: nextSlot.articleNumber,
        name: nextSlot.name,
        category: nextSlot.category,
        newQuantity: nextSlot.quantity,
      });
    } else if (prevSlot.quantity !== nextSlot.quantity) {
      quantityChanged.push({
        articleNumber: nextSlot.articleNumber,
        name: nextSlot.name,
        category: nextSlot.category,
        prevQuantity: prevSlot.quantity,
        newQuantity: nextSlot.quantity,
      });
    }
  }

  // Items in prev that aren't in next → removed
  for (const [key, prevSlot] of prevMap) {
    if (!nextMap.has(key)) {
      removed.push({
        articleNumber: prevSlot.articleNumber,
        name: prevSlot.name,
        category: prevSlot.category,
        prevQuantity: prevSlot.quantity,
      });
    }
  }

  return {
    added,
    removed,
    quantityChanged,
    totalChanges: added.length + removed.length + quantityChanged.length,
  };
}
