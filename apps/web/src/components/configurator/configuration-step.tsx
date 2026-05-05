"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Save,
  FolderOpen,
  ArrowLeft,
  ArrowRight,
  Cpu,
  Terminal,
  Boxes,
  Settings2,
  Zap,
  CircleDot,
  Monitor,
  Cable,
  ShieldCheck,
  Smartphone,
  Network,
  AlertTriangle,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion } from "@/components/ui/accordion";
import { useConfiguratorStore } from "@/store/configurator-store";
import { SectionPanel } from "./section-panel";
import { ComponentCard, type ComponentSpec } from "./component-card";
import { PerAxisMlfbList } from "./per-axis-mlfb-list";
import { CompatibilityWarnings } from "./compatibility-warning";
import { ComponentSwapDialog, type SwapCategory } from "./component-swap-dialog";
import { SoftwareOptionDialog } from "./software-option-dialog";
import { SaveLoadDialog } from "./save-load-dialog";
import { AiModifyPane } from "./ai-modify-pane";
import { HistoryPanel } from "./history-panel";
import { DisclaimerDialog, hasAcknowledgedDisclaimer } from "./disclaimer-dialog";
import { FeedbackPill } from "./feedback-pill";
import {
  applySwap,
  addSoftwareOption,
  removeSoftwareOption,
  addTechnologyPackage,
  removeTechnologyPackage,
  removeSafetyFunctions,
} from "@/lib/ai/config-mutations";
import { softwareOptions as catalogSoftwareOptions } from "@/data/software-options";
import { technologyPackages as catalogTechPackages } from "@/data/technology-packages";
import { toast } from "@/components/ui/toast";
import { logConfiguration as telemetryLogConfiguration, trackAction } from "@/lib/telemetry/client";

