import { NextResponse, after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { retrieveCatalogContext } from "@/lib/ai/catalog-retriever";
import { TEMPLATE_ARCHITECTURES } from "@/lib/ai/template-architectures";
import type { MachineType } from "@/types/catalog";
import { logAiTrace, redact } from "@sinumerik/telemetry";

export const maxDuration = 60;

export async function POST(request: Request) {
  let userMessage = "";

  // Telemetry headers from the client (see src/lib/telemetry/client.ts).
  // When `X-Telemetry: off` is set, we skip writing to Supabase.
  const telemetryEnabled = request.headers.get("x-telemetry") !== "off";
  const sessionId = request.headers.get("x-session-id") ?? "";
  const traceId = request.headers.get("x-trace-id") ?? "";
  const traceRowId = request.headers.get("x-trace-row-id") ?? "";
  const startedAt = Date.now();

  try {
    const body = await request.json();
    const { systemPrompt, conversationHistory } = body;
    userMessage = body.userMessage || "";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-api-key-here") {
      console.log("[AI] No API key set, using mock response");
      const mock = getMockResponse(userMessage);
      logTraceFireAndForget({
        enabled: telemetryEnabled,
        sessionId,
        traceId,
        traceRowId,
        kind: "recommend",
        model: "mock",
        systemPrompt: typeof systemPrompt === "string" ? systemPrompt : null,
        userMessage,
        conversationHistory,
        rawResponse: mock,
        parsedResponse: mock,
        latencyMs: Date.now() - startedAt,
      });
      return NextResponse.json(mock);
    }
    console.log("[AI] Using Anthropic API");
    console.log("[AI] System prompt size:", systemPrompt?.length || 0, "chars");
    console.log("[AI] Conversation history length:", conversationHistory?.length || 0);
    console.log("[AI] User message (last 200 chars):", userMessage.slice(-200));
    if (conversationHistory?.length > 0) {
      console.log("[AI] History roles:", conversationHistory.map((m: { role: string }) => m.role).join(" → "));
    }

    const anthropic = new Anthropic({ apiKey });

    // Retrieve relevant catalog sections — use full conversation for context
    const allText = [
      ...(conversationHistory || []).map((m: { content: string }) => m.content),
      userMessage,
    ].join(" ");
    const catalogContext = retrieveCatalogContext(allText, null);
    const fullSystemPrompt = systemPrompt + catalogContext;

    // Build messages — ensure alternating user/assistant pattern
    const messages: Anthropic.MessageParam[] = [];
    const historyMsgs = (conversationHistory || []) as { role: string; content: string }[];

    for (const msg of historyMsgs) {
      const role = msg.role as "user" | "assistant";
      // Anthropic requires alternating roles — merge consecutive same-role messages
      if (messages.length > 0 && messages[messages.length - 1].role === role) {
        messages[messages.length - 1].content += "\n\n" + msg.content;
      } else {
        messages.push({ role, content: msg.content });
      }
    }

    // Add current user message
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages[messages.length - 1].content += "\n\n" + userMessage;
    } else {
      messages.push({ role: "user", content: userMessage });
    }

    console.log("[AI] Final message count:", messages.length, "roles:", messages.map(m => m.role).join(" → "));

    console.log("[AI] Full system prompt size:", fullSystemPrompt.length, "chars (~" + Math.round(fullSystemPrompt.length/4) + " tokens)");
    console.log("[AI] Sending to Anthropic...");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: fullSystemPrompt,
      messages,
    });

    console.log("[AI] Response received, tokens used:", response.usage);

    const textContent = response.content.find(
      (block) => block.type === "text"
    );
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    const text = textContent.text;
    console.log("[AI] Raw response length:", text.length);

    // Try multiple JSON extraction strategies
    let parsed: unknown = null;

    // 1. Try markdown code block: ```json ... ```
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1].trim());
      } catch { /* try next */ }
    }

    // 2. Try raw JSON object
    if (!parsed) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch { /* try next */ }
      }
    }

    // 3. Try the entire response as JSON
    if (!parsed) {
      try {
        parsed = JSON.parse(text.trim());
      } catch { /* give up */ }
    }

    if (!parsed) {
      console.error("[AI] Could not extract JSON from response:", text.substring(0, 500));
      throw new Error("Could not extract JSON from AI response");
    }

    logTraceFireAndForget({
      enabled: telemetryEnabled,
      sessionId,
      traceId,
      traceRowId,
      kind: "recommend",
      model: "claude-sonnet-4-6",
      systemPrompt: fullSystemPrompt,
      userMessage,
      conversationHistory,
      rawResponse: { text },
      parsedResponse: parsed,
      latencyMs: Date.now() - startedAt,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[AI] Recommendation error:", error);
    // Fall back to mock — pass ALL conversation text so mock can detect machine type
    const allText = [
      ...((() => { try { return JSON.parse(JSON.stringify([])); } catch { return []; } })()),
      userMessage,
    ].join(" ");
    console.error("[AI] Falling back to mock response for:", allText.substring(0, 100));
    const mock = getMockResponse(allText);
    logTraceFireAndForget({
      enabled: telemetryEnabled,
      sessionId,
      traceId,
      traceRowId,
      kind: "recommend",
      model: "mock-fallback",
      userMessage,
      rawResponse: mock,
      parsedResponse: mock,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(mock, { status: 200 });
  }
}

interface LogArgs {
  enabled: boolean;
  sessionId: string;
  traceId: string;
  /** Pre-generated row id from the client — used as primary key. */
  traceRowId: string;
  kind: "recommend" | "modify";
  model?: string | null;
  systemPrompt?: string | null;
  userMessage?: string | null;
  conversationHistory?: unknown;
  rawResponse?: unknown;
  parsedResponse?: unknown;
  latencyMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  error?: string | null;
}

function logTraceFireAndForget(args: LogArgs) {
  if (!args.enabled || !args.sessionId || !args.traceId || !args.traceRowId) return;
  // Apply lightweight redaction before persisting the user prompt.
  const redactedUser = redact(args.userMessage);
  const redactedSystem = redact(args.systemPrompt);
  after(
    logAiTrace({
      id: args.traceRowId,
      session_id: args.sessionId,
      trace_id: args.traceId,
      kind: args.kind,
      model: args.model ?? null,
      system_prompt: redactedSystem.text,
      user_message: redactedUser.text,
      conversation: args.conversationHistory ?? null,
      raw_response: args.rawResponse ?? null,
      parsed_response: args.parsedResponse ?? null,
      latency_ms: args.latencyMs ?? null,
      input_tokens: args.inputTokens ?? null,
      output_tokens: args.outputTokens ?? null,
      error: args.error ?? null,
      redacted: redactedUser.redacted || redactedSystem.redacted,
    }).then(() => undefined)
  );
}

/**
 * Mock responses — ARCHITECTURE ONLY (no motor/drive article numbers).
 * Motors, modules, line modules, and cables are sized deterministically
 * from user specs by src/lib/sizing.
 *
 * Architectures live in src/lib/ai/template-architectures.ts so they can be
 * reused by the direct template-bypass flow (selecting a machine template
 * skips the AI round-trip entirely).
 */
function getMockResponse(userMessage: string) {
  const msg = userMessage.toLowerCase();

  const is5Axis =
    msg.includes("5-axis") || msg.includes("5 axis") || msg.includes("5axis");
  const isLathe =
    msg.includes("lathe") || msg.includes("turning") || msg.includes("cnc lathe");
  const isGrinding = msg.includes("grind");
  const isLaser = msg.includes("laser");
  const isRobot = msg.includes("robot");
  const isMillTurn = msg.includes("mill-turn") || msg.includes("mill turn");
  const isPunching = msg.includes("punch") || msg.includes("nibble");

  let templateKey: MachineType | null = null;
  if (isMillTurn) templateKey = "mill_turn";
  else if (is5Axis) templateKey = "5axis_mill";
  else if (isLathe) templateKey = "cnc_lathe";
  else if (isGrinding) templateKey = "grinding";
  else if (isLaser) templateKey = "laser";
  else if (isPunching) templateKey = "punching";
  else if (isRobot) templateKey = "robot";

  if (templateKey && TEMPLATE_ARCHITECTURES[templateKey]) {
    return TEMPLATE_ARCHITECTURES[templateKey]!;
  }
  return TEMPLATE_ARCHITECTURES["3axis_mill"]!;
}
