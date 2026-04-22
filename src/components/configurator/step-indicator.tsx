"use client";

import { Check } from "lucide-react";
import { WIZARD_STEPS, type WizardStep } from "@/types/catalog";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
}

export function StepIndicator({
  currentStep,
  completedSteps,
}: StepIndicatorProps) {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-1">
      {WIZARD_STEPS.map((step, index) => {
        const isActive = step.key === currentStep;
        const isCompleted = completedSteps.has(step.key);
        const isPast = index < currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  "h-px w-4 sm:w-8 mx-0.5",
                  isPast || isCompleted ? "bg-primary/60" : "bg-border"
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : isCompleted || isPast
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" strokeWidth={3} /> : step.number}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium hidden md:block",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
