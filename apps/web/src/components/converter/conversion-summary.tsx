"use client";

import { cn } from "@/lib/utils";
import { MAX_AXES_828D_SMART } from "@/lib/convert-808d/catalog";
import { reviewCount, selectedLineCount } from "@/lib/convert-808d/export";
import type { Conversion } from "@/lib/convert-808d/types";

function Stat({
  label,
  value,
  sub,
  tone = "neutral",
  title,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "neutral" | "warn" | "crit";
  title?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-card px-3.5 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div
        title={title}
        className={cn(
          "mt-0.5 truncate font-display text-2xl font-semibold tabular-nums leading-tight",
          tone === "warn" && "text-amber-600 dark:text-amber-300",
          tone === "crit" && "text-destructive",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function ConversionSummary({
  current,
  index,
  total,
}: {
  current: Conversion | null;
  index: number;
  total: number;
}) {
  if (!current) {
    return (
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <Stat label="Configurations" value="0" sub="paste or upload to start" />
        <Stat label="828D Smart lines" value="–" />
        <Stat label="Needs review" value="–" />
        <Stat label="Axes / spindles" value="–" sub={`max. ${MAX_AXES_828D_SMART} on 828D Smart`} />
      </div>
    );
  }
  const lines = selectedLineCount(current);
  const review = reviewCount(current);
  const ax = current.result.axes;
  const over = ax > MAX_AXES_828D_SMART;
  return (
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
      <Stat
        label="Selected configuration"
        value={<span className="text-base font-medium">{current.name}</span>}
        title={current.name}
        sub={`${current.rows.length} input lines · ${current.result.tech === "T" ? "turning" : "milling"} · PPU ${current.result.orient === "V" ? "vertical" : "horizontal"} · ${index + 1} of ${total}`}
      />
      <Stat label="828D Smart lines" value={lines} sub="article numbers selected" />
      <Stat label="Needs review" value={review} sub="lines with a manual decision" tone={review ? "warn" : "neutral"} />
      <Stat
        label="Axes / spindles"
        value={ax || "–"}
        sub={over ? `exceeds the 828D Smart limit of ${MAX_AXES_828D_SMART}` : `max. ${MAX_AXES_828D_SMART} on 828D Smart`}
        tone={over ? "crit" : "neutral"}
      />
    </div>
  );
}