export function ConfigurationStep() {
  const {
    configuration,
    setStep,
    completeStep,
    setConfiguration,
    aiMessages,
    pushHistory,
    machineDescription,
    selectedTemplate,
    machineSpecs,
  } = useConfiguratorStore();
  // The configurations row id (returned by /api/events/configuration) is
  // captured the first time we render this step with a config; it's
  // used by FeedbackPill to attach a thumbs vote on the BOM as a whole.
  const [configRowId, setConfigRowId] = useState<string | null>(null);
  const [swapState, setSwapState] = useState<{
    category: SwapCategory;
    currentArticle?: string;
  } | null>(null);
  const [showAddOption, setShowAddOption] = useState(false);
  const [saveLoadMode, setSaveLoadMode] = useState<"save" | "load" | null>(null);
  // Controlled accordion — starts fully collapsed. Users either click a
  // single section header or use the Expand-all toggle below.
  const [openSections, setOpenSections] = useState<string[]>([]);

  // Engineering-review disclaimer. Shown on first arrival at this step
  // when a configuration has just been generated, unless the user has
  // already acknowledged it on this device. A "Re-read" link below the
  // header re-opens it in dismissible mode.
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showDisclaimerDismissible, setShowDisclaimerDismissible] =
    useState(false);
  useEffect(() => {
    if (configuration && !hasAcknowledgedDisclaimer()) {
      setShowDisclaimer(true);
    }
  }, [configuration]);

  // Log the BOM to telemetry the first time we see a configuration on this
  // step. Includes a slim BOM-items list (mlfb, qty, name, category) so the
  // admin dashboard can show the actual output without storing the full
  // GeneratedConfiguration tree.
  useEffect(() => {
    if (!configuration || configRowId) return;
    const bomItems: Array<{ mlfb: string; qty: number; name: string; category: string }> = [];
    bomItems.push({
      mlfb: configuration.controlUnit.articleNumber,
      qty: 1,
      name: configuration.controlUnit.name,
      category: "Control Unit",
    });
    bomItems.push({
      mlfb: configuration.cncSoftware.articleNumber,
      qty: 1,
      name: configuration.cncSoftware.description,
      category: "CNC Software",
    });
    for (const pkg of configuration.technologyPackages) {
      bomItems.push({ mlfb: pkg.articleNumber, qty: 1, name: pkg.name, category: "Tech Package" });
    }
    for (const opt of configuration.softwareOptions) {
      bomItems.push({
        mlfb: opt.articleNumber,
        qty: configuration.optionQuantities[opt.id] || 1,
        name: opt.name,
        category: "Software Option",
      });
    }
    for (const drive of configuration.drives) {
      bomItems.push({
        mlfb: drive.articleNumber,
        qty: configuration.driveQuantities[drive.id] || 1,
        name: drive.name,
        category: "Drive",
      });
    }
    for (const motor of configuration.motors) {
      bomItems.push({
        mlfb: motor.articleNumber || motor.series,
        qty: configuration.motorQuantities[motor.id] || 1,
        name: motor.name,
        category: "Motor",
      });
    }
    for (const hmi of configuration.hmiComponents) {
      bomItems.push({ mlfb: hmi.articleNumber, qty: 1, name: hmi.name, category: "HMI" });
    }
    for (const sf of configuration.safetyFunctions.filter((s) => !s.isBasicScope)) {
      bomItems.push({
        mlfb: sf.articleNumber || "",
        qty: 1,
        name: sf.name,
        category: "Safety",
      });
    }
    for (const c of configuration.cables || []) {
      if (c.quantity > 0) {
        bomItems.push({ mlfb: c.articleNumber, qty: c.quantity, name: c.name, category: "Cable" });
      }
    }

    let cancelled = false;
    void telemetryLogConfiguration({
      template: selectedTemplate,
      description: machineDescription || null,
      machine_specs: machineSpecs,
      control_unit: configuration.controlUnit.id,
      cnc_software: configuration.cncSoftware.articleNumber,
      total_axes: configuration.totalAxes,
      total_channels: configuration.totalChannels,
      complexity: configuration.estimatedComplexity,
      bom_items: bomItems,
      warnings: configuration.warnings,
      notes: configuration.notes,
    }).then((id) => {
      if (!cancelled && id) setConfigRowId(id);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuration]);

  const openSwap = (category: SwapCategory, currentArticle?: string) => {
    setSwapState({ category, currentArticle });
  };

  const handleSwapSelect = (articleNumber: string) => {
    if (!configuration || !swapState) return;
    void trackAction("swap", {
      category: swapState.category,
      from: swapState.currentArticle,
      to: articleNumber,
    });
    const updated = applySwap(configuration, swapState.category, articleNumber);
    setConfiguration(updated);
    pushHistory({
      kind: "swap",
      title: `Swapped ${swapState.category.replace(/_/g, " ")}`,
      details: articleNumber,
      snapshot: updated,
    });
    toast.success("Component swapped", `${swapState.category.replace(/_/g, " ")} → ${articleNumber}`);
    setSwapState(null);
  };

  if (!configuration) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No configuration generated yet.</p>
        <Button className="mt-4" onClick={() => setStep("description")}>
          Start Over
        </Button>
      </div>
    );
  }

  const handleProceed = () => {
    completeStep("configuration");
    setStep("summary");
  };

  const complexityColors = {
    basic: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    standard: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    advanced: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    complex: "bg-red-500/15 text-red-400 border-red-500/20",
  };

  // Section keys that are actually rendered for this configuration.
  // Mirror the conditional checks below — keep these in sync if a new
  // section is added.
  const operatorHmi = configuration.hmiComponents.filter(
    (h) => h.category !== "io_module" && h.category !== "handheld_terminal",
  );
  const ioModulesList = configuration.hmiComponents.filter((h) => h.category === "io_module");
  const handheldList = configuration.hmiComponents.filter((h) => h.category === "handheld_terminal");
  const availableSections: string[] = [
    "control-unit",
    "cnc-software",
    ...(configuration.technologyPackages.length > 0 ? ["tech-packages"] : []),
    "software-options",
    ...(configuration.drives.length > 0 ? ["drives"] : []),
    ...(configuration.motors.length > 0 ? ["motors"] : []),
    ...(operatorHmi.length > 0 ? ["hmi"] : []),
    ...(ioModulesList.length > 0 ? ["io-modules"] : []),
    ...(handheldList.length > 0 ? ["handheld"] : []),
    ...(configuration.safetyFunctions.length > 0 ? ["safety"] : []),
    ...(configuration.cables && configuration.cables.length > 0 ? ["cables"] : []),
  ];
  const allOpen = openSections.length === availableSections.length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header — split into title row + single status strip */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Step 03 · Configure
            </div>
            <h2 className="text-xl sm:text-2xl font-medium tracking-tight">
              Generated configuration
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Swap components, add/remove options, or ask the AI for a change. Re-sizing updates motors, drives, and cables automatically.
            </p>
            <button
              type="button"
              onClick={() => setShowDisclaimerDismissible(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-amber-500/90 hover:text-amber-500 transition-colors underline underline-offset-2 decoration-amber-500/40"
              title="Re-read the engineering-review disclaimer"
            >
              <AlertTriangle className="h-3 w-3" strokeWidth={2} />
              Engineering review required — read the disclaimer
            </button>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 flex-1 sm:flex-none"
              onClick={() => setSaveLoadMode("save")}
              title="Save this configuration to your browser"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 flex-1 sm:flex-none"
              onClick={() => setSaveLoadMode("load")}
              title="Load a previously saved configuration"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Open
            </Button>
          </div>
        </div>

        {/* Status strip — 2-up on small screens, 4-up on sm+ */}
        <div className="rounded-md border bg-card/60 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
            <StatCell label="Control Unit" value={configuration.controlUnit.name} mono />
            <StatCell label="Axes" value={String(configuration.totalAxes)} />
            <StatCell label="Channels" value={String(configuration.totalChannels)} />
            <StatCell
              label="Complexity"
              value={configuration.estimatedComplexity}
              badge={complexityColors[configuration.estimatedComplexity]}
            />
          </div>
        </div>
      </div>

      {/* Warnings */}
      {configuration.warnings.length > 0 && (
        <CompatibilityWarnings warnings={configuration.warnings} />
      )}

      {/* BOM-level feedback — appears once the configuration row has been
          logged. The user can rate the overall configuration; the
          dashboard's "thumbs down" filter then surfaces these for review. */}
      {configRowId && (
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <FeedbackPill
            target={{ kind: "configuration", configRowId }}
            prompt="Does this configuration match what you'd expect?"
          />
        </div>
      )}

      {/* AI modify pane — surfaced ABOVE the accordion so first-time users
          discover the "ask in natural language" capability before they dig
          into swap menus. Collapses by default to stay out of the way. */}
      <AiModifyPane />

      {/* Configuration sections — all collapsed by default so the page
          opens to a clean overview. Users either click a single header
          or use the toggle below to fan everything out at once. */}
      <div className="flex items-center justify-between -mb-1 pl-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Bill of materials
        </div>
        <button
          type="button"
          onClick={() => setOpenSections(allOpen ? [] : availableSections)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/40 hover:bg-accent/30 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          title={allOpen ? "Collapse every section" : "Expand every section"}
        >
          {allOpen ? (
            <>
              <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={1.75} />
              Collapse all
            </>
          ) : (
            <>
              <ChevronsUpDown className="h-3.5 w-3.5" strokeWidth={1.75} />
              Expand all
            </>
          )}
        </button>
      </div>
      <Accordion
        multiple
        value={openSections}
        onValueChange={(v) => setOpenSections(v as string[])}
      >
        {/* Control Unit */}
        <SectionPanel
          value="control-unit"
          title="Control Unit"
          icon={<Cpu className="h-4 w-4" strokeWidth={1.5} />}
          itemCount={1}
        >
          <ComponentCard
            name={configuration.controlUnit.name}
            articleNumber={configuration.controlUnit.articleNumber}
            description={configuration.controlUnit.formFactor === "panel_based" ? "Panel-based unit with built-in HMI" : "Cabinet-based unit, requires separate HMI panel"}
            specs={[
              { label: "Max axes", value: String(configuration.controlUnit.maxAxesSpindles) },
              { label: "Channels", value: String(configuration.controlUnit.maxChannels) },
              { label: "DRIVE-CLiQ", value: `${configuration.controlUnit.driveCliqPorts} ports` },
              { label: "Form factor", value: configuration.controlUnit.formFactor === "panel_based" ? "Panel" : "Cabinet" },
            ]}
            onSwap={() => openSwap("control_unit", configuration.controlUnit.articleNumber)}
          />
        </SectionPanel>

        {/* CNC Software */}
        <SectionPanel
          value="cnc-software"
          title="CNC Software"
          icon={<Terminal className="h-4 w-4" strokeWidth={1.5} />}
          itemCount={1}
        >
          <ComponentCard
            name={configuration.cncSoftware.description}
            articleNumber={configuration.cncSoftware.articleNumber}
            description={`${configuration.softwareVariant === "export" ? "Export version" : "Full scope"} | SW ${configuration.cncSoftware.swVersion}`}
          />
        </SectionPanel>

        {/* Technology Packages */}
        {configuration.technologyPackages.length > 0 && (
          <SectionPanel
            value="tech-packages"
            title="Technology Packages"
            icon={<Boxes className="h-4 w-4" strokeWidth={1.5} />}
            itemCount={configuration.technologyPackages.length}
          >
            {configuration.technologyPackages.map((pkg) => (
              <ComponentCard
                key={pkg.id}
                name={pkg.name}
                articleNumber={pkg.articleNumber}
                orderCode={pkg.orderCode}
                description={pkg.description}
                onRemove={() => {
                  const updated = removeTechnologyPackage(configuration, pkg.id);
                  setConfiguration(updated);
                  pushHistory({
                    kind: "remove_package",
                    title: `Removed package ${pkg.orderCode}`,
                    details: pkg.name,
                    snapshot: updated,
                  });
                  toast.info("Package removed", `${pkg.orderCode} — ${pkg.name}`);
                }}
              />
            ))}
          </SectionPanel>
        )}

        {/* Additional Software Options — always shown so user can add */}
        <SectionPanel
          value="software-options"
          title="Software Options"
          icon={<Settings2 className="h-4 w-4" strokeWidth={1.5} />}
          itemCount={configuration.softwareOptions.length}
        >
          <div className="flex justify-end mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddOption(true)}
              className="gap-1.5 text-xs h-7"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add option or package
            </Button>
          </div>
          {configuration.softwareOptions.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
              No additional software options selected. Click <strong>Add option</strong> above to browse the catalog.
            </div>
          ) : (
            configuration.softwareOptions.map((opt) => (
              <ComponentCard
                key={opt.id}
                name={opt.name}
                articleNumber={opt.articleNumber}
                orderCode={opt.orderCode}
                description={opt.description}
                category={opt.category}
                quantity={configuration.optionQuantities[opt.id]}
                onRemove={() => {
                  const updated = removeSoftwareOption(configuration, opt.id);
                  setConfiguration(updated);
                  pushHistory({
                    kind: "remove_option",
                    title: `Removed option ${opt.orderCode}`,
                    details: opt.name,
                    snapshot: updated,
                  });
                  toast.info("Option removed", `${opt.orderCode} — ${opt.name}`);
                }}
              />
            ))
          )}
        </SectionPanel>

        {/* Drives */}
        {configuration.drives.length > 0 && (
          <SectionPanel
            value="drives"
            title="Drive System"
            icon={<Zap className="h-4 w-4" strokeWidth={1.5} />}
            itemCount={configuration.drives.length}
          >
            {configuration.drives.map((drive) => {
              const specs: ComponentSpec[] = [];
              if (drive.ratedCurrent) specs.push({ label: "Rated I", value: drive.ratedCurrent });
              if (drive.ratedPower) specs.push({ label: "Power", value: drive.ratedPower });
              if (drive.frameType) specs.push({ label: "Frame", value: drive.frameType });
              if (drive.coolingType) specs.push({ label: "Cooling", value: drive.coolingType });

              const isLineModule =
                drive.componentType === "line_module_active" ||
                drive.componentType === "line_module_smart" ||
                drive.componentType === "line_module_basic";
              const isFeedMm = drive.id.startsWith("feed-mm-");
              const isSpindleMm = drive.id.startsWith("spindle-mm-");
              let onSwap: (() => void) | undefined;
              if (isLineModule) onSwap = () => openSwap("line_module", drive.articleNumber);
              else if (isFeedMm) onSwap = () => openSwap("motor_module_feed", drive.articleNumber);
              else if (isSpindleMm) onSwap = () => openSwap("motor_module_spindle", drive.articleNumber);

              return (
                <ComponentCard
                  key={drive.id}
                  name={drive.name}
                  articleNumber={drive.articleNumber}
                  description={drive.description}
                  quantity={configuration.driveQuantities[drive.id]}
                  specs={specs.length > 0 ? specs : undefined}
                  onSwap={onSwap}
                />
              );
            })}
          </SectionPanel>
        )}

        {/* Motors */}
        {configuration.motors.length > 0 && (
          <SectionPanel
            value="motors"
            title="Motors"
            icon={<CircleDot className="h-4 w-4" strokeWidth={1.5} />}
            itemCount={configuration.motors.length}
          >
            {configuration.motors.map((motor) => {
              const specs: ComponentSpec[] = [];
              if (motor.shaftHeight) specs.push({ label: "Shaft height", value: `SH${motor.shaftHeight}` });
              if (motor.ratedPower) specs.push({ label: "Power", value: motor.ratedPower });
              if (motor.ratedTorque) specs.push({ label: "Torque", value: motor.ratedTorque });
              if (motor.maxTorque) specs.push({ label: "Max torque", value: motor.maxTorque });
              if (motor.ratedSpeed) specs.push({ label: "Speed", value: motor.ratedSpeed });
              if (motor.maxSpeed) specs.push({ label: "Max speed", value: motor.maxSpeed });
              if (motor.ratedCurrent) specs.push({ label: "Current", value: motor.ratedCurrent });

              const isFeed = motor.motorType === "feed_servo_sync";
              const isSpindle = motor.motorType === "main_spindle_async" || motor.motorType === "main_spindle_sync";
              const onSwap = isFeed
                ? () => openSwap("motor_feed", motor.articleNumber)
                : isSpindle
                ? () => openSwap("motor_spindle", motor.articleNumber)
                : undefined;

              const hasPerAxis = motor.perAxisMlfbs && motor.perAxisMlfbs.length > 0;
              const trunkOnly = motor.mlfbCompleteness === "trunk-only";
              return (
                <div key={motor.id}>
                  <ComponentCard
                    name={motor.name}
                    articleNumber={hasPerAxis ? undefined : motor.articleNumber}
                    description={motor.description}
                    quantity={hasPerAxis ? undefined : configuration.motorQuantities[motor.id]}
                    specs={specs.length > 0 ? specs : undefined}
                    onSwap={onSwap}
                  />
                  {!hasPerAxis && trunkOnly && (
                    <div className="callout-strip mt-2 text-[11px] text-muted-foreground">
                      <span className="text-amber-500 font-medium">⚠ Trunk-only article.</span>{" "}
                      Encoder, brake, shaft, and IP-class characters are
                      assigned at order time by your Siemens partner from
                      this verified trunk.
                    </div>
                  )}
                  {hasPerAxis && <PerAxisMlfbList items={motor.perAxisMlfbs!} />}
                </div>
              );
            })}
          </SectionPanel>
        )}

        {/* HMI — operator panel + MCP + handwheel */}
        {(() => {
          const operatorComponents = configuration.hmiComponents.filter(
            (h) => h.category !== "io_module" && h.category !== "handheld_terminal"
          );
          return operatorComponents.length > 0 ? (
            <SectionPanel
              value="hmi"
              title="HMI Components"
              icon={<Monitor className="h-4 w-4" strokeWidth={1.5} />}
              itemCount={operatorComponents.length}
            >
              {operatorComponents.map((hmi) => (
                <ComponentCard
                  key={hmi.id}
                  name={hmi.name}
                  articleNumber={hmi.articleNumber}
                  description={hmi.description}
                  isNew={hmi.isNew}
                />
              ))}
            </SectionPanel>
          ) : null;
        })()}

        {/* I/O Modules */}
        {(() => {
          const ioModules = configuration.hmiComponents.filter((h) => h.category === "io_module");
          return ioModules.length > 0 ? (
            <SectionPanel
              value="io-modules"
              title="I/O Modules"
              icon={<Network className="h-4 w-4" strokeWidth={1.5} />}
              itemCount={ioModules.length}
            >
              {ioModules.map((io) => (
                <ComponentCard
                  key={io.id}
                  name={io.name}
                  articleNumber={io.articleNumber}
                  description={io.description}
                />
              ))}
            </SectionPanel>
          ) : null;
        })()}

        {/* Handheld Terminal */}
        {(() => {
          const handhelds = configuration.hmiComponents.filter((h) => h.category === "handheld_terminal");
          return handhelds.length > 0 ? (
            <SectionPanel
              value="handheld"
              title="Handheld Terminal"
              icon={<Smartphone className="h-4 w-4" strokeWidth={1.5} />}
              itemCount={handhelds.length}
            >
              {handhelds.map((hh) => (
                <ComponentCard
                  key={hh.id}
                  name={hh.name}
                  articleNumber={hh.articleNumber}
                  description={hh.description}
                />
              ))}
            </SectionPanel>
          ) : null;
        })()}

        {/* Safety */}
        {configuration.safetyFunctions.length > 0 && (
          <SectionPanel
            value="safety"
            title="Safety Functions"
            icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.5} />}
            itemCount={configuration.safetyFunctions.length}
          >
            {configuration.safetyFunctions.map((sf) => (
              <ComponentCard
                key={sf.id}
                name={sf.name}
                articleNumber={sf.articleNumber}
                orderCode={sf.orderCode}
                description={sf.description}
                onRemove={
                  sf.isBasicScope
                    ? undefined
                    : () => {
                        const updated = removeSafetyFunctions(configuration, [sf.id]);
                        setConfiguration(updated);
                        pushHistory({
                          kind: "remove_safety",
                          title: `Removed safety ${sf.orderCode || sf.id}`,
                          details: sf.name,
                          snapshot: updated,
                        });
                        toast.info("Safety removed", sf.name);
                      }
                }
              />
            ))}
          </SectionPanel>
        )}

        {/* Cables & Accessories */}
        {configuration.cables && configuration.cables.length > 0 && (
          <SectionPanel
            value="cables"
            title="Cables & Accessories"
            icon={<Cable className="h-4 w-4" strokeWidth={1.5} />}
            itemCount={configuration.cables.length}
          >
            {configuration.cables.map((cable) => (
              <ComponentCard
                key={cable.id}
                name={`${cable.name} (x${cable.quantity})`}
                articleNumber={cable.articleNumber}
                description={cable.description}
                category={cable.category}
              />
            ))}
          </SectionPanel>
        )}
      </Accordion>

      {/* Change history — left at the bottom; expert users reach for it
          after several edits, new users don't need to see it first. */}
      <HistoryPanel />

      {/* Sizing notes — engineering callouts surfaced from the
          configuration engine. Styled as a leader/annotation strip to
          match the rest of the spec sheet. */}
      {configuration.notes.length > 0 && (
        <div className="callout-strip rounded-r-md">
          <div className="label-spec mb-2">Sizing notes</div>
          <ul className="space-y-1">
            {configuration.notes.map((note, i) => (
              <li
                key={i}
                className="spec-row text-[12px] text-muted-foreground leading-relaxed"
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep(aiMessages.length > 0 ? "analysis" : "description")}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <Button onClick={handleProceed} className="gap-2">
          Generate BOM
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Swap dialog */}
      {swapState && (
        <ComponentSwapDialog
          open={!!swapState}
          onClose={() => setSwapState(null)}
          category={swapState.category}
          currentArticle={swapState.currentArticle}
          onSelect={handleSwapSelect}
        />
      )}

      {/* Add software option dialog */}
      <SoftwareOptionDialog
        open={showAddOption}
        onClose={() => setShowAddOption(false)}
        configuration={configuration}
        catalogOptions={catalogSoftwareOptions}
        catalogPackages={catalogTechPackages}
        onAddOption={(opt, qty) => {
          const updated = addSoftwareOption(configuration, opt, qty);
          setConfiguration(updated);
          pushHistory({
            kind: "add_option",
            title: `Added option ${opt.orderCode}${qty > 1 ? ` × ${qty}` : ""}`,
            details: opt.name,
            snapshot: updated,
          });
          toast.success("Option added", `${opt.orderCode}${qty > 1 ? ` × ${qty}` : ""} — ${opt.name}`);
        }}
        onAddPackage={(pkg) => {
          const updated = addTechnologyPackage(configuration, pkg);
          setConfiguration(updated);
          pushHistory({
            kind: "add_package",
            title: `Added package ${pkg.orderCode}`,
            details: pkg.name,
            snapshot: updated,
          });
          toast.success("Package added", `${pkg.orderCode} — ${pkg.name}`);
        }}
      />

      {/* Save / Load dialog */}
      {saveLoadMode && (
        <SaveLoadDialog
          open={saveLoadMode !== null}
          mode={saveLoadMode}
          onClose={() => setSaveLoadMode(null)}
        />
      )}

      {/* Engineering-review disclaimer — gating on first BOM */}
      <DisclaimerDialog
        open={showDisclaimer}
        onAcknowledge={() => setShowDisclaimer(false)}
      />

      {/* Same dialog re-opened from the "Re-read" link, dismissible */}
      <DisclaimerDialog
        open={showDisclaimerDismissible}
        dismissible
        onAcknowledge={() => setShowDisclaimerDismissible(false)}
        onClose={() => setShowDisclaimerDismissible(false)}
      />
    </motion.div>
  );
}

interface StatCellProps {
  label: string;
  value: string;
  /** Apply monospace + tabular nums — good for MLFBs / IDs. */
  mono?: boolean;
  /** Optional badge classes to render the value as a coloured badge. */
  badge?: string;
}

function StatCell({ label, value, mono, badge }: StatCellProps) {
  return (
    <div className="px-4 py-3 flex flex-col gap-1">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      {badge ? (
        <Badge className={`${badge} capitalize w-fit`}>{value}</Badge>
      ) : (
        <div
          className={
            mono
              ? "text-base font-semibold tracking-tight tabular-nums font-mono"
              : "text-2xl font-semibold tracking-tight tabular-nums text-primary font-display"
          }
        >
          {value}
        </div>
      )}
    </div>
  );
}
