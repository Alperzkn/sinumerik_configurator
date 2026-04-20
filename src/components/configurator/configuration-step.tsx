"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion } from "@/components/ui/accordion";
import { useConfiguratorStore } from "@/store/configurator-store";
import { SectionPanel } from "./section-panel";
import { ComponentCard, type ComponentSpec } from "./component-card";
import { CompatibilityWarnings } from "./compatibility-warning";
import { ComponentSwapDialog, type SwapCategory } from "./component-swap-dialog";
import { SoftwareOptionDialog } from "./software-option-dialog";
import { AiModifyPane } from "./ai-modify-pane";
import {
  applySwap,
  addSoftwareOption,
  removeSoftwareOption,
  addTechnologyPackage,
} from "@/lib/ai/config-mutations";
import { softwareOptions as catalogSoftwareOptions } from "@/data/software-options";
import { technologyPackages as catalogTechPackages } from "@/data/technology-packages";

export function ConfigurationStep() {
  const { configuration, setStep, completeStep, setConfiguration } = useConfiguratorStore();
  const [swapState, setSwapState] = useState<{
    category: SwapCategory;
    currentArticle?: string;
  } | null>(null);
  const [showAddOption, setShowAddOption] = useState(false);

  const openSwap = (category: SwapCategory, currentArticle?: string) => {
    setSwapState({ category, currentArticle });
  };

  const handleSwapSelect = (articleNumber: string) => {
    if (!configuration || !swapState) return;
    const updated = applySwap(configuration, swapState.category, articleNumber);
    setConfiguration(updated);
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
    setStep("review");
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
      {/* Header with stats */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Recommended Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-generated component selection based on your requirements
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="tabular-nums gap-1">
            <span className="text-primary font-bold">{configuration.totalAxes}</span> axes
          </Badge>
          <Badge variant="outline" className="tabular-nums gap-1">
            <span className="text-primary font-bold">{configuration.totalChannels}</span> ch
          </Badge>
          <Badge className={complexityColors[configuration.estimatedComplexity]}>
            {configuration.estimatedComplexity}
          </Badge>
        </div>
      </div>

      {/* Warnings */}
      {configuration.warnings.length > 0 && (
        <CompatibilityWarnings warnings={configuration.warnings} />
      )}

      {/* Configuration sections */}
      <Accordion multiple defaultValue={[]}>
        {/* Control Unit */}
        <SectionPanel
          value="control-unit"
          title="Control Unit"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          }
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
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
          }
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
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            }
            itemCount={configuration.technologyPackages.length}
          >
            {configuration.technologyPackages.map((pkg) => (
              <ComponentCard
                key={pkg.id}
                name={pkg.name}
                articleNumber={pkg.articleNumber}
                orderCode={pkg.orderCode}
                description={pkg.description}
              />
            ))}
          </SectionPanel>
        )}

        {/* Additional Software Options — always shown so user can add */}
        <SectionPanel
          value="software-options"
          title="Software Options"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          }
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
                  setConfiguration(removeSoftwareOption(configuration, opt.id));
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
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            }
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
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 0 1 9 14.437V9.564Z" />
              </svg>
            }
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

        {/* HMI */}
        {configuration.hmiComponents.length > 0 && (
          <SectionPanel
            value="hmi"
            title="HMI Components"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
              </svg>
            }
            itemCount={configuration.hmiComponents.length}
          >
            {configuration.hmiComponents.map((hmi) => (
              <ComponentCard
                key={hmi.id}
                name={hmi.name}
                articleNumber={hmi.articleNumber}
                description={hmi.description}
                isNew={hmi.isNew}
              />
            ))}
          </SectionPanel>
        )}

        {/* Safety */}
        {configuration.safetyFunctions.length > 0 && (
          <SectionPanel
            value="safety"
            title="Safety Functions"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            }
            itemCount={configuration.safetyFunctions.length}
          >
            {configuration.safetyFunctions.map((sf) => (
              <ComponentCard
                key={sf.id}
                name={sf.name}
                articleNumber={sf.articleNumber}
                orderCode={sf.orderCode}
                description={sf.description}
              />
            ))}
          </SectionPanel>
        )}

        {/* Cables & Accessories */}
        {configuration.cables && configuration.cables.length > 0 && (
          <SectionPanel
            value="cables"
            title="Cables & Accessories"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            }
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

      {/* AI modification pane */}
      <AiModifyPane />

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
        <Button variant="ghost" size="sm" onClick={() => setStep("analysis")}>
          <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </Button>
        <Button onClick={handleProceed} className="gap-2">
          Review & Customize
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
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
        onAddOption={(opt) => setConfiguration(addSoftwareOption(configuration, opt))}
        onAddPackage={(pkg) => setConfiguration(addTechnologyPackage(configuration, pkg))}
      />
    </motion.div>
  );
}
