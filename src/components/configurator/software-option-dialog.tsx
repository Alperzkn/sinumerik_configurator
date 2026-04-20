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
  onAddOption: (option: SoftwareOption) => void;
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

  useEffect(() => {
    if (open) {
      setSearch("");
      setFilterCategory("");
    }
  }, [open]);

  // Options already bundled via a selected tech package — shouldn't be added individually
  const bundledCodes = useMemo(() => {
    const set = new Set<string>();
    for (const pkg of configuration.technologyPackages) {
      for (const code of pkg.includedOptions) set.add(code);
    }
    return set;
  }, [configuration.technologyPackages]);

  const ownedOptionIds = useMemo(
    () => new Set(configuration.softwareOptions.map((o) => o.id)),
    [configuration.softwareOptions]
  );
  const ownedPackageIds = useMemo(
    () => new Set(configuration.technologyPackages.map((p) => p.id)),
    [configuration.technologyPackages]
  );

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogOptions
      .filter((o) => {
        if (filterCategory && o.category !== filterCategory) return false;
        if (!q) return true;
        return (
          o.name.toLowerCase().includes(q) ||
          o.orderCode.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          o.articleNumber.toLowerCase().includes(q)
        );
      })
      .slice(0, 200);
  }, [catalogOptions, search, filterCategory]);

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Software Option or Package</DialogTitle>
          <DialogDescription>
            Browse the SINUMERIK ONE option catalog. Bundled options (part of a selected technology package) are dimmed.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setTab("options")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-all",
              tab === "options"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Individual Options
          </button>
          <button
            type="button"
            onClick={() => setTab("packages")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-all",
              tab === "packages"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Technology Packages
          </button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Search by name, order code, article number, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm flex-1"
            autoFocus
          />
          {tab === "options" && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs rounded-md border bg-background px-2"
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

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-1.5 pr-3">
            {tab === "options" &&
              filteredOptions.map((opt) => {
                const bundled = bundledCodes.has(opt.orderCode);
                const owned = ownedOptionIds.has(opt.id);
                const disabled = bundled || owned;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onAddOption(opt);
                      onClose();
                    }}
                    className={cn(
                      "w-full text-left rounded-lg border p-2.5 transition-all",
                      disabled
                        ? "opacity-50 cursor-not-allowed border-dashed"
                        : "hover:border-primary/40 hover:bg-accent/30 bg-card"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {opt.orderCode}
                        </Badge>
                        <div className="font-medium text-sm truncate">{opt.name}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {CATEGORY_LABELS[opt.category] || opt.category}
                        </Badge>
                        {bundled && <Badge className="text-[9px]">IN PACKAGE</Badge>}
                        {owned && !bundled && <Badge className="text-[9px]">ADDED</Badge>}
                        <code className="text-[10px] font-mono text-muted-foreground">
                          {opt.articleNumber}
                        </code>
                      </div>
                    </div>
                    {opt.description && (
                      <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        {opt.description}
                      </div>
                    )}
                  </button>
                );
              })}

            {tab === "packages" &&
              filteredPackages.map((pkg) => {
                const owned = ownedPackageIds.has(pkg.id);
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    disabled={owned}
                    onClick={() => {
                      onAddPackage(pkg);
                      onClose();
                    }}
                    className={cn(
                      "w-full text-left rounded-lg border p-2.5 transition-all",
                      owned
                        ? "opacity-50 cursor-not-allowed border-dashed"
                        : "hover:border-primary/40 hover:bg-accent/30 bg-card"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {pkg.orderCode}
                        </Badge>
                        <div className="font-medium text-sm truncate">{pkg.name}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {owned && <Badge className="text-[9px]">ADDED</Badge>}
                        <code className="text-[10px] font-mono text-muted-foreground">
                          {pkg.articleNumber}
                        </code>
                      </div>
                    </div>
                    {pkg.description && (
                      <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        {pkg.description}
                      </div>
                    )}
                    {pkg.includedOptions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {pkg.includedOptions.map((code) => (
                          <Badge key={code} variant="outline" className="text-[9px] font-mono">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}

            {((tab === "options" && filteredOptions.length === 0) ||
              (tab === "packages" && filteredPackages.length === 0)) && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No matches found.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
