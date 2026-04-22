"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useConfiguratorStore } from "@/store/configurator-store";
import { modifyConfiguration } from "@/lib/ai/modify-engine";
import type { UserSpecsInput } from "@/lib/sizing";
import { toast } from "@/components/ui/toast";

interface AiModifyPaneProps {
  onApplied?: () => void;
}

const QUICK_ACTIONS = [
  "Make motors bigger (heavy-duty)",
  "Change to NCU 1760 for HSC",
  "Add active line module for energy recovery",
  "Add S43 Dynamics 5-Axis package",
  "Switch to forced ventilation motors",
];

export function AiModifyPane({ onApplied }: AiModifyPaneProps) {
  const { configuration, machineSpecs, setConfiguration, pushHistory } = useConfiguratorStore();
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMessage, setLastMessage] = useState<{ role: "user" | "assistant"; content: string } | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const handleSubmit = async (requestText: string) => {
    if (!configuration || !requestText.trim() || isProcessing) return;

    setIsProcessing(true);
    setLastMessage({ role: "user", content: requestText });
    setInput("");

    const parseNum = (s: string) => {
      const m = s.match(/([\d.]+)/);
      return m ? parseFloat(m[1]) : undefined;
    };
    const baselineSpecs: UserSpecsInput = {
      spindlePowerKw: parseNum(machineSpecs.spindlePower),
      spindleMaxRpm: parseNum(machineSpecs.spindleSpeed),
      movingMassKg: parseNum(machineSpecs.movingMass),
      rapidTraverseMpm: parseNum(machineSpecs.rapidTraverse),
      machineSize: machineSpecs.machineSize as UserSpecsInput["machineSize"],
      material: machineSpecs.material,
    };

    try {
      const result = await modifyConfiguration(configuration, requestText, baselineSpecs);
      if (result.updatedConfiguration) {
        setConfiguration(result.updatedConfiguration);
        pushHistory({
          kind: "ai_modify",
          title: requestText,
          details: result.summary,
          snapshot: result.updatedConfiguration,
        });
        setLastMessage({
          role: "assistant",
          content: result.summary || "Configuration updated.",
        });
        toast.success("Configuration updated", result.summary);
        if (result.warnings && result.warnings.length > 0) {
          toast.warning("Heads-up", result.warnings.join("\n"));
        }
        onApplied?.();
      } else {
        setLastMessage({
          role: "assistant",
          content: result.summary || "I couldn't modify the configuration. Please try rephrasing.",
        });
        toast.info("No change applied", result.summary);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setLastMessage({ role: "assistant", content: `Error: ${msg}` });
      toast.error("Modification failed", msg);
    }

    setIsProcessing(false);
  };

  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-background overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm">Ask AI to modify configuration</div>
            <div className="text-[11px] text-muted-foreground">
              Tell the AI what to change — it will update components and validate
            </div>
          </div>
        </div>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-3">
              {/* Quick actions */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Quick actions
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSubmit(action)}
                      className="text-[11px] rounded-full border bg-background hover:bg-accent/50 px-2.5 py-1 transition-colors disabled:opacity-50"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              {/* Last message */}
              {lastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-lg p-3 text-sm ${
                    lastMessage.role === "user"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/50 border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px]">
                      {lastMessage.role === "user" ? "You" : "AI"}
                    </Badge>
                  </div>
                  <div className="whitespace-pre-wrap text-[12px] leading-relaxed">
                    {lastMessage.content}
                  </div>
                </motion.div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="E.g., 'Upgrade spindle motor to 30kW' or 'Change to Active Line Module'..."
                  className="min-h-16 text-sm resize-none"
                  disabled={isProcessing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(input);
                    }
                  }}
                />
                <Button
                  onClick={() => handleSubmit(input)}
                  disabled={!input.trim() || isProcessing}
                  size="sm"
                  className="self-end"
                >
                  {isProcessing ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="30 60" />
                    </svg>
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
