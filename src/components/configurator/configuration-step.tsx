"use client";

import { motion } from "framer-motion";
import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion } from "@/components/ui/accordion";
import { useConfiguratorStore } from "@/store/configurator-store";
import { SectionPanel } from "./section-panel";
import { ComponentCard, type ComponentSpec } from "./component-card";
import { CompatibilityWarnings } from "./compatibility-warning";
import { ComponentSwapDialog, type SwapCategory } from "./component-swap-dialog";
import { SoftwareOptionDialog } from "./software-option-dialog";
import { SaveLoadDialog } from "./save-load-dialog";
import { AiModifyPane } from "./ai-modify-pane";
import { HistoryPanel } from "./history-panel";
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

export function ConfigurationStep() {
  const {
    configuration,
    setStep,
    completeStep,
    setConfiguration,
    aiMessages,
    pushHistory,
  } = useConfiguratorStore();
  const [swapState, setSwapState] = useState<{
    category: SwapCategory;
    currentArticle?: string;
  } | null>(null);
  const [showAddOption, setShowAddOption] = useState(false);
  const [saveLoadMode, setSaveLoadMode] = useState<"save" | "load" | null>(null);

  const openSwap = (category: SwapCategory, currentArticle?: string) => {
    setSwapState({ category, currentArticle });
  };

  const handleSwapSelect = (articleNumber: string) => {
    if (!configuration || !swapState) return;
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header — split into title row + single status strip */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Step 03 · Configure
            </div>
            <h2 className="text-2xl font-medium tracking-tight">
              Generated configuration
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Swap components, add/remove options, or ask the AI for a change. Re-sizing updates motors, drives, and cables automatically.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setSaveLoadMode("save")}
              title="Save this configuration to your browser"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setSaveLoadMode("load")}
              title="Load a previously saved configuration"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Open
            </Button>
          </div>
        </div>

        {/* Status strip — single row, tick-marked, blueprint-style */}
        <div className="rounded-md border bg-card/60 overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-border">
            <StatCell label="Control Unit" value={configuration.controlUnit.id.replace("_", " ")} mono />
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

      {/* AI modify pane — surfaced ABOVE the accordion so first-time users
          discover the "ask in natural language" capability before they dig
          into swap menus. Collapses by default to stay out of the way. */}
      <AiModifyPane />

      {/* Configuration sections — key categories expanded on arrival so
          users see the shape of their system without clicking through
          every accordion row. */}
      <Accordion
        multiple
        defaultValue={["control-unit", "drives", "motors"]}
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

              return (
                <ComponentCard
                  key={motor.id}
                  name={motor.name}
                  articleNumber={motor.articleNumber}
                  description={motor.description}
                  quantity={configuration.motorQuantities[motor.id]}
                  specs={specs.length > 0 ? specs : undefined}
                  onSwap={onSwap}
                />
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

      {/* Notes */}
      {configuration.notes.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <h3 className="text-sm font-semibold mb-2">Notes</h3>
          <ul className="space-y-1">
            {configuration.notes.map((note, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-primary">-</span> {note}
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
