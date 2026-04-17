"use client";

import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useConfiguratorStore } from "@/store/configurator-store";
import { StepIndicator } from "./step-indicator";
import { MachineDescriptionStep } from "./machine-description-step";
import { AiAnalysisStep } from "./ai-analysis-step";
import { ConfigurationStep } from "./configuration-step";
import { ReviewStep } from "./review-step";
import { SummaryStep } from "./summary-step";
import { SelectionSidebar } from "./selection-sidebar";

export function WizardShell() {
  const { currentStep, completedSteps } = useConfiguratorStore();

  const renderStep = () => {
    switch (currentStep) {
      case "description":
        return <MachineDescriptionStep />;
      case "analysis":
        return <AiAnalysisStep />;
      case "configuration":
        return <ConfigurationStep />;
      case "review":
        return <ReviewStep />;
      case "summary":
        return <SummaryStep />;
      default:
        return <MachineDescriptionStep />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SelectionSidebar />

      <div className="pr-12 transition-all duration-300">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-center h-14 gap-8">
              {/* Logo — left aligned */}
              <Link href="/" className="shrink-0 flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">S1</span>
                </div>
                <div className="text-sm font-semibold tracking-tight">
                  <span className="text-foreground">SINUMERIK</span>
                  <span className="text-muted-foreground ml-1">Configurator</span>
                </div>
              </Link>

              {/* Separator */}
              <div className="h-5 w-px bg-border" />

              {/* Step indicator — fills remaining space */}
              <div className="flex-1">
                <StepIndicator
                  currentStep={currentStep}
                  completedSteps={completedSteps}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-6xl px-6 py-8">
          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
        </main>
      </div>
    </div>
  );
}
