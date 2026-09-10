"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConverterStore } from "@/store/converter-store";
import { reviewCount } from "@/lib/convert-808d/export";
import { cn } from "@/lib/utils";

export function ConversionList() {
  const conversions = useConverterStore((s) => s.conversions);
  const selectedId = useConverterStore((s) => s.selectedId);
  const select = useConverterStore((s) => s.select);
  const selectRelative = useConverterStore((s) => s.selectRelative);
  const remove = useConverterStore((s) => s.removeConversion);

  if (!conversions.length) return null;
  const idx = conversions.findIndex((c) => c.id === selectedId);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Configurations
      </span>
      {conversions.map((c) => {
        const rv = reviewCount(c);
        const active = c.id === selectedId;
        return (
          <span
            key={c.id}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            onClick={() => select(c.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                select(c.id);
              }
            }}
            className={cn(
              "inline-flex max-w-80 cursor-pointer items-center gap-1.5 rounded-full border bg-card py-1 pl-3 pr-1 text-[13px] transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "border-primary bg-primary/10",
            )}
          >
            <span className="truncate">{c.name}</span>
            {rv > 0 && (
              <span
                title="lines to review"
                className="rounded-full bg-amber-500/15 px-1.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300"
              >
                {rv}
              </span>
            )}
            <button
              type="button"
              aria-label={`Remove ${c.name}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(c.id);
              }}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        );
      })}
      <span className="ml-auto flex items-center gap-1">
        <Button variant="outline" size="xs" disabled={idx <= 0} onClick={() => selectRelative(-1)}>
          ‹ Newer
        </Button>
        <Button
          variant="outline"
          size="xs"
          disabled={idx >= conversions.length - 1}
          onClick={() => selectRelative(1)}
        >
          Older ›
        </Button>
      </span>
    </div>
  );
}
