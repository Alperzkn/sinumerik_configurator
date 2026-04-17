"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MachineSpecs {
  axisTravel: string;
  movingMass: string;
  rapidTraverse: string;
  spindlePower: string;
  spindleSpeed: string;
  material: string;
  machineSize: string;
}

const SIZE_OPTIONS = [
  { value: "small", label: "Small", hint: "Table ≤500mm, mass <200kg/axis" },
  { value: "medium", label: "Medium", hint: "Table 500-1500mm, 200-500kg/axis" },
  { value: "large", label: "Large", hint: "Table >1500mm, 500-2000kg/axis" },
  { value: "very_large", label: "Very Large / Gantry", hint: ">2000mm, >2000kg/axis" },
];

interface MachineSpecsFormProps {
  specs: MachineSpecs;
  onChange: (specs: MachineSpecs) => void;
}

export function MachineSpecsForm({ specs, onChange }: MachineSpecsFormProps) {
  const update = (field: keyof MachineSpecs, value: string) => {
    onChange({ ...specs, [field]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="space-y-4"
    >
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Machine Specifications (for motor/drive sizing)
      </div>

      {/* Machine size category */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Machine Size
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("machineSize", opt.value)}
              className={cn(
                "rounded-lg border p-2 text-left transition-all text-xs",
                specs.machineSize === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "hover:border-primary/30"
              )}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{opt.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Axis travels */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Axis Travel (X × Y × Z mm)
          </label>
          <Input
            placeholder="e.g., 800 × 500 × 500"
            value={specs.axisTravel}
            onChange={(e) => update("axisTravel", e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Moving mass */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Moving Mass per Axis (kg)
          </label>
          <Input
            placeholder="e.g., 300"
            value={specs.movingMass}
            onChange={(e) => update("movingMass", e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Rapid traverse */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Rapid Traverse Speed (m/min)
          </label>
          <Input
            placeholder="e.g., 30"
            value={specs.rapidTraverse}
            onChange={(e) => update("rapidTraverse", e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Workpiece material */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Primary Workpiece Material
          </label>
          <Input
            placeholder="e.g., aluminum, steel, titanium"
            value={specs.material}
            onChange={(e) => update("material", e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Spindle power */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Spindle Power (kW)
          </label>
          <Input
            placeholder="e.g., 15"
            value={specs.spindlePower}
            onChange={(e) => update("spindlePower", e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Spindle speed */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Spindle Max Speed (rpm)
          </label>
          <Input
            placeholder="e.g., 12000"
            value={specs.spindleSpeed}
            onChange={(e) => update("spindleSpeed", e.target.value)}
            className="text-sm"
          />
        </div>
      </div>
    </motion.div>
  );
}

export function formatSpecsForAi(specs: MachineSpecs): string {
  const parts: string[] = [];

  if (specs.machineSize) {
    const labels: Record<string, string> = {
      small: "Small machine (table ≤500mm, moving mass <200kg/axis)",
      medium: "Medium machine (table 500-1500mm, moving mass 200-500kg/axis)",
      large: "Large machine (table >1500mm, moving mass 500-2000kg/axis)",
      very_large: "Very large / gantry machine (>2000mm travel, >2000kg/axis moving mass)",
    };
    parts.push(`Machine size: ${labels[specs.machineSize] || specs.machineSize}`);
  }
  if (specs.axisTravel) parts.push(`Axis travel: ${specs.axisTravel} mm`);
  if (specs.movingMass) parts.push(`Moving mass per axis: ${specs.movingMass} kg`);
  if (specs.rapidTraverse) parts.push(`Rapid traverse speed: ${specs.rapidTraverse} m/min`);
  if (specs.spindlePower) parts.push(`Spindle power: ${specs.spindlePower} kW`);
  if (specs.spindleSpeed) parts.push(`Spindle max speed: ${specs.spindleSpeed} rpm`);
  if (specs.material) parts.push(`Primary material: ${specs.material}`);

  return parts.length > 0 ? "\n\nMechanical Specifications:\n" + parts.join("\n") : "";
}

export const EMPTY_SPECS: MachineSpecs = {
  axisTravel: "",
  movingMass: "",
  rapidTraverse: "",
  spindlePower: "",
  spindleSpeed: "",
  material: "",
  machineSize: "",
};
