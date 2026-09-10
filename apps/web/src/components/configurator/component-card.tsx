"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ComponentSpec {
  label: string;
  value: string;
}

interface ComponentCardProps {
  name: string;
  articleNumber?: string;
  description?: string;
  orderCode?: string;
  category?: string;
  quantity?: number;
  isNew?: boolean;
  specs?: ComponentSpec[];
  onSwap?: () => void;
  onRemove?: () => void;
}

export function ComponentCard({
  name,
  articleNumber,
  description,
  orderCode,
  category,
  quantity,
  isNew,
  specs,
  onSwap,
  onRemove,
}: ComponentCardProps) {
  return (
    <div
      className={cn(
        "group rounded-lg border border-border/60 bg-card p-3 text-sm transition-all",
        "hover:border-border hover:bg-accent/30",
        onSwap && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-[13px] leading-tight">{name}</span>
            {orderCode && (
              <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 h-4">
                {orderCode}
              </Badge>
            )}
            {isNew && (
              <Badge className="bg-emerald-500/15 text-emerald-400 text-[9px] border-emerald-500/20 px-1.5 py-0 h-4">
                NEW
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {quantity && quantity > 1 && (
            <Badge variant="secondary" className="text-[10px] tabular-nums">
              x{quantity}
            </Badge>
          )}
          {category && (
            <Badge variant="secondary" className="text-[9px] hidden sm:inline-flex">
              {category}
            </Badge>
          )}
          {articleNumber && (
            <code className="mlfb text-[11px] text-foreground/90 bg-muted/60 border border-border/60 px-1.5 py-0.5 rounded whitespace-nowrap">
              {articleNumber}
            </code>
          )}
          {onSwap && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwap();
              }}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-md border bg-background hover:bg-accent px-2 py-1 text-[10px] font-medium"
              title="Swap component"
            >
              Swap
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-md border border-destructive/30 bg-background hover:bg-destructive/10 text-destructive px-2 py-1 text-[10px] font-medium"
              title="Remove"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Specs grid */}
      {specs && specs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/40 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-1">
          {specs.map((s, i) => (
            <div key={i} className="flex items-baseline gap-1 text-[11px]">
              <span className="text-muted-foreground">{s.label}:</span>
              <span className="font-medium tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
