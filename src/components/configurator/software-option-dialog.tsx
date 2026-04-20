"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  GeneratedConfiguration,
  SoftwareOption,
  TechnologyPackage,
} from "@/types/catalog";

interface SoftwareOptionDialogProps {
  open: boolean;
  onClose: () => void;
  configuration: GeneratedConfiguration;
  catalogOptions: SoftwareOption[];
  catalogPackages: TechnologyPackage[];
  onAddOption: (option: SoftwareOption, quantity: number) => void;
  onAddPackage: (pkg: TechnologyPackage) => void;
}

type Tab = "options" | "packages";

const CATEGORY_LABELS: Record<string, string> = {
  axis: "Axis / Spindle",
  channel: "Channel",
  technology: "Technology",
  safety: "Safety",
  monitoring: "Monitoring",
  compensation: "Compensation",
  transformation: "Transformation",
  interpolation: "Interpolation",
  coupling: "Coupling",
  hmi: "HMI",
  communication: "Communication",
  engineering: "Engineering",
  tool: "Tool",
  measurement: "Measurement",
  drive: "Drive",
  synchronized_action: "Sync Action",
  programming: "Programming",
  simulation: "Simulation",
  operating_mode: "Operating Mode",
  memory: "Memory",
  mode_group: "Mode Group",
  other: "Other",
};

/** Strip "(1st)", "(2nd)", "(3rd)", ..., "(Nth)" suffix to get a base name. */
function baseName(name: string): string {
  return name.replace(/\s*\((\d+(?:st|nd|rd|th))\)\s*$/, "").trim();
}

interface OptionGroup {
  /** Canonical option (first variant in catalog order). */
  canonical: SoftwareOption;
  /** All catalog variants sharing the same articleNumber. */
  variants: SoftwareOption[];
  /** Total licenses available (= variants.length) */
  maxQuantity: number;
  /** Display name with Nth suffix stripped */
  displayName: string;
  /** Non-numeric order-code prefix (e.g., A, C, K) */
  codeFamily: string;
}

/**
 * Group software options by articleNumber. Siemens licenses N "additional
 * axis" slots as A01..A28, all with the same article number; likewise
 * channels C11-C19, memory D, safe axes K. A single card with a quantity
 * selector is more usable than 28 near-identical rows.
 */
function groupOptions(options: SoftwareOption[]): OptionGroup[] {
  const byArticle = new Map<string, SoftwareOption[]>();
  for (const opt of options) {
    const key = opt.articleNumber;
    const arr = byArticle.get(key) ?? [];
    arr.push(opt);
    byArticle.set(key, arr);
  }

  return Array.from(byArticle.values()).map((variants) => {
    const canonical = variants[0];
    const codeFamily = canonical.orderCode.replace(/\d+$/, "");
    return {
      canonical,
      variants,
      maxQuantity: variants.length,
      displayName: baseName(canonical.name),
      codeFamily,
    };
  });
}

