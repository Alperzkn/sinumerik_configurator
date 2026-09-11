"use client";

import { motion } from "framer-motion";
import { specsToSizingInput } from "@/lib/sizing/specs-input";
import { useState } from "react";
import {
  ClipboardPaste,
  FolderOpen,
  Check,
  ArrowRight,
  Box,
  Rotate3d,
  Cylinder,
  Combine,
  CircleDot,
  Zap,
  Grid3x3,
  Bot,
  Pencil,
  Cpu,
  Sparkles,
  Hammer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useConfiguratorStore } from "@/store/configurator-store";
import { CONTROL_SYSTEM_FAMILIES, type ControlSystemFamily, type MachineType } from "@/types/catalog";
import { cn } from "@/lib/utils";
import {
  MachineSpecsForm,
  type MachineSpecs,
} from "./machine-specs-form";
import { buildConfigFromTemplate } from "@/lib/ai/build-from-template";
import { SaveLoadDialog } from "./save-load-dialog";
import { ShareConfigDialog } from "./share-config-dialog";
import { startNewTrace, trackAction } from "@/lib/telemetry/client";

interface TemplateCard {
  type: MachineType;
  name: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  description: string;
  axes: string;
  badge?: string;
}

const templates: TemplateCard[] = [
  {
    type: "3axis_mill",
    name: "3-Axis Mill",
    Icon: Box,
    description: "Vertical milling center for general purpose machining",
    axes: "X, Y, Z + Spindle",
  },
  {
    type: "5axis_mill",
    name: "5-Axis Center",
    Icon: Rotate3d,
    description: "Simultaneous 5-axis for complex geometry parts",
    axes: "X, Y, Z, A, C + Spindle",
    badge: "Advanced",
  },
  {
    type: "cnc_lathe",
    name: "CNC Lathe",
    Icon: Cylinder,
    description: "2-axis turning for cylindrical parts production",
    axes: "X, Z + Main Spindle",
  },
  {
    type: "mill_turn",
    name: "Mill-Turn",
    Icon: Combine,
    description: "Combined turning and milling in a single setup",
    axes: "Multi-axis + Multi-spindle",
    badge: "Multi-Ch",
  },
  {
    type: "grinding",
    name: "Grinding",
    Icon: CircleDot,
    description: "Surface or cylindrical precision grinding",
    axes: "X, Y, Z + Wheel",
  },
  {
    type: "laser",
    name: "Laser Cutting",
    Icon: Zap,
    description: "2D/3D laser cutting with power control",
    axes: "X, Y, Z + Laser",
  },
  {
    type: "punching",
    name: "Punch / Nibble",
    Icon: Grid3x3,
    description: "Sheet metal punching and nibbling",
    axes: "X, Y + Tool",
  },
  {
    type: "router",
    name: "Gantry Router",
    Icon: Hammer,
    description: "Wood / composite routing with an X1-X2 portal, Y and braked Z",
    axes: "X1, X2, Y1, Z1 + Spindle",
    badge: "Gantry",
  },
  {
    type: "robot",
    name: "Robot Cell",
    Icon: Bot,
    description: "6-axis articulated robot with CNC control",
    axes: "6 Joint Axes",
    badge: "Complex",
  },
];

type FamilyChoice = ControlSystemFamily | "auto";

const SYSTEM_OPTIONS: { value: FamilyChoice; name: string; tagline: string; hint: string }[] = [
  {
    value: "sinumerik_one",
    name: CONTROL_SYSTEM_FAMILIES.sinumerik_one.label,
    tagline: "Premium · up to 50 axes · S120/S210",
    hint: "Digital-native flagship: NCU/PPU 17x0, multi-channel, 5-axis, HSC, full safety and OPC UA.",
  },
  {
    value: "828d",
    name: CONTROL_SYSTEM_FAMILIES["828d"].label,
    tagline: "Compact · up to 8 axes · S120 Combi/booksize",
    hint: "Panel-based CNC for standard milling, turning and grinding machines; PPU 24x.5 / 27x.5 / 290.5.",
  },
  {
    value: "828d_smart",
    name: CONTROL_SYSTEM_FAMILIES["828d_smart"].label,
    tagline: "Entry · up to 5 axes · S200 + 1FL2 / 1PH3 Pro",
    hint: "Cost-optimised 828D with PROFINET S200 drives — the successor of 808D ADVANCED machines.",
  },
  {
    value: "auto",
    name: "Not sure — let the AI recommend",
    tagline: "Decided from your description",
    hint: "The AI weighs axes, channels, dynamics and options and proposes ONE, 828D or 828D Smart with a reason.",
  },
];

