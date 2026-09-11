import type { BomBasis } from "@/types/catalog";
import { cn } from "@/lib/utils";

export const BOM_BASIS_LABEL: Record<BomBasis, string> = {
  catalog: "Catalog",
  composed: "Composed",
  trunk_only: "Trunk only",
  order_code: "Order code",
};

/** Plain-language meaning of each basis, shown in the tooltip and the legend under the BOM. */
export const BOM_BASIS_HELP: Record<BomBasis, string> = {
  catalog: "Article number taken exactly as printed in the Siemens catalog. Ready to order.",
  composed: "Article number built by the app: a catalog motor plus the option digits for this axis (brake, encoder, shaft). Please double-check before ordering.",
  trunk_only: "Only the first part of the article number is known; your Siemens partner completes it at order time.",
  order_code: "Software option with no article number of its own. Order it by the option code shown in brackets.",
};

const ALL_BASES: BomBasis[] = ["catalog", "composed", "trunk_only", "order_code"];

const STYLE: Record<BomBasis, string> = {
  catalog: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  composed: "bg-primary/12 text-primary border-primary/30",
  trunk_only: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30",
  order_code: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30",
};

/** Provenance pill for a BOM line — same visual language as the 808D converter. */
export function BomBasisPill({ basis, className }: { basis: BomBasis; className?: string }) {
  return (
    <span
      title={BOM_BASIS_HELP[basis]}
      className={cn(
        "inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full border px-2 text-[10.5px] font-semibold tracking-wide",
        STYLE[basis],
        className,
      )}
    >
      {BOM_BASIS_LABEL[basis]}
    </span>
  );
}

/** One line per basis, so a reader can decode the pills without hovering. */
export function BomBasisLegend({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-muted/20 px-4 py-3", className)}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">What the Basis chips mean</h3>
      <ul className="space-y-1.5">
        {ALL_BASES.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[12px] text-muted-foreground">
            <BomBasisPill basis={b} className="mt-0.5" />
            <span>{BOM_BASIS_HELP[b]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground/80">
        The grey code next to a chip is the source of the line (catalog edition or sizing rule).
      </p>
    </div>
  );
}
