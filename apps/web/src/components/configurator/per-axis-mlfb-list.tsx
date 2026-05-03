"use client";

import { useState } from "react";
import { Lock, Info } from "lucide-react";
import type { AxisMlfb } from "@/types/catalog";

/**
 * Renders per-axis full MLFBs as a sub-list under a motor row.
 * Each axis shows: user's axis label · full MLFB · brake badge · info
 * button that pops a decoder showing what each suffix character means.
 */
export function PerAxisMlfbList({ items }: { items: AxisMlfb[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        Per-axis orderable MLFB
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.axis}>
            <AxisRow item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AxisRow({ item }: { item: AxisMlfb }) {
  const [open, setOpen] = useState(false);

  // Split the MLFB at the LAST hyphen so the suffix segment can be
  // highlighted (the only part that varies between axes with different
  // brake / encoder choices). Makes "1FT2206-2BA0" vs "1FT2206-2AA0"
  // visually obvious at a glance.
  const lastDash = item.mlfb.lastIndexOf("-");
  const base = lastDash > 0 ? item.mlfb.slice(0, lastDash) : item.mlfb;
  const suffix = lastDash > 0 ? item.mlfb.slice(lastDash) : "";

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-mono font-semibold text-muted-foreground w-12 shrink-0">
          {item.axis}
        </span>
        <code className="font-mono text-[12px] flex-1 truncate" title={item.mlfb}>
          <span className="text-muted-foreground">{base}</span>
          <span
            className={
              item.brake
                ? "text-amber-500 font-semibold"
                : "text-foreground font-semibold"
            }
          >
            {suffix}
          </span>
        </code>
        {item.brake && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 px-1.5 py-0.5 text-[10px] shrink-0"
            title="Holding brake included (suffix code reflects this)"
          >
            <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
            brake
          </span>
        )}
        {item.decoded && item.decoded.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open ? "true" : "false"}
            aria-label={open ? "Hide MLFB decoder" : "Decode this MLFB"}
            className="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0"
          >
            <Info className="h-3 w-3" strokeWidth={2} />
          </button>
        )}
      </div>
      {open && item.decoded && (
        <div className="mt-1.5 ml-12 rounded-md border border-border/60 bg-muted/30 p-2 text-[11px] space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Suffix breakdown
          </div>
          {item.decoded.map((d, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <code className="font-mono font-semibold text-foreground w-6 shrink-0">
                {d.code}
              </code>
              <span className="text-muted-foreground shrink-0">{d.label}:</span>
              <span className="text-foreground">{d.choiceLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
