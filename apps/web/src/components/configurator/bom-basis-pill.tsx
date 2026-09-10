import type { BomBasis } from "@/types/catalog";
import { cn } from "@/lib/utils";

export const BOM_BASIS_LABEL: Record<BomBasis, string> = {
  catalog: "Catalog",
  composed: "Composed",
  trunk_only: "Trunk only",
  order_code: "Order code",
};

export const BOM_BASIS_HELP: Record<BomBasis, string> = {
  catalog: "article number listed verbatim in the local Siemens catalog data",
  composed: "motor trunk plus a catalog-verified suffix (per-axis MLFB)",
  trunk_only: "catalog trunk shown; the suffix is assigned by your Siemens partner at order time",
  order_code: "no article number in the catalog — ordered by its option code",
};

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
