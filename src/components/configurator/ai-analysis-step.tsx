"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfiguratorStore } from "@/store/configurator-store";
import { ProcessingSteps, LoadingSpinner } from "@/components/shared/loading-spinner";
import { getAiRecommendation } from "@/lib/ai/recommendation-engine";
import { parseAiResponse, setCatalogData } from "@/lib/ai/response-parser";
import type { UserSpecsInput } from "@/lib/sizing";
import type { AiMessage, MachineType } from "@/types/catalog";
import type { MachineSpecsState } from "@/store/configurator-store";

function parseNumeric(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : undefined;
}

function specsToSizingInput(specs: MachineSpecsState): UserSpecsInput {
  return {
    spindlePowerKw: parseNumeric(specs.spindlePower),
    spindleMaxRpm: parseNumeric(specs.spindleSpeed),
    movingMassKg: parseNumeric(specs.movingMass),
    rapidTraverseMpm: parseNumeric(specs.rapidTraverse),
    machineSize: (specs.machineSize || "") as UserSpecsInput["machineSize"],
    material: specs.material,
  };
}

function buildInitialUserMessage(
  description: string,
  template: MachineType | null,
  specs: MachineSpecsState
): string {
  const specsLines: string[] = [];
  if (specs.machineSize) {
    const sizeLabels: Record<string, string> = {
      small: "Small machine (table ≤500mm, moving mass <200kg/axis)",
      medium: "Medium machine (500-1500mm table, 200-500kg/axis)",
      large: "Large machine (>1500mm table, 500-2000kg/axis)",
      very_large: "Very large / gantry machine (>2000mm, >2000kg/axis)",
    };
    specsLines.push(`- Machine size class: ${sizeLabels[specs.machineSize] || specs.machineSize}`);
  }
  if (specs.axisTravel) specsLines.push(`- Axis travel: ${specs.axisTravel} mm`);
  if (specs.movingMass) specsLines.push(`- Moving mass per axis: ${specs.movingMass} kg`);
  if (specs.rapidTraverse) specsLines.push(`- Required rapid traverse: ${specs.rapidTraverse} m/min`);
  if (specs.spindlePower) specsLines.push(`- Required spindle power: ${specs.spindlePower} kW (MINIMUM — do not select smaller)`);
  if (specs.spindleSpeed) specsLines.push(`- Required spindle max speed: ${specs.spindleSpeed} rpm (MINIMUM — do not select slower)`);
  if (specs.material) specsLines.push(`- Primary workpiece material: ${specs.material}`);

  let msg = "";
  if (template) msg += `Machine Type: ${template.replace(/_/g, " ")}\n\n`;
  if (description) msg += `User Description: ${description}\n\n`;
  if (specsLines.length > 0) {
    msg += `MECHANICAL REQUIREMENTS (HARD CONSTRAINTS — you MUST select components that match or exceed these):\n${specsLines.join("\n")}\n\n`;
    msg += `IMPORTANT: The spindle power and speed above are MINIMUMS. If user specified 50kW spindle, you MUST select a motor with rated power ≥ 50kW (1PH8186 or larger). If user specified 24000 rpm, select a motor with max speed ≥ 24000 rpm. Never select under-sized motors.`;
  }
  return msg.trim() || description || (template ? template.replace(/_/g, " ") : "");
}

