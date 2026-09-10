"use client";

import { motion } from "framer-motion";
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
  safetyLevel: string;
  /** "" | "none" | "ht2" | "ht10" (optional) */
  handheldUnit: string;
  /** "" = default PP 72/48, "pp_72_48" | "et200sp" | "none" */
  ioModule: string;
  /** Preferred motor/encoder cable length in meters (default 10) */
  cableLengthMeters: string;
}

const SIZE_OPTIONS = [
  { value: "small", label: "Small", hint: "Table ≤500mm, mass <200kg/axis" },
  { value: "medium", label: "Medium", hint: "Table 500-1500mm, 200-500kg/axis" },
  { value: "large", label: "Large", hint: "Table >1500mm, 500-2000kg/axis" },
  { value: "very_large", label: "Very Large / Gantry", hint: ">2000mm, >2000kg/axis" },
];

const SAFETY_OPTIONS = [
  { value: "basic", label: "Basic", hint: "STO/SS1/SBC only — simple e-stop" },
  { value: "extended", label: "Extended", hint: "S60+S61 — safe axis monitoring (SLS/SOS)" },
  { value: "full", label: "Full / Kinematics", hint: "S60+S61+K — per-axis + safe kinematics" },
];

const HANDHELD_OPTIONS = [
  { value: "none", label: "None", hint: "Not required" },
  { value: "ht2", label: "HT 2", hint: "Compact 4.6″ display, handwheel + e-stop" },
  { value: "ht10", label: "HT 10", hint: "10″ touch, for setup-heavy operation" },
];

const IO_OPTIONS = [
  { value: "pp_72_48", label: "PP 72/48", hint: "Default — 72 DI / 48 DO over PROFINET" },
  { value: "et200sp", label: "ET 200SP", hint: "Modular distributed I/O for larger / mixed signal layouts" },
  { value: "none", label: "None", hint: "I/O handled externally" },
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
      <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 flex items-start gap-2.5">
        <svg className="h-4 w-4 text-primary mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground/90">All fields below are optional.</strong>{" "}
          Defaults are derived from the machine class — you can also add, swap, or remove any component on the next page (handheld, I/O module, motors, software options, …).
        </div>
      </div>
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

      {/* Safety level */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Safety Level
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SAFETY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("safetyLevel", opt.value)}
              className={cn(
                "rounded-lg border p-2 text-left transition-all text-xs",
                specs.safetyLevel === opt.value
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

      {/* I/O module (default PP 72/48) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Machine I/O Module
          <span className="text-[10px] text-muted-foreground/70 ml-1 font-normal">(default: PP 72/48)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {IO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("ioModule", opt.value)}
              className={cn(
                "rounded-lg border p-2 text-left transition-all text-xs",
                (specs.ioModule || "pp_72_48") === opt.value
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

      {/* Handheld terminal (optional) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Handheld Unit
          <span className="text-[10px] text-muted-foreground/70 ml-1 font-normal">(optional)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {HANDHELD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("handheldUnit", opt.value)}
              className={cn(
                "rounded-lg border p-2 text-left transition-all text-xs",
                (specs.handheldUnit || "none") === opt.value
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

      {/* Cable length */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Motor / Encoder Cable Length (m)
          <span className="text-[10px] text-muted-foreground/70 ml-1 font-normal">(default: 10)</span>
        </label>
        <Input
          placeholder="10"
          inputMode="numeric"
          value={specs.cableLengthMeters}
          onChange={(e) => update("cableLengthMeters", e.target.value)}
          className="text-sm max-w-32"
        />
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
  if (specs.safetyLevel) {
    const safetyLabels: Record<string, string> = {
      basic: "Basic safety (STO/SS1/SBC only)",
      extended: "Extended safety (S60 + S61 multi-axis monitoring)",
      full: "Full safety with per-axis + kinematics (S60 + S61 + K options)",
    };
    parts.push(`Safety level: ${safetyLabels[specs.safetyLevel] || specs.safetyLevel}`);
  }

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
  safetyLevel: "",
  handheldUnit: "",
  ioModule: "",
  cableLengthMeters: "",
};
