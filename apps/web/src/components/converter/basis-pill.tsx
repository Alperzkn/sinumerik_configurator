import { cn } from "@/lib/utils";
import type { LineBasis, ResultLine } from "@/lib/convert-808d/types";

const STYLE: Record<LineBasis, string> = {
  pdf: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  derived: "bg-primary/12 text-primary border-primary/30",
  verified: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30",
  review: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30",
  none: "bg-destructive/12 text-destructive border-destructive/30",
  replaced: "bg-muted text-muted-foreground border-border",
};

export const BASIS_TEXT: Record<LineBasis, string> = {
  pdf: "PDF",
  derived: "Derived",
  verified: "Outside PDF",
  review: "Review",
  none: "No equivalent",
  replaced: "Superseded",
};

export const BASIS_HELP: Record<LineBasis, string> = {
  pdf: "article number listed in the 828D Smart PDF",
  derived: "built from the PDF's motor code pattern, family verified in Siemens listings",
  verified: "cable / accessory not in the PDF, number verified in Siemens listings",
  review: "needs a manual decision",
  none: "not available on 828D Smart",
  replaced: "808D item that disappears (its function is covered by another line)",
};

/** Label for a line: "PDF p.27" when the source names a page, else the generic text. */
export function basisLabel(l: Pick<ResultLine, "cls" | "src">): string {
  if (l.cls === "pdf" && l.src.startsWith("PDF")) return l.src.split(",")[0].split("/")[0];
  return BASIS_TEXT[l.cls];
}

export function BasisPill({ cls, label, className }: { cls: LineBasis; label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full border px-2 text-[10.5px] font-semibold tracking-wide",
        STYLE[cls],
        className,
      )}
    >
      {label ?? BASIS_TEXT[cls]}
    </span>
  );
}
