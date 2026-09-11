/**
 * The single BOM-flattening routine used by every export path (clipboard,
 * Excel, PDF, share-as-text, telemetry). Keeping one implementation is
 * what stops the channels from drifting apart — per-axis motor MLFBs and
 * order-code-only safety options used to be lost on some paths.
 */
import type { BomBasis, BomItem, GeneratedConfiguration } from "@/types/catalog";

/**
 * Which Siemens catalog an article family is documented in. Derived from
 * the article prefix — the catalog data files don't carry page numbers.
 */
export function catalogSourceFor(article: string): string {
  const a = article.toUpperCase();
  if (/^1FK7/.test(a)) return "D21.4 (2017 ed.)";
  if (/^1PH3\d{3}-1[HL][DEFGS]12/.test(a)) return "1PH3 Pro manual";
  if (/^6FX5008-1BB[2-6]1/.test(a)) return "1PH3 Pro manual";
  if (/^(1FL2|6SL5510|6FX3502)/.test(a)) return "D37.1";
  if (/^6XV1870-3Q/.test(a)) return "IK PI";
  if (/^(6SL3111-[34]VE|6SL3100-0EE2|6SL3161-3XP00)/.test(a)) return "NC82";
  if (/^(1FK2|6SL5310|6SL3210-5HB)/.test(a)) return "D32";
  if (/^(6SL31[0-9]{2}|6SL3040|6SL3055|6SL3120|6SL3130|6SL3100|6FX|1FT7|1FT2|1PH8|1PH3|1FN3|1FW6|1FE[12])/.test(a)) return "D21.4";
  // 828D / 828D Smart generation .5 hardware, SD-card software, -0YH0 options, MCP 1200U, NX10.3/15.3
  if (/^(6FC5370-[2-8]AA50|6FC583[456]-[1-3]GY50|6FC5800-0A[A-Z0-9]{3}-0YH0|6FC5303-0AF3[2-4]-1AA1|6SL3040-1N[BC]00)/.test(a)) return "NC82";
  if (/^(6FC|6AV|6ES7|6AU|6GK)/.test(a)) return "NC63";
  return "Siemens catalog";
}

const line = (item: Omit<BomItem, "basis" | "source"> & { basis?: BomBasis }): BomItem => ({
  basis: "catalog",
  source: catalogSourceFor(item.articleNumber),
  ...item,
});

export function buildBom(config: GeneratedConfiguration): BomItem[] {
  const lines: BomItem[] = [];

  lines.push(line({
    articleNumber: config.controlUnit.articleNumber,
    name: config.controlUnit.name,
    quantity: 1,
    category: "Control Unit",
  }));

  lines.push(line({
    articleNumber: config.cncSoftware.articleNumber,
    name: config.cncSoftware.description,
    quantity: 1,
    category: "CNC Software",
  }));

  for (const pkg of config.technologyPackages) {
    lines.push(line({
      articleNumber: pkg.articleNumber,
      name: pkg.name,
      quantity: 1,
      orderCode: pkg.orderCode,
      category: "Technology Package",
    }));
  }

  for (const opt of config.softwareOptions) {
    const qty = config.optionQuantities[opt.id] || 1;
    lines.push(line({
      articleNumber: opt.articleNumber,
      name: opt.name,
      quantity: qty,
      orderCode: opt.orderCode,
      category: "Software Option",
    }));
  }

  for (const drive of config.drives) {
    const qty = config.driveQuantities[drive.id] || 1;
    lines.push(line({
      articleNumber: drive.articleNumber,
      name: drive.name,
      quantity: qty,
      category: "Drive",
    }));
  }

  for (const motor of config.motors) {
    const perAxis = motor.perAxisMlfbs;
    if (perAxis && perAxis.length > 0) {
      // Each axis carries its own orderable MLFB (brake / encoder vary
      // per axis). Group identical MLFBs so the BOM shows one line per
      // distinct article with a quantity — and the per-axis codes the
      // user configured in step 3 actually reach the export.
      const groups = new Map<string, { axes: string[]; brake: boolean; completeness?: string }>();
      for (const ax of perAxis) {
        const g = groups.get(ax.mlfb) ?? { axes: [], brake: false, completeness: ax.completeness };
        g.axes.push(ax.axis);
        if (ax.brake) g.brake = true;
        groups.set(ax.mlfb, g);
      }
      for (const [mlfb, g] of groups) {
        lines.push(line({
          articleNumber: mlfb,
          name: `${motor.name} — ${g.axes.join(", ")}${g.brake ? " (with brake)" : ""}`,
          quantity: g.axes.length,
          category: "Motor",
          basis: g.completeness === "verified" ? "composed" : "trunk_only",
        }));
      }
    } else {
      const qty = config.motorQuantities[motor.id] || 1;
      lines.push(line({
        articleNumber: motor.articleNumber || motor.series,
        name: motor.name,
        quantity: qty,
        category: "Motor",
        basis: motor.mlfbCompleteness === "verified" || !motor.mlfbCompleteness ? "catalog" : "trunk_only",
      }));
    }
  }

  for (const hmi of config.hmiComponents) {
    lines.push(line({
      articleNumber: hmi.articleNumber,
      name: hmi.name,
      quantity: 1,
      category: "HMI",
    }));
  }

  for (const sf of config.safetyFunctions.filter((s) => !s.isBasicScope)) {
    // Many extended safety functions are ordered by their order code
    // (S60 / S61 / K01…) and carry no full article number. Don't drop
    // them — fall back to the order code so they still appear in the BOM.
    lines.push(line({
      articleNumber: sf.articleNumber || sf.orderCode || "—",
      name: sf.name,
      quantity: 1,
      orderCode: sf.orderCode,
      category: "Safety",
      basis: sf.articleNumber ? "catalog" : "order_code",
    }));
  }

  for (const cable of config.cables || []) {
    if (cable.quantity > 0) {
      lines.push(line({
        articleNumber: cable.articleNumber,
        name: cable.name,
        quantity: cable.quantity,
        category: "Cable/Accessory",
      }));
    }
  }

  return lines;
}

/** Slim shape stored in telemetry — same rows as the user-facing BOM. */
export function buildSlimBom(
  config: GeneratedConfiguration
): Array<{ mlfb: string; qty: number; name: string; category: string }> {
  return buildBom(config).map((l) => ({
    mlfb: l.articleNumber,
    qty: l.quantity,
    name: l.name,
    category: l.category,
  }));
}
