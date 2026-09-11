"use client";

import { useMemo, useState } from "react";
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
import { MOTOR_SPECS, MOTOR_MODULE_SPECS } from "@/lib/validation/drive-system-rules";
import { catalogBundle } from "@/data/catalog-bundle";
import type { ControlSystemFamily } from "@/types/catalog";

export type SwapCategory = "motor_feed" | "motor_spindle" | "motor_module_feed" | "motor_module_spindle" | "line_module" | "control_unit";

interface SwapOption {
  articleNumber: string;
  name: string;
  specs: { label: string; value: string }[];
  current?: boolean;
}

interface ComponentSwapDialogProps {
  open: boolean;
  onClose: () => void;
  category: SwapCategory;
  currentArticle?: string;
  /** Product line of the configuration being edited. */
  family?: ControlSystemFamily;
  onSelect: (articleNumber: string) => void;
}

const LINE_MODULES: { article: string; name: string; power: number; type: string }[] = [
  { article: "6SL3130-6AE15-0AB1", name: "Smart Line Module 5kW", power: 5, type: "Smart" },
  { article: "6SL3130-6AE21-0AB1", name: "Smart Line Module 10kW", power: 10, type: "Smart" },
  { article: "6SL3130-6TE23-6AA3", name: "Smart Line Module 36kW", power: 36, type: "Smart" },
  { article: "6SL3130-6TE25-5AA3", name: "Smart Line Module 55kW", power: 55, type: "Smart" },
  { article: "6SL3130-7TE21-6AA4", name: "Active Line Module 16kW", power: 16, type: "Active" },
  { article: "6SL3130-7TE23-6AA3", name: "Active Line Module 36kW", power: 36, type: "Active" },
  { article: "6SL3130-7TE25-5AA3", name: "Active Line Module 55kW", power: 55, type: "Active" },
  { article: "6SL3130-7TE28-0AA3", name: "Active Line Module 80kW", power: 80, type: "Active" },
  { article: "6SL3130-7TE31-2AA3", name: "Active Line Module 120kW", power: 120, type: "Active" },
];

/** Control units for the current product line, straight from the catalog data. */
function controlUnitsFor(family: ControlSystemFamily) {
  return catalogBundle.controlUnits
    .filter((cu) => cu.family === family)
    .map((cu) => ({
      article: cu.articleNumber,
      name: `${cu.name}${cu.orientation ? ` (${cu.orientation})` : cu.formFactor === "cabinet_based" ? " (cabinet)" : ""}`,
      maxAxes: cu.maxAxesSpindles,
      maxChannels: cu.maxChannels,
      ports: cu.driveInterface === "PROFINET" ? "PROFINET" : `${cu.driveCliqPorts} DRIVE-CLiQ`,
    }));
}

function getOptions(category: SwapCategory, family: ControlSystemFamily): SwapOption[] {
  switch (category) {
    case "motor_feed":
      return Object.entries(MOTOR_SPECS)
        .filter(([_, s]) => s.family.includes("1FT7") || s.family.includes("1FK"))
        .map(([article, s]) => ({
          articleNumber: article,
          name: `${s.family} SH${s.shaftHeight} ${s.variant}`,
          specs: [
            { label: "Torque", value: s.ratedTorque },
            { label: "Speed", value: s.ratedSpeed },
            { label: "Power", value: s.ratedPower },
            { label: "Current", value: s.ratedCurrent },
          ],
        }));

    case "motor_spindle":
      return Object.entries(MOTOR_SPECS)
        .filter(([_, s]) => s.family.includes("1PH8"))
        .map(([article, s]) => ({
          articleNumber: article,
          name: `${s.family} SH${s.shaftHeight}`,
          specs: [
            { label: "Power", value: s.ratedPower },
            { label: "Torque", value: s.ratedTorque },
            { label: "Speed", value: s.ratedSpeed },
            { label: "Max rpm", value: s.maxSpeed || "-" },
            { label: "Current", value: s.ratedCurrent },
          ],
        }));

    case "motor_module_feed":
    case "motor_module_spindle":
      return Object.entries(MOTOR_MODULE_SPECS).map(([article, s]) => ({
        articleNumber: article,
        name: `Motor Module ${s.current}A / ${s.power}kW`,
        specs: [
          { label: "Rated I", value: `${s.current} A` },
          { label: "Power", value: `${s.power} kW` },
          { label: "Voltage", value: s.voltage },
        ],
      }));

    case "line_module":
      return LINE_MODULES.map((lm) => ({
        articleNumber: lm.article,
        name: lm.name,
        specs: [
          { label: "Power", value: `${lm.power} kW` },
          { label: "Type", value: lm.type },
        ],
      }));

    case "control_unit":
      return controlUnitsFor(family).map((cu) => ({
        articleNumber: cu.article,
        name: cu.name,
        specs: [
          { label: "Max axes", value: String(cu.maxAxes) },
          { label: "Channels", value: String(cu.maxChannels) },
          { label: "Drive I/F", value: cu.ports },
        ],
      }));

    default:
      return [];
  }
}

const CATEGORY_LABELS: Record<SwapCategory, string> = {
  motor_feed: "Feed Motor",
  motor_spindle: "Spindle Motor",
  motor_module_feed: "Feed Motor Module",
  motor_module_spindle: "Spindle Motor Module",
  line_module: "Line Module",
  control_unit: "Control Unit",
};

export function ComponentSwapDialog({
  open,
  onClose,
  category,
  currentArticle,
  family = "sinumerik_one",
  onSelect,
}: ComponentSwapDialogProps) {
  const [search, setSearch] = useState("");
  // Catalog list is a pure function of the category — derive, don't sync.
  const options = useMemo(() => (open ? getOptions(category, family) : []), [open, category, family]);

  // Clear the search box each time the dialog opens (state adjusted during render).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSearch("");
  }

  const filtered = options.filter(
    (o) =>
      !search ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.articleNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.specs.some((s) => s.value.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Swap {CATEGORY_LABELS[category]}</DialogTitle>
          <DialogDescription>
            Select an alternative component. Changes may require other components to be resized.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Search by name, article number, or specs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm"
        />

        <ScrollArea className="max-h-96">
          <div className="space-y-2 pr-3">
            {filtered.map((opt) => {
              const isCurrent = opt.articleNumber === currentArticle;
              return (
                <button
                  key={opt.articleNumber}
                  type="button"
                  onClick={() => {
                    onSelect(opt.articleNumber);
                    onClose();
                  }}
                  disabled={isCurrent}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-all",
                    "hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isCurrent
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30 cursor-default"
                      : "bg-card"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{opt.name}</div>
                    <div className="flex items-center gap-1.5">
                      {isCurrent && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4">CURRENT</Badge>
                      )}
                      <code className="text-[10px] font-mono text-muted-foreground">
                        {opt.articleNumber}
                      </code>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {opt.specs.map((s, i) => (
                      <div key={i} className="text-[11px]">
                        <span className="text-muted-foreground">{s.label}:</span>{" "}
                        <span className="font-medium tabular-nums">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No matches found.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
