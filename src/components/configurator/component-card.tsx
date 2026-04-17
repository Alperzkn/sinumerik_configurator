"use client";

import { Badge } from "@/components/ui/badge";

interface ComponentCardProps {
  name: string;
  articleNumber?: string;
  description?: string;
  orderCode?: string;
  category?: string;
  quantity?: number;
  isNew?: boolean;
}

export function ComponentCard({
  name,
  articleNumber,
  description,
  orderCode,
  category,
  quantity,
  isNew,
}: ComponentCardProps) {
  return (
    <div className="group flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card p-3 text-sm transition-colors hover:border-border hover:bg-accent/30">
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
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
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
          <code className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            {articleNumber}
          </code>
        )}
      </div>
    </div>
  );
}