export function MachineDescriptionStep() {
  const {
    controlFamily,
    setControlFamily,
    machineDescription,
    selectedTemplate,
    machineSpecs,
    setMachineDescription,
    selectTemplate,
    setMachineSpecs,
    setStep,
    completeStep,
    setConfiguration,
  } = useConfiguratorStore();

  const [buildingTemplate, setBuildingTemplate] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const hasTemplate = !!selectedTemplate && selectedTemplate !== "custom";
  const familyChosen = controlFamily !== "auto";
  const hasNotes = machineDescription.trim().length > 0;
  const hasCustomDescription = machineDescription.trim().length > 10;
  const canProceed = hasTemplate || hasCustomDescription;

  // Whenever the user provides additional context (mechanical specs OR
  // any free-text notes), route through the AI so it can refine the
  // template architecture against their specs. Pure "template + nothing"
  // stays on the deterministic fast path.
  const hasSpecsFilled = Boolean(
    machineSpecs.spindlePower.trim() ||
      machineSpecs.spindleSpeed.trim() ||
      machineSpecs.movingMass.trim() ||
      machineSpecs.rapidTraverse.trim() ||
      machineSpecs.axisTravel.trim() ||
      machineSpecs.machineSize ||
      machineSpecs.safetyLevel ||
      machineSpecs.material.trim()
  );
  // Axis / spindle counts do not force the AI path: the template builder
  // applies them deterministically (licences are recomputed from the counts).
  // "Not sure" about the control system always goes through the AI.
  const useTemplateFlow = hasTemplate && !hasSpecsFilled && !hasNotes && familyChosen;


  const handleProceed = async () => {
    // Begin a fresh telemetry trace for this configuration journey.
    startNewTrace();
    trackAction("journey_start", {
      controlFamily,
      template: selectedTemplate,
      hasNotes,
      hasSpecsFilled,
      useTemplateFlow,
    });

    // Template flow — skip AI round-trip, build config deterministically.
    // User can still tweak via the Ask-AI pane on the configuration page.
    if (useTemplateFlow && selectedTemplate) {
      setBuildingTemplate(true);
      try {
        const config = await buildConfigFromTemplate(
          selectedTemplate,
          specsToSizingInput(machineSpecs),
          controlFamily as ControlSystemFamily
        );
        if (config) {
          setConfiguration(config);
          completeStep("description");
          completeStep("analysis"); // mark as skipped/completed
          setStep("configuration");
          return;
        }
      } catch (err) {
        console.error("[Template] Failed to build config:", err);
      } finally {
        setBuildingTemplate(false);
      }
    }

    // AI flow — either no template (custom only), or template + specs/notes.
    // Wipe any stale aiMessages first so the AI re-analyses against the
    // current specs instead of replaying an earlier conversation.
    useConfiguratorStore.setState({
      aiMessages: [],
      isConfigurationReady: false,
    });
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Step 01 · Input
          </div>
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight">Describe your machine</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Choose the control system (or let the AI recommend one), pick a template or describe the machine, and add the few specs that matter. Everything else is optional.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowShare(true)}
            className="gap-1.5 text-xs h-8"
            title="Paste a configuration someone shared as text — optionally ask the AI to modify it"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste shared
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLoad(true)}
            className="gap-1.5 text-xs h-8"
            title="Open a saved configuration"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Open saved
          </Button>
        </div>
      </div>

      {/* ── Control system ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80">01a</div>
          <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
            <Cpu className="h-3 w-3" />
            Which control system?
          </h3>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {SYSTEM_OPTIONS.map((opt) => {
            const isSelected = controlFamily === opt.value;
            const isAuto = opt.value === "auto";
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setControlFamily(opt.value)}
                aria-pressed={isSelected}
                className={cn(
                  "relative text-left rounded-lg border p-4 transition-all h-full flex flex-col gap-1.5",
                  "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" : "bg-card hover:bg-card/80",
                  isAuto && "border-dashed",
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center shadow">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  {isAuto ? (
                    <Sparkles className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} strokeWidth={1.5} />
                  ) : (
                    <Cpu className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} strokeWidth={1.5} />
                  )}
                  <h4 className="font-medium text-sm leading-tight">{opt.name}</h4>
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-primary/80">{opt.tagline}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.hint}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Templates — always visible; selecting one toggles the fast path ── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80">
              01b
            </div>
            <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Quick-start templates
            </h3>
          </div>
          {selectedTemplate && (
            <button
              type="button"
              onClick={() => selectTemplate("custom")}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear selection — write from scratch
            </button>
          )}
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {templates.map((template, index) => {
            const isSelected = selectedTemplate === template.type;
            const { Icon } = template;
            return (
              <motion.button
                key={template.type}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => selectTemplate(template.type)}
                className={cn(
                  "relative text-left rounded-lg border p-4 transition-all h-full flex flex-col gap-2",
                  "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "bg-card hover:bg-card/80"
                )}
              >
                {template.badge && (
                  <span className="absolute top-2 right-2 text-[9px] font-mono uppercase tracking-wider text-primary/70 bg-primary/10 rounded px-1.5 py-0.5">
                    {template.badge}
                  </span>
                )}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 left-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center shadow"
                  >
                    <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                  </motion.div>
                )}
                <Icon
                  className={cn(
                    "h-6 w-6 mt-1 transition-colors",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={1.5}
                />
                <h4 className="font-medium text-sm leading-tight">{template.name}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
                  {template.description}
                </p>
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-primary/80">
                    {template.axes}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── Description — shared between template "additional notes" and full custom ── */}
      <section className="space-y-2 max-w-3xl">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80">
            01c
          </div>
          <label
            htmlFor="machine-description"
            className="text-xs uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5"
          >
            <Pencil className="h-3 w-3" />
            {useTemplateFlow ? "Additional notes" : "Machine description"}
            <span className="text-[10px] text-muted-foreground/60 normal-case tracking-normal">
              {useTemplateFlow ? "(optional)" : "(required — at least 10 chars)"}
            </span>
          </label>
        </div>
        <Textarea
          id="machine-description"
          placeholder={
            useTemplateFlow
              ? "Optional refinements — e.g. gantry type X/Y, forced-ventilation motors, 24 kW spindle at 18 000 rpm…"
              : "Describe your machine. e.g. “5-axis gantry milling machine for aerospace parts, 3000×2000×1000 mm travel, gantry moving mass ~2000 kg per axis, spindle 24 000 rpm 30 kW, full-scope CNC with extended safety.”"
          }
          value={machineDescription}
          onChange={(e) => setMachineDescription(e.target.value)}
          className={cn("text-sm resize-none", useTemplateFlow ? "min-h-20" : "min-h-32")}
        />
      </section>

      {/* ── Mechanical specs (always visible; optional) ── */}
      <section className="space-y-2 max-w-3xl">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80">
            01d
          </div>
          <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Key specs
            <span className="ml-1.5 text-[10px] text-muted-foreground/60 normal-case tracking-normal">
              (optional — axes and spindle drive the licences and motor sizing)
            </span>
          </h3>
        </div>
        <MachineSpecsForm specs={specs} onChange={handleSpecsChange} />
      </section>

      {/* Proceed */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-2 border-t">
        <Button
          disabled={!canProceed || buildingTemplate}
          onClick={handleProceed}
          className="gap-2 mt-2 w-fit"
        >
          {buildingTemplate
            ? "Building configuration…"
            : useTemplateFlow
              ? "Build configuration"
              : !familyChosen
                ? "Let the AI choose the system"
                : hasTemplate
                  ? "Refine with AI"
                  : "Analyze with AI"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        {!canProceed && (
          <span className="text-xs text-muted-foreground sm:mt-2">
            Select a template above <span className="text-muted-foreground/60">or</span> write a description of at least 10 characters.
          </span>
        )}
        {canProceed && (
          <span className="text-xs text-muted-foreground sm:mt-2">
            {useTemplateFlow
              ? "Template path — BOM builds deterministically, no AI round-trip."
              : !familyChosen
                ? "The AI recommends ONE, 828D or 828D Smart from your inputs, then the rule engine sizes everything."
                : hasTemplate
                  ? "AI will refine the template architecture against your specs / notes, then size motors & drives."
                  : "AI analysis — returns architecture, sizing engine fills in motors & drives."}
          </span>
        )}
      </div>

      {/* Load saved dialog */}
      {showLoad && (
        <SaveLoadDialog
          open={showLoad}
          mode="load"
          onClose={() => setShowLoad(false)}
        />
      )}

      {/* Paste shared text / import dialog */}
      {showShare && (
        <ShareConfigDialog
          open={showShare}
          onClose={() => setShowShare(false)}
          defaultTab="import"
        />
      )}
    </motion.div>
  );
}
