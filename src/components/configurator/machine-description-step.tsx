"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useConfiguratorStore } from "@/store/configurator-store";
import type { MachineType } from "@/types/catalog";
import { cn } from "@/lib/utils";
import {
  MachineSpecsForm,
  type MachineSpecs,
} from "./machine-specs-form";

const templates: {
  type: MachineType;
  name: string;
  icon: string;
  description: string;
  axes: string;
  badge?: string;
}[] = [
  {
    type: "3axis_mill",
    name: "3-Axis Mill",
    icon: "🏭",
    description: "Vertical milling center for general purpose machining",
    axes: "X, Y, Z + Spindle",
  },
  {
    type: "5axis_mill",
    name: "5-Axis Center",
    icon: "⚙️",
    description: "Simultaneous 5-axis for complex geometry parts",
    axes: "X, Y, Z, A, C + Spindle",
    badge: "Advanced",
  },
  {
    type: "cnc_lathe",
    name: "CNC Lathe",
    icon: "🔧",
    description: "2-axis turning for cylindrical parts production",
    axes: "X, Z + Main Spindle",
  },
  {
    type: "mill_turn",
    name: "Mill-Turn",
    icon: "🔩",
    description: "Combined turning and milling in a single setup",
    axes: "Multi-axis + Multi-spindle",
    badge: "Multi-Ch",
  },
  {
    type: "grinding",
    name: "Grinding",
    icon: "💎",
    description: "Surface or cylindrical precision grinding",
    axes: "X, Y, Z + Wheel",
  },
  {
    type: "laser",
    name: "Laser Cutting",
    icon: "⚡",
    description: "2D/3D laser cutting with power control",
    axes: "X, Y, Z + Laser",
  },
  {
    type: "punching",
    name: "Punch / Nibble",
    icon: "🔨",
    description: "Sheet metal punching and nibbling",
    axes: "X, Y + Tool",
  },
  {
    type: "robot",
    name: "Robot Cell",
    icon: "🤖",
    description: "6-axis articulated robot with CNC control",
    axes: "6 Joint Axes",
    badge: "Complex",
  },
];

export function MachineDescriptionStep() {
  const {
    machineDescription,
    selectedTemplate,
    machineSpecs,
    setMachineDescription,
    selectTemplate,
    setMachineSpecs,
    setStep,
    completeStep,
  } = useConfiguratorStore();

  const [mode, setMode] = useState<"template" | "custom">("template");
  const [showSpecs, setShowSpecs] = useState(false);

  const hasTemplate = mode === "template" && selectedTemplate;
  const hasCustom = mode === "custom" && machineDescription.trim().length > 10;
  const canProceed = hasTemplate || hasCustom;

  const handleProceed = () => {
    // Specs are stored separately and read by the AI analysis step.
    // Do NOT mutate machineDescription here (was causing double-appending bug).
    completeStep("description");
    setStep("analysis");
  };

  // Local state is synced to store — avoids re-render noise
  const specs = machineSpecs as MachineSpecs;
  const handleSpecsChange = (s: MachineSpecs) => setMachineSpecs(s);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Select Machine Type</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a template and specify mechanical details for proper motor/drive sizing
        </p>
      </div>

      {/* Mode toggle */}
      <div className="inline-flex rounded-lg border bg-muted/50 p-0.5">
        <button
          type="button"
          className={cn(
            "rounded-md px-4 py-1.5 text-xs font-medium transition-all",
            mode === "template"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setMode("template")}
        >
          Templates
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-4 py-1.5 text-xs font-medium transition-all",
            mode === "custom"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setMode("custom")}
        >
          Custom Description
        </button>
      </div>

      {mode === "template" ? (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {templates.map((template, index) => {
              const isSelected = selectedTemplate === template.type;
              return (
                <motion.button
                  key={template.type}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => {
                    selectTemplate(template.type);
                    setShowSpecs(true);
                  }}
                  className={cn(
                    "relative text-left rounded-xl border p-4 transition-all h-full flex flex-col",
                    "hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/30"
                      : "bg-card hover:bg-card/80"
                  )}
                >
                  {template.badge && (
                    <span className="absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-wider text-primary/70 bg-primary/10 rounded px-1.5 py-0.5">
                      {template.badge}
                    </span>
                  )}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 left-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center"
                    >
                      <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </motion.div>
                  )}
                  <span className="text-2xl mt-1">{template.icon}</span>
                  <h3 className="mt-2 font-semibold text-sm leading-tight">{template.name}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed flex-1">{template.description}</p>
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <p className="text-[10px] text-primary/80 font-medium">{template.axes}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Additional notes */}
          {selectedTemplate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="max-w-3xl"
            >
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Additional requirements (optional)
              </label>
              <Textarea
                placeholder="e.g., gantry type X/Y, high-speed spindle, specific axis configuration..."
                value={machineDescription}
                onChange={(e) => setMachineDescription(e.target.value)}
                className="min-h-20 text-sm resize-none"
              />
            </motion.div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-3xl space-y-3"
        >
          <Textarea
            placeholder={"Describe your machine in detail:\n\ne.g., 5-axis gantry milling machine for aerospace parts, 3000x2000x1000mm travel, gantry moving mass ~2000kg per axis, spindle 24000rpm 30kW"}
            value={machineDescription}
            onChange={(e) => {
              setMachineDescription(e.target.value);
              if (e.target.value.length > 10) setShowSpecs(true);
            }}
            className="min-h-40 text-sm resize-none"
          />
        </motion.div>
      )}

      {/* Machine specs form — always shown after template/description */}
      {(showSpecs || selectedTemplate) && canProceed && (
        <div className="max-w-3xl">
          <MachineSpecsForm specs={specs} onChange={handleSpecsChange} />
        </div>
      )}

      {/* Proceed */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          disabled={!canProceed}
          onClick={handleProceed}
          className="gap-2"
        >
          Continue to AI Analysis
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Button>
        {!canProceed && (
          <span className="text-xs text-muted-foreground">
            {mode === "template" ? "Select a machine type above" : "Enter at least 10 characters"}
          </span>
        )}
        {canProceed && !specs.machineSize && (
          <span className="text-xs text-amber-500">
            Fill in machine specs above for optimal motor/drive sizing
          </span>
        )}
      </div>
    </motion.div>
  );
}
