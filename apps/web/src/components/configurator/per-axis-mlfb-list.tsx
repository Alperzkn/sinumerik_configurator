"use client";

import { useState } from "react";
import { ChevronDown, Lock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AxisMlfb } from "@/types/catalog";

/**
 * Per-axis MLFB list rendered as a vertical schematic — a thin rail
 * with a tick at each axis position, axis labels in IBM Plex Serif
 * (display font), MLFB in JetBrains Mono with the suffix segment
 * underlined and amber-tinted when a brake is included. The decoder
 * panel renders as a left-accent callout, like an annotation on a
 * technical drawing.
 */
export function PerAxisMlfbList({ items }: { items: AxisMlfb[] }) {
  if (!items || items.length === 0) return null;

  const trunkOnly = items.some((i) => i.completeness === "trunk-only");

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex items-baseline gap-3 mb-2.5">
        <span className="label-spec">Per-axis orderable MLFB</span>
        <span className="flex-1 h-px bg-border/40" />
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {items.length} {items.length === 1 ? "axis" : "axes"}
        </span>
      </div>
      {trunkOnly && (
        <div className="callout-strip mb-2 text-[11px] flex items-start gap-2 text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" strokeWidth={2} />
          <span>
            <span className="text-foreground font-medium">Trunk-only article.</span>{" "}
            The catalog suffix (encoder · brake · shaft · IP) is order-time
            configuration — your Siemens partner completes the final 4–5
            characters from this trunk. Brake state per axis is shown below.
          </span>
        </div>
      )}
      <ul className="schema-rail space-y-2">
        {items.map((item) => (
          <li
            key={item.axis}
            data-brake={item.brake ? "true" : "false"}
            className="py-0.5"
          >
            <AxisRow item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AxisRow({ item }: { item: AxisMlfb }) {
  const [open, setOpen] = useState(false);
  const lastDash = item.mlfb.lastIndexOf("-");
  const base = lastDash > 0 ? item.mlfb.slice(0, lastDash) : item.mlfb;
  const suffix = lastDash > 0 ? item.mlfb.slice(lastDash) : "";
  const hasDecoder = !!item.decoded && item.decoded.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasDecoder && setOpen((o) => !o)}
        disabled={!hasDecoder}
        aria-expanded={open ? "true" : "false"}
        className={cn(
          "w-full flex items-center gap-3 text-left",
          hasDecoder && "cursor-pointer group",
        )}
      >
        <span
          className={cn(
            "font-display text-[14px] tabular-nums tracking-tight w-10 shrink-0 leading-none",
            item.brake ? "text-amber-500" : "text-foreground",
          )}
        >
          {item.axis}
        </span>

        <code className="mlfb text-[12.5px] flex-1 truncate leading-none">
          <span className="text-muted-foreground">{base}</span>
          <span
            className={cn(
              "font-semibold",
              item.brake
                ? "text-amber-500 underline decoration-amber-500/40 decoration-1 underline-offset-[3px]"
                : "text-foreground underline decoration-foreground/30 decoration-1 underline-offset-[3px]",
            )}
          >
            {suffix}
          </span>
        </code>

        {item.brake && (
          <Lock
            className="h-3 w-3 text-amber-500 shrink-0"
            strokeWidth={2.25}
            aria-label="Holding brake"
          />
        )}

        {hasDecoder && (
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted-foreground transition-transform shrink-0 group-hover:text-foreground",
              open && "rotate-180",
            )}
            strokeWidth={2}
          />
        )}
      </button>

      {open && hasDecoder && (
        <div className="callout-strip mt-2 ml-2 text-[11px] space-y-1.5">
          <div className="label-spec text-[9px] mb-1.5">
            Suffix breakdown
          </div>
          <ul className="space-y-1">
            {item.decoded!.map((d, i) => (
              <li key={i} className="flex items-baseline gap-2.5">
                <code className="mlfb text-[11px] font-semibold text-foreground w-5 shrink-0 tabular-nums">
                  {d.code}
                </code>
                <span className="text-muted-foreground shrink-0 text-[10px] uppercase tracking-wider">
                  {d.label}
                </span>
                <span className="text-foreground/85 ml-auto text-right">
                  {d.choiceLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
