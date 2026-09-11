"use client";

import { motion, AnimatePresence } from "framer-motion";
import { specsToSizingInput } from "@/lib/sizing/specs-input";
import { useEffect, useCallback, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfiguratorStore } from "@/store/configurator-store";
import { ProcessingSteps, LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  getAiRecommendation,
  AiServiceError,
  type AiRawResponse,
} from "@/lib/ai/recommendation-engine";
import { parseAiResponse, setCatalogData } from "@/lib/ai/response-parser";
import { InterpretationCard } from "./interpretation-card";
import type { AiMessage, MachineType } from "@/types/catalog";
import type { MachineSpecsState } from "@/store/configurator-store";



/**
 * User-facing copy for AI failures. Branches on AiServiceError.code so
 * we tell the user the right thing — "the server isn't configured" vs
 * "the AI returned junk" vs "timeout — try again". The Back button
 * (already in the step's footer) lets them pick a different template.
 */
function buildAiErrorContent(error: unknown): string {
  if (error instanceof AiServiceError) {
    switch (error.code) {
      case "ai_unavailable":
        return [
          "**The AI service is unavailable.**",
          "",
          "This usually means the server doesn't have an Anthropic API key configured. The configuration could not be generated automatically.",
          "",
          "**What you can do:**",
          "- Click **Back** below and pick a specific machine template — the configurator will build a sensible default without AI.",
          "- Or contact the site owner to enable AI.",
        ].join("\n");
      case "ai_parse_failed":
        return [
          "**The AI replied but its answer wasn't valid JSON.**",
          "",
          "This is usually a transient hiccup. Click **Retry** to try again, or **Back** to adjust your description and re-run.",
        ].join("\n");
      case "ai_response_truncated":
        return [
          "**The AI's answer was cut off mid-stream.**",
          "",
          "This usually means the response was too long for the token budget. Click **Retry** — and if it keeps happening, simplify your description or pick a more specific machine template.",
        ].join("\n");
      case "ai_timeout":
        return [
          "**The AI took too long to respond.**",
          "",
          "Click **Retry** to try again, or **Back** to simplify your description.",
        ].join("\n");
      default:
        return `**AI error:** ${error.message}\n\nClick **Retry** or go **Back** to adjust your description.`;
    }
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  return `**Error:** ${message}\n\nYou can try again by clicking **Retry**, or go **Back** to adjust your description.`;
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
  if (specs.safetyLevel) {
    const safetyLabels: Record<string, string> = {
      basic: "Basic safety only (STO, SS1, SBC — no S60, no K options)",
      extended: "Extended safety (add S60 + S61 for multi-axis monitoring)",
      full: "Full safety with per-axis and kinematics (S60 + S61 + K options)",
    };
    specsLines.push(`- Required safety level: ${safetyLabels[specs.safetyLevel] || specs.safetyLevel}`);
  }
  if (specs.handheldUnit && specs.handheldUnit !== "" && specs.handheldUnit !== "none") {
    const hhLabels: Record<string, string> = {
      ht2: "SINUMERIK HT 2 (compact 4.6\" handwheel + e-stop)",
      ht10: "SINUMERIK HT 10 (10\" touch handheld for setup-heavy operation)",
    };
    specsLines.push(`- Handheld terminal: ${hhLabels[specs.handheldUnit] || specs.handheldUnit} — included by the post-processor; do not need to select it yourself.`);
  }
  if (specs.ioModule && specs.ioModule !== "") {
    const ioLabels: Record<string, string> = {
      pp_72_48: "PP 72/48 D PN (default for NCU)",
      et200sp: "ET 200SP (modular distributed I/O)",
      none: "No machine I/O module",
    };
    specsLines.push(`- Machine I/O: ${ioLabels[specs.ioModule] || specs.ioModule} — applied deterministically post-AI.`);
  }
  if (specs.cableLengthMeters && specs.cableLengthMeters.trim()) {
    specsLines.push(`- Preferred motor / encoder cable length: ${specs.cableLengthMeters} m`);
  }

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
    controlFamily,
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
  // Latest AI response that produced a built configuration. The
  // InterpretationCard reads from this and lets the user confirm or
  // request a refinement before we show the BOM. Cleared when the user
  // sends a refinement (we reuse it once the next response lands).
  const [pendingResponse, setPendingResponse] = useState<AiRawResponse | null>(null);
  const [confirmed, setConfirmed] = useState(false);

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
        controlFamily,
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
          selectedTemplate,
          controlFamily === "auto" ? undefined : controlFamily
        );

        if (config) {
          setConfiguration(config);
          setPendingResponse(response);
          setConfirmed(false);

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
      const content = buildAiErrorContent(error);
      addAiMessage({
        id: `ai-error-${Date.now()}`,
        role: "assistant",
        content,
        timestamp: Date.now(),
      });
      setWaitingForAnswer(true); // Show retry option
    }

    setStatusText("");
    setAiProcessing(false);
    setIsFirstCall(false);
  }, [selectedTemplate, machineDescription, machineSpecs, controlFamily, addAiMessage, setAiProcessing, setConfiguration]);

  // Initial analysis. The user already provided everything on the
  // previous step — re-rendering the full prompt (with HARD CONSTRAINTS,
  // IMPORTANT notes, etc.) as a chat bubble was prompt plumbing leaking
  // into the UI. Send the prompt to the API but DON'T add it to the
  // visible chat. The first visible message is the AI's reply (either a
  // clarifying question or a configuration summary).
  const initiateAnalysis = useCallback(async () => {
    if (hasInitiated.current) return;
    hasInitiated.current = true;

    try {
      const { catalogBundle } = await import("@/data/catalog-bundle");
      setCatalogData(catalogBundle);
    } catch { /* continue */ }

    const userContent = buildInitialUserMessage(
      machineDescription,
      selectedTemplate,
      machineSpecs
    );

    await callAi([{ role: "user", content: userContent }]);
  }, [machineDescription, selectedTemplate, machineSpecs, callAi]);

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

  /**
   * User clicked "Looks right" on the interpretation card — confirm and
   * proceed to the BOM. The configuration is already in the store; we
   * just transition the wizard step.
   */
  const handleConfirmInterpretation = () => {
    setConfirmed(true);
    handleViewConfig();
  };

  /**
   * User clicked "Something's off" and provided a correction. Append it
   * to the conversation as a fresh user turn and re-run the AI loop.
   * Clear the pending response so the card disappears while we wait.
   */
  const handleRefineInterpretation = async (correction: string) => {
    setPendingResponse(null);
    setConfirmed(false);
    const refineMsg: AiMessage = {
      id: `user-refine-${Date.now()}`,
      role: "user",
      content: correction,
      timestamp: Date.now(),
    };
    addAiMessage(refineMsg);
    const history = [...aiMessages, refineMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));
    await callAi(history);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl space-y-6"
    >
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
          Step 02 · Analyze
        </div>
        <h2 className="text-2xl font-medium tracking-tight">AI architecture analysis</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-xl">
          Reading your description and picking the control unit, technology packages, drive family, safety level, and HMI. The deterministic sizing engine takes over for motors and drives.
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

      {/* Interpretation card — shown after AI returns a config, before
          we let the user transition to the BOM. */}
      {pendingResponse && !confirmed && !isAiProcessing && (
        <InterpretationCard
          response={pendingResponse}
          onConfirm={handleConfirmInterpretation}
          onRefine={handleRefineInterpretation}
          busy={isAiProcessing}
        />
      )}

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
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        {/* "View Configuration" once the config exists. The interpretation
            card (above) gates first-time review by setting `pendingResponse`;
            once the user has acknowledged it (or returns to this step from
            elsewhere with no pending response), the forward button is
            available so they don't get trapped. */}
        {isConfigurationReady && !pendingResponse && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Button onClick={handleViewConfig} className="gap-2">
              View Configuration
              <ArrowRight className="h-3.5 w-3.5" />
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
