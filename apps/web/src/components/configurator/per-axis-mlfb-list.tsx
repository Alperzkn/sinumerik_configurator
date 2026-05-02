"use client";

import { Lock } from "lucide-react";
import type { AxisMlfb } from "@/types/catalog";

/**
 * Renders per-axis full MLFBs as a sub-list under a motor row.
 * Each axis shows: user's axis label · full MLFB · brake badge if braked.
 *
 * Shown only when the AI captured per-axis preferences (axis names +
 * brake list) — falls back silently to the default "1 row × qty N"
 * display otherwise.
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
          <li
            key={item.axis}
            className="flex items-center justify-between gap-2 text-[12px]"
          >
            <span className="font-mono font-semibold text-muted-foreground w-12 shrink-0">
              {item.axis}
            </span>
            <code className="font-mono text-[12px] flex-1 truncate" title={item.mlfb}>
              {item.mlfb}
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
          </li>
        ))}
      </ul>
    </div>
  );
}
