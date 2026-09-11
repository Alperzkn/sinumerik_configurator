"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MachineSpecsState } from "@/store/configurator-store";

/** The specs form edits the store's MachineSpecsState directly. */
export type MachineSpecs = MachineSpecsState;

const SIZE_OPTIONS = [
  { value: "small", label: "Small", hint: "Table ≤500 mm · <200 kg/axis" },
  { value: "medium", label: "Medium", hint: "500–1500 mm · 200–500 kg/axis" },
  { value: "large", label: "Large", hint: ">1500 mm · 500–2000 kg/axis" },
  { value: "very_large", label: "Very large / gantry", hint: ">2000 mm · >2000 kg/axis" },
];

const SAFETY_OPTIONS = [
  { value: "basic", label: "Basic", hint: "STO/SS1/SBC only — simple e-stop" },
  { value: "extended", label: "Extended", hint: "Safe axis monitoring (SLS/SOS)" },
  { value: "full", label: "Full / Kinematics", hint: "Per-axis + safe kinematics" },
];

const HANDHELD_OPTIONS = [
  { value: "none", label: "None", hint: "Not required" },
  { value: "ht2", label: "HT 2", hint: "Compact 4.6″, handwheel + e-stop" },
  { value: "ht10", label: "HT 10", hint: "10″ touch, setup-heavy use" },
];

const IO_OPTIONS = [
  { value: "pp_72_48", label: "PP 72/48", hint: "Default — 72 DI / 48 DO" },
  { value: "et200sp", label: "ET 200SP", hint: "Modular distributed I/O" },
  { value: "none", label: "None", hint: "I/O handled externally" },
];

/** Fields that live behind the "More specs" toggle. */
const ADVANCED_FIELDS: Array<keyof MachineSpecs> = [
  "axisTravel",
  "movingMass",
  "rapidTraverse",
  "material",
  "safetyLevel",
  "ioModule",
  "handheldUnit",
  "cableLengthMeters",
];

interface MachineSpecsFormProps {
  specs: MachineSpecs;
  onChange: (specs: MachineSpecs) => void;
}

function ChoiceGrid({
  value,
  options,
  onPick,
  columns = 3,
}: {
  value: string;
  options: { value: string; label: string; hint: string }[];
  onPick: (v: string) => void;
  columns?: 3 | 4;
}) {
  return (
    <div className={cn("grid gap-2", columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3")}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onPick(value === opt.value ? "" : opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            "rounded-lg border p-2 text-left transition-all text-xs",
            value === opt.value ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:border-primary/30",
          )}
        >
          <div className="font-medium">{opt.label}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{opt.hint}</div>
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        {label}
        {hint && <span className="ml-1 text-[10px] font-normal text-muted-foreground/70">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * Two tiers. Essentials are what actually change the architecture and the
 * motor sizing (axis counts, spindle, machine class). Everything else sits
 * behind a toggle so a first-time user sees five inputs, not fourteen.
 */
export function MachineSpecsForm({ specs, onChange }: MachineSpecsFormProps) {
  const update = (field: keyof MachineSpecs, value: string) => onChange({ ...specs, [field]: value });
  const advancedFilled = ADVANCED_FIELDS.filter((f) => String(specs[f] ?? "").trim()).length;
  const [showAdvanced, setShowAdvanced] = useState(advancedFilled > 0);

  return (
    <div className="space-y-4">
      {/* ── Essentials ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Feed axes" hint="(X, Y, Z, …)">
          <Input
            inputMode="numeric"
            placeholder="e.g. 3"
            value={specs.feedAxes}
            onChange={(e) => update("feedAxes", e.target.value.replace(/[^\d]/g, ""))}
            className="text-sm"
          />
        </Field>
        <Field label="Spindles">
          <Input
            inputMode="numeric"
            placeholder="e.g. 1"
            value={specs.spindles}
            onChange={(e) => update("spindles", e.target.value.replace(/[^\d]/g, ""))}
            className="text-sm"
          />
        </Field>
        <Field label="Spindle power" hint="kW">
          <Input placeholder="e.g. 15" value={specs.spindlePower} onChange={(e) => update("spindlePower", e.target.value)} className="text-sm" />
        </Field>
        <Field label="Spindle max speed" hint="rpm">
          <Input placeholder="e.g. 12000" value={specs.spindleSpeed} onChange={(e) => update("spindleSpeed", e.target.value)} className="text-sm" />
        </Field>
      </div>

      <Field label="Machine size" hint="(sets sensible mass / rapid defaults)">
        <ChoiceGrid value={specs.machineSize} options={SIZE_OPTIONS} onPick={(v) => update("machineSize", v)} columns={4} />
      </Field>

      {/* ── Advanced toggle ── */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        aria-expanded={showAdvanced}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")} />
        More specs
        <span className="text-[10px] text-muted-foreground/70">
          {advancedFilled ? `· ${advancedFilled} filled` : "· travel, mass, rapid, material, safety, I/O, handheld, cables"}
        </span>
      </button>

      {showAdvanced && (
        <div className="space-y-4 rounded-lg border border-dashed bg-muted/10 p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Axis travel" hint="X × Y × Z mm">
              <Input placeholder="e.g. 800 × 500 × 500" value={specs.axisTravel} onChange={(e) => update("axisTravel", e.target.value)} className="text-sm" />
            </Field>
            <Field label="Moving mass per axis" hint="kg">
              <Input placeholder="e.g. 300" value={specs.movingMass} onChange={(e) => update("movingMass", e.target.value)} className="text-sm" />
            </Field>
            <Field label="Rapid traverse" hint="m/min">
              <Input placeholder="e.g. 30" value={specs.rapidTraverse} onChange={(e) => update("rapidTraverse", e.target.value)} className="text-sm" />
            </Field>
            <Field label="Primary workpiece material">
              <Input placeholder="e.g. aluminum, steel, titanium" value={specs.material} onChange={(e) => update("material", e.target.value)} className="text-sm" />
            </Field>
          </div>
          <Field label="Safety level">
            <ChoiceGrid value={specs.safetyLevel} options={SAFETY_OPTIONS} onPick={(v) => update("safetyLevel", v)} />
          </Field>
          <Field label="Machine I/O module" hint="(default PP 72/48)">
            <ChoiceGrid value={specs.ioModule || "pp_72_48"} options={IO_OPTIONS} onPick={(v) => update("ioModule", v)} />
          </Field>
          <Field label="Handheld unit" hint="(optional)">
            <ChoiceGrid value={specs.handheldUnit || "none"} options={HANDHELD_OPTIONS} onPick={(v) => update("handheldUnit", v)} />
          </Field>
          <Field label="Motor / encoder cable length" hint="m (default 10)">
            <Input placeholder="10" inputMode="numeric" value={specs.cableLengthMeters} onChange={(e) => update("cableLengthMeters", e.target.value)} className="text-sm max-w-32" />
          </Field>
        </div>
      )}
    </div>
  );
}

export function formatSpecsForAi(specs: MachineSpecs): string {
  const parts: string[] = [];
  if (specs.feedAxes) parts.push(`Feed axes: ${specs.feedAxes}`);
  if (specs.spindles) parts.push(`Spindles: ${specs.spindles}`);
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