export function AiAnalysisStep() {
  const {
    machineDescription,
    selectedTemplate,
    machineSpecs,
    aiMessages,
    isAiProcessing,
    isConfigurationReady,
    addAiMessage,
    setAiProcessing,
    setConfiguration,
    setStep,
    completeStep,
  } = useConfiguratorStore();

  const hasInitiated = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userInput, setUserInput] = useState("");
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [isFirstCall, setIsFirstCall] = useState(true);
  const [statusText, setStatusText] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages, isAiProcessing]);

  const callAi = useCallback(async (
    conversationHistory: { role: string; content: string }[]
  ) => {
    setAiProcessing(true);
    setStatusText("Sending to AI...");

    try {
      // History already contains the full message (incl. specs) because
      // initiateAnalysis built it via buildInitialUserMessage. Just forward it.
      const response = await getAiRecommendation({
        description: machineDescription,
        template: selectedTemplate,
        conversationHistory: conversationHistory.map(m => ({
          id: "",
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: 0,
        })),
      });

      if (response.needsClarification) {
        setStatusText("");
        const questions = response.questions && response.questions.length > 0
          ? response.questions
          : [
              "What are the X, Y, Z axis travel lengths in mm?",
              "What is the moving mass per axis in kg?",
              "What is the required spindle power (kW) and max speed (rpm)?",
              "What is the required rapid traverse speed (m/min)?",
            ];
        const assistantMsg: AiMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `To properly size the motors and drives for your machine, I need some additional details:\n\n${questions.map((q, i) => `**${i + 1}.** ${q}`).join("\n\n")}\n\nPlease provide the information below.`,
          timestamp: Date.now(),
        };
        addAiMessage(assistantMsg);
        setWaitingForAnswer(true);
      } else {
        setStatusText("Building configuration...");
        const config = parseAiResponse(
          response,
          specsToSizingInput(machineSpecs),
          selectedTemplate
        );

        if (config) {
          setConfiguration(config);

          const assistantMsg: AiMessage = {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: buildSummaryText(response),
            timestamp: Date.now(),
          };
          addAiMessage(assistantMsg);
        } else {
          addAiMessage({
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: "I couldn't build a configuration from that response. Please provide more specific details (axis travels, moving mass, spindle power/speed) and try again.",
            timestamp: Date.now(),
          });
          setWaitingForAnswer(true);
        }
      }
    } catch (error) {
      console.error("[AI] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addAiMessage({
        id: `ai-error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${errorMessage}\n\nYou can try again by clicking the "Retry" button below, or go back to adjust your description.`,
        timestamp: Date.now(),
      });
      setWaitingForAnswer(true); // Show retry option
    }

    setStatusText("");
    setAiProcessing(false);
    setIsFirstCall(false);
  }, [selectedTemplate, machineDescription, machineSpecs, addAiMessage, setAiProcessing, setConfiguration]);

  // Initial analysis
  const initiateAnalysis = useCallback(async () => {
    if (hasInitiated.current) return;
    hasInitiated.current = true;

    try {
      const catalog = await import("@/data");
      setCatalogData({
        controlUnits: catalog.controlUnits,
        cncSoftware: catalog.cncSoftwareOptions,
        technologyPackages: catalog.technologyPackages,
        softwareOptions: catalog.softwareOptions,
        driveComponents: catalog.driveComponents,
        motors: catalog.motors,
        measuringSystems: catalog.measuringSystems,
        hmiComponents: catalog.hmiComponents,
        safetyFunctions: catalog.safetyFunctions,
        selectCables: catalog.selectCables,
      });
    } catch { /* continue */ }

    const userContent = buildInitialUserMessage(
      machineDescription,
      selectedTemplate,
      machineSpecs
    );

    const userMsg: AiMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userContent,
      timestamp: Date.now(),
    };
    addAiMessage(userMsg);

    await callAi([{ role: "user", content: userContent }]);
  }, [machineDescription, selectedTemplate, machineSpecs, addAiMessage, callAi]);

  useEffect(() => {
    if (aiMessages.length === 0) {
      initiateAnalysis();
    }
  }, [aiMessages.length, initiateAnalysis]);

  // Handle user answering clarifying questions
  const handleSendAnswer = async () => {
    if (!userInput.trim() || isAiProcessing) return;

    const answer = userInput.trim();
    setUserInput("");
    setWaitingForAnswer(false);

    const answerMsg: AiMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: answer,
      timestamp: Date.now(),
    };
    addAiMessage(answerMsg);

    // Build conversation history from all messages for proper context
    const history = [...aiMessages, answerMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    await callAi(history);
  };

  const handleViewConfig = () => {
    completeStep("analysis");
    setStep("configuration");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold">AI Analysis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyzing your requirements and selecting optimal components
        </p>
      </div>

      {/* Chat messages */}
      <div className="space-y-3 min-h-64 max-h-[55vh] overflow-y-auto pr-2">
        <AnimatePresence>
          {aiMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary/15 text-foreground border border-primary/20 rounded-br-sm"
                    : "bg-muted/60 border border-border/50 rounded-bl-sm"
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading / processing indicator */}
        {isAiProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl bg-muted/40 border border-border/30 p-4"
          >
            {isFirstCall ? (
              <ProcessingSteps />
            ) : (
              <LoadingSpinner text={statusText || "Processing your response..."} />
            )}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      {waitingForAnswer && !isAiProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2"
        >
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your answers here (you can answer all questions at once)..."
            className="flex-1 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendAnswer();
              }
            }}
          />
          <Button onClick={handleSendAnswer} disabled={!userInput.trim()} size="sm">
            Send
          </Button>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => useConfiguratorStore.getState().setStep("description")}
        >
          <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </Button>
        {isConfigurationReady && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Button onClick={handleViewConfig} className="gap-2">
              View Configuration
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSummaryText(response: any): string {
  const r = response as {
    controlUnit?: { id?: string; reason?: string };
    technologyPackages?: { id: string }[];
    drives?: { mainFamily?: string; feedMotorModules?: number; spindleMotorModules?: number; lineModule?: string; lineModuleArticle?: string };
    motors?: { feedMotors?: string; feedMotorArticle?: string; feedMotorShaftHeight?: number; spindleMotors?: string; spindleMotorArticle?: string; spindleMotorShaftHeight?: number };
    totalAxes?: number;
    totalChannels?: number;
  };

  let text = `Configuration complete:\n`;
  text += `\n**Control Unit:** ${r.controlUnit?.id?.replace("_", " ")} — ${r.controlUnit?.reason || ""}`;
  text += `\n**Packages:** ${r.technologyPackages?.map(p => p.id).join(", ") || "None"}`;

  if (r.drives) {
    text += `\n**Drives:** ${r.drives.mainFamily} — ${r.drives.feedMotorModules} feed + ${r.drives.spindleMotorModules || 0} spindle modules`;
    if (r.drives.lineModule) text += `\n**Line Module:** ${r.drives.lineModule} (${r.drives.lineModuleArticle || ""})`;
  }

  if (r.motors) {
    if (r.motors.feedMotors) {
      text += `\n**Feed Motors:** ${r.motors.feedMotors}`;
      if (r.motors.feedMotorArticle) text += ` — ${r.motors.feedMotorArticle}`;
      if (r.motors.feedMotorShaftHeight) text += ` (SH${r.motors.feedMotorShaftHeight})`;
    }
    if (r.motors.spindleMotors) {
      text += `\n**Spindle:** ${r.motors.spindleMotors}`;
      if (r.motors.spindleMotorArticle) text += ` — ${r.motors.spindleMotorArticle}`;
      if (r.motors.spindleMotorShaftHeight) text += ` (SH${r.motors.spindleMotorShaftHeight})`;
    }
  }

  text += `\n**Axes:** ${r.totalAxes || "?"} | **Channels:** ${r.totalChannels || 1}`;
  text += `\n\nClick "View Configuration" for the full BOM.`;
  return text;
}
