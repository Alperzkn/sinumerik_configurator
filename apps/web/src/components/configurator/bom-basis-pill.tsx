import type { BomBasis, BomItem } from "@/types/catalog";
import { cn } from "@/lib/utils";

/**
 * Same chips as the 808D → 828D Smart converter (components/converter/basis-pill):
 * colours, shape and vocabulary. A catalog line carries the catalog name in the
 * chip ("NC63", "D37.1") the way the converter's chip says "PDF p.27".
 */
const STYLE: Record<BomBasis, string> = {
  catalog: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  composed: "bg-primary/12 text-primary border-primary/30",
  trunk_only: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30",
  order_code: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30",
};

export const BOM_BASIS_LABEL: Record<BomBasis, string> = {
  catalog: "Catalog",
  composed: "Derived",
  trunk_only: "Review",
  order_code: "Order code",
};

export const BOM_BASIS_HELP: Record<BomBasis, string> = {
  catalog: "article number listed in the named Siemens catalog — ready to order",
  composed: "built from the catalog's motor code pattern (brake, encoder, shaft digits for this axis) — double-check before ordering",
  trunk_only: "needs a manual decision — only the first part of the number is known, your Siemens partner completes it",
  order_code: "software option without its own article number — ordered by the code in brackets",
};

const LEGEND: BomBasis[] = ["catalog", "composed", "trunk_only", "order_code"];

/** Chip text for a line: the catalog name for catalog lines, else the generic word. */
export function bomBasisLabel(line: Pick<BomItem, "basis" | "source">): string {
  const basis = line.basis ?? "catalog";
  if (basis === "catalog" && line.source) return line.source;
  return BOM_BASIS_LABEL[basis];
}

export function BomBasisPill({ basis, label, className }: { basis: BomBasis; label?: string; className?: string }) {
  return (
    <span
      title={BOM_BASIS_HELP[basis]}
      className={cn(
        "inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full border px-2 text-[10.5px] font-semibold tracking-wide",
        STYLE[basis],
        className,
      )}
    >
      {label ?? BOM_BASIS_LABEL[basis]}
    </span>
  );
}

/** The converter's "Selection rules" legend, for the main BOM. */
export function BomBasisLegend({ className }: { className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      <h3 className="border-b px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Selection rules
      </h3>
      <dl className="grid grid-cols-[auto_1fr] items-start gap-x-2.5 gap-y-2 p-3.5 text-xs text-muted-foreground">
        {LEGEND.map((k) => (
          <div key={k} className="contents">
            <dt>
              <BomBasisPill basis={k} label={k === "catalog" ? "NC63 / D21.4 / …" : undefined} />
            </dt>
            <dd className="leading-snug">{BOM_BASIS_HELP[k]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
