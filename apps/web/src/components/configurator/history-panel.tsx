"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useConfiguratorStore,
  type HistoryEntry,
  type HistoryKind,
} from "@/store/configurator-store";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ChangeItem } from "@/lib/history/diff";

const KIND_META: Record<HistoryKind, { label: string; tone: string; iconPath: string }> = {
  init: {
    label: "Generated",
    tone: "bg-primary/15 text-primary border-primary/30",
    iconPath:
      "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
  },
  load: {
    label: "Loaded",
    tone: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    iconPath:
      "M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542",
  },
  swap: {
    label: "Swap",
    tone: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    iconPath:
      "M16 3l4 4-4 4M20 7H8m-4 10l-4-4 4-4m-4 4h12",
  },
  add_option: {
    label: "Add option",
    tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    iconPath: "M12 4.5v15m7.5-7.5h-15",
  },
  remove_option: {
    label: "Remove option",
    tone: "bg-destructive/15 text-destructive border-destructive/30",
    iconPath: "M5 12h14",
  },
  add_package: {
    label: "Add package",
    tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    iconPath:
      "M21 7.5l-9-5.25L3 7.5m18 0v9l-9 5.25-9-5.25V7.5m18 0L12 12.75M3 7.5L12 12.75",
  },
  remove_package: {
    label: "Remove package",
    tone: "bg-destructive/15 text-destructive border-destructive/30",
    iconPath: "M5 12h14",
  },
  add_safety: {
    label: "Add safety",
    tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    iconPath:
      "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  },
  remove_safety: {
    label: "Remove safety",
    tone: "bg-destructive/15 text-destructive border-destructive/30",
    iconPath:
      "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  },
  ai_modify: {
    label: "Ask AI",
    tone: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    iconPath:
      "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z",
  },
  revert: {
    label: "Revert",
    tone: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    iconPath: "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3",
  },
};

function formatTime(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ms).toLocaleString();
}

interface ChangeRowProps {
  item: ChangeItem;
  variant: "added" | "removed" | "quantity";
}

function ChangeRow({ item, variant }: ChangeRowProps) {
  const symbol = variant === "added" ? "+" : variant === "removed" ? "−" : "Δ";
  const tone =
    variant === "added"
      ? "text-emerald-400"
      : variant === "removed"
        ? "text-destructive"
        : "text-amber-400";

  return (
    <div className="flex items-baseline gap-2 text-[11px] leading-snug py-0.5">
      <span className={cn("font-mono w-3 text-center shrink-0", tone)}>{symbol}</span>
      <span className="text-muted-foreground/70 w-20 shrink-0 truncate">{item.category}</span>
      <code className="font-mono text-[10.5px] text-foreground/80 whitespace-nowrap">
        {item.articleNumber}
      </code>
      {variant === "quantity" && (
        <span className="text-muted-foreground tabular-nums shrink-0">
          {item.prevQuantity} → <span className="text-amber-400 font-medium">{item.newQuantity}</span>
        </span>
      )}
      {variant !== "quantity" && (item.newQuantity ?? item.prevQuantity ?? 1) > 1 && (
        <span className="text-muted-foreground tabular-nums shrink-0">
          × {item.newQuantity ?? item.prevQuantity}
        </span>
      )}
      <span className="text-muted-foreground truncate">{item.name}</span>
    </div>
  );
}

function HistoryChanges({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const c = entry.changes;
  if (!c || c.totalChanges === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[10.5px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className={cn(
            "h-3 w-3 transition-transform",
            expanded ? "rotate-90" : ""
          )}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span>
          {c.totalChanges} MLFB change{c.totalChanges === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1.5">
          {c.added.length > 0 && (
            <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30 px-1 py-0 h-4">
              +{c.added.length}
            </Badge>
          )}
          {c.removed.length > 0 && (
            <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30 px-1 py-0 h-4">
              −{c.removed.length}
            </Badge>
          )}
          {c.quantityChanged.length > 0 && (
            <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30 px-1 py-0 h-4">
              Δ{c.quantityChanged.length}
            </Badge>
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 ml-1 pl-2 border-l border-border/40 py-0.5">
              {c.added.map((item, i) => (
                <ChangeRow key={`a-${i}`} item={item} variant="added" />
              ))}
              {c.removed.map((item, i) => (
                <ChangeRow key={`r-${i}`} item={item} variant="removed" />
              ))}
              {c.quantityChanged.map((item, i) => (
                <ChangeRow key={`q-${i}`} item={item} variant="quantity" />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HistoryPanel() {
  const history = useConfiguratorStore((s) => s.history);
  const revertToHistoryEntry = useConfiguratorStore((s) => s.revertToHistoryEntry);
  const clearHistory = useConfiguratorStore((s) => s.clearHistory);
  const [isOpen, setIsOpen] = useState(true);

  const reversed = [...history].reverse();
  const count = history.length;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm flex items-center gap-2">
              History
              <Badge variant="outline" className="text-[10px] tabular-nums">
                {count}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Every change you made — click any entry to revert
            </div>
          </div>
        </div>
        <svg
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen ? "rotate-180" : ""
          )}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t">
              {count === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">
                  No changes yet — saves and edits will appear here.
                </p>
              ) : (
                <>
                  <div className="max-h-[40vh] overflow-y-auto">
                    <ul className="divide-y divide-border/40">
                      {reversed.map((entry, i) => {
                        const meta = KIND_META[entry.kind];
                        const isLatest = i === 0;
                        return (
                          <li
                            key={entry.id}
                            className={cn(
                              "px-3.5 py-2.5 text-sm hover:bg-accent/20 transition-colors flex items-start gap-3",
                              isLatest && "bg-primary/5"
                            )}
                          >
                            <div
                              className={cn(
                                "h-6 w-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5",
                                meta.tone
                              )}
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d={meta.iconPath} />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={cn("text-[9px]", meta.tone)}>
                                  {meta.label}
                                </Badge>
                                <span className="text-[13px] font-medium truncate">
                                  {entry.title}
                                </span>
                                {isLatest && (
                                  <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30">
                                    CURRENT
                                  </Badge>
                                )}
                              </div>
                              {entry.details && (
                                <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                                  {entry.details}
                                </div>
                              )}
                              <HistoryChanges entry={entry} />
                              <div className="text-[10px] text-muted-foreground/70 mt-1 tabular-nums">
                                {formatTime(entry.timestamp)}
                              </div>
                            </div>
                            {!isLatest && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 shrink-0"
                                onClick={() => {
                                  revertToHistoryEntry(entry.id);
                                  toast.info("Reverted", entry.title);
                                }}
                              >
                                Revert
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="px-3.5 py-2 flex justify-end border-t bg-muted/20">
                    <button
                      type="button"
                      onClick={() => {
                        clearHistory();
                        toast.info("History cleared");
                      }}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear history
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