export function SoftwareOptionDialog({
  open,
  onClose,
  configuration,
  catalogOptions,
  catalogPackages,
  onAddOption,
  onAddPackage,
}: SoftwareOptionDialogProps) {
  const [tab, setTab] = useState<Tab>("options");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      setSearch("");
      setFilterCategory("");
      setQuantities({});
    }
  }, [open]);

  const groups = useMemo(() => groupOptions(catalogOptions), [catalogOptions]);

  // Order codes bundled via a selected tech package — can't be added separately.
  const bundledCodes = useMemo(() => {
    const set = new Set<string>();
    for (const pkg of configuration.technologyPackages) {
      for (const code of pkg.includedOptions) set.add(code);
    }
    return set;
  }, [configuration.technologyPackages]);

  // Current quantity already in the config (sum across all variants sharing the article).
  const currentQuantityByArticle = useMemo(() => {
    const map = new Map<string, number>();
    for (const opt of configuration.softwareOptions) {
      const qty = configuration.optionQuantities[opt.id] || 1;
      map.set(opt.articleNumber, (map.get(opt.articleNumber) || 0) + qty);
    }
    return map;
  }, [configuration.softwareOptions, configuration.optionQuantities]);

  const ownedPackageIds = useMemo(
    () => new Set(configuration.technologyPackages.map((p) => p.id)),
    [configuration.technologyPackages]
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (filterCategory && g.canonical.category !== filterCategory) return false;
      if (!q) return true;
      return (
        g.displayName.toLowerCase().includes(q) ||
        g.codeFamily.toLowerCase().includes(q) ||
        g.canonical.orderCode.toLowerCase().includes(q) ||
        g.canonical.description.toLowerCase().includes(q) ||
        g.canonical.articleNumber.toLowerCase().includes(q)
      );
    });
  }, [groups, search, filterCategory]);

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogPackages.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.orderCode.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [catalogPackages, search]);

  const categories = useMemo(() => {
    const set = new Set(catalogOptions.map((o) => o.category));
    return Array.from(set).sort();
  }, [catalogOptions]);

  const setQty = (key: string, n: number, max: number) => {
    const clamped = Math.max(1, Math.min(max, n));
    setQuantities((q) => ({ ...q, [key]: clamped }));
  };

  const handleAddGroup = (group: OptionGroup) => {
    const key = group.canonical.articleNumber;
    const qty = quantities[key] ?? 1;
    // Pick the Nth variant matching the total desired quantity — using the
    // canonical variant keeps the stored identity stable across re-adds.
    onAddOption(group.canonical, qty);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">Add Software Option or Package</DialogTitle>
          <DialogDescription className="text-xs">
            Browse the SINUMERIK ONE catalog. License-slot options (multi-axis, multi-channel, etc.) share one entry — pick the quantity.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-3 pb-3 space-y-3">
          {/* Tabs + filters */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setTab("options")}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-all",
                  tab === "options"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Options
              </button>
              <button
                type="button"
                onClick={() => setTab("packages")}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-all",
                  tab === "packages"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Packages
              </button>
            </div>
            {tab === "options" && (
              <select
                aria-label="Filter by category"
                title="Filter by category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs rounded-md border bg-background px-2 py-1 h-7"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c] || c}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Input
            placeholder="Search by name, order code, article, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm h-9"
            autoFocus
          />
        </div>

        <ScrollArea className="max-h-[50vh] px-5">
          <div className="space-y-1.5 pb-4 pr-2">
            {tab === "options" &&
              filteredGroups.map((group) => {
                const key = group.canonical.articleNumber;
                const qty = quantities[key] ?? 1;
                const currentOwned = currentQuantityByArticle.get(key) || 0;
                const remaining = group.maxQuantity - currentOwned;
                const anyBundled = group.variants.some((v) =>
                  bundledCodes.has(v.orderCode)
                );
                const disabled = anyBundled || remaining <= 0;
                const isMultiSlot = group.maxQuantity > 1;

                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-lg border transition-all",
                      disabled
                        ? "opacity-50 border-dashed"
                        : "border-border/60 hover:border-primary/40 bg-card"
                    )}
                  >
                    <div className="p-2.5 flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono shrink-0 mt-0.5"
                      >
                        {isMultiSlot ? `${group.codeFamily}*` : group.canonical.orderCode}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{group.displayName}</span>
                          <Badge variant="outline" className="text-[9px] uppercase">
                            {CATEGORY_LABELS[group.canonical.category] || group.canonical.category}
                          </Badge>
                          {anyBundled && (
                            <Badge className="text-[9px]">IN PACKAGE</Badge>
                          )}
                          {currentOwned > 0 && !anyBundled && (
                            <Badge className="text-[9px]">×{currentOwned} ADDED</Badge>
                          )}
                        </div>
                        {group.canonical.description && (
                          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                            {group.canonical.description}
                          </p>
                        )}
                        {isMultiSlot && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Up to {group.maxQuantity} license slots available ({group.codeFamily}01–{group.codeFamily}{String(group.maxQuantity).padStart(2, "0")})
                          </p>
                        )}
                        <code className="mt-1 inline-block text-[10px] font-mono text-muted-foreground">
                          {group.canonical.articleNumber}
                        </code>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isMultiSlot && !disabled && (
                          <div className="flex items-center rounded-md border overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setQty(key, qty - 1, remaining)}
                              disabled={qty <= 1}
                              className="h-7 w-6 text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              aria-label={`Quantity for ${group.displayName}`}
                              title={`Quantity (max ${remaining})`}
                              min={1}
                              max={remaining}
                              value={qty}
                              onChange={(e) => setQty(key, parseInt(e.target.value, 10) || 1, remaining)}
                              className="h-7 w-10 text-center text-xs bg-background border-x outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => setQty(key, qty + 1, remaining)}
                              disabled={qty >= remaining}
                              className="h-7 w-6 text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          disabled={disabled}
                          onClick={() => handleAddGroup(group)}
                          className="h-7 text-xs"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {tab === "packages" &&
              filteredPackages.map((pkg) => {
                const owned = ownedPackageIds.has(pkg.id);
                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      "rounded-lg border p-2.5",
                      owned ? "opacity-50 border-dashed" : "border-border/60 bg-card"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono shrink-0 mt-0.5"
                      >
                        {pkg.orderCode}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{pkg.name}</span>
                          {owned && <Badge className="text-[9px]">ADDED</Badge>}
                        </div>
                        {pkg.description && (
                          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                            {pkg.description}
                          </p>
                        )}
                        {pkg.includedOptions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {pkg.includedOptions.map((code) => (
                              <Badge
                                key={code}
                                variant="outline"
                                className="text-[9px] font-mono"
                              >
                                {code}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <code className="mt-1 inline-block text-[10px] font-mono text-muted-foreground">
                          {pkg.articleNumber}
                        </code>
                      </div>
                      <Button
                        size="sm"
                        disabled={owned}
                        onClick={() => {
                          onAddPackage(pkg);
                          onClose();
                        }}
                        className="h-7 text-xs shrink-0"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                );
              })}

            {((tab === "options" && filteredGroups.length === 0) ||
              (tab === "packages" && filteredPackages.length === 0)) && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No matches found.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end px-5 py-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
