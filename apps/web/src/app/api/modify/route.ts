import { NextResponse, after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractJson } from "@/lib/ai/extract-json";
import { logAiTrace, redact } from "@sinumerik/telemetry";

export const maxDuration = 60;

/**
 * Configuration modification endpoint.
 *
 * Returns 5xx on any failure rather than substituting a heuristic
 * fallback. The frontend shows the failure to the user instead of
 * silently applying a guess.
 *
 *  503  ai_unavailable
 *  502  ai_parse_failed
 *  500  ai_error
 */
export async function POST(request: Request) {
  const telemetryEnabled = request.headers.get("x-telemetry") !== "off";
  const sessionId = request.headers.get("x-session-id") ?? "";
  const traceId = request.headers.get("x-trace-id") ?? "";
  const traceRowId = request.headers.get("x-trace-row-id") ?? "";
  const startedAt = Date.now();

  let systemPrompt = "";
  let userMessage = "";

  try {
    const body = await request.json();
    systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt : "";
    userMessage = typeof body.userMessage === "string" ? body.userMessage : "";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-api-key-here") {
      logModifyTrace({
        enabled: telemetryEnabled,
        sessionId,
        traceId,
        traceRowId,
        model: null,
        systemPrompt,
        userMessage,
        latencyMs: Date.now() - startedAt,
        error: "ai_unavailable: ANTHROPIC_API_KEY not set",
      });
      return NextResponse.json(
        {
          error: "ai_unavailable",
          message:
            "The AI is not configured on the server. Modifications require AI; please contact the site owner.",
        },
        { status: 503 },
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textContent = response.content.find((b) => b.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("AI returned no text content");
    }

    const text = textContent.text;
    const parsed = extractJson(text);

    if (!parsed) {
      logModifyTrace({
        enabled: telemetryEnabled,
        sessionId,
        traceId,
        traceRowId,
        model: "claude-sonnet-4-6",
        systemPrompt,
        userMessage,
        rawResponse: { text },
        latencyMs: Date.now() - startedAt,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        error: "ai_parse_failed: extractJson returned null",
      });
      return NextResponse.json(
        {
          error: "ai_parse_failed",
          message: "The AI replied but its answer wasn't valid JSON. Please retry.",
        },
        { status: 502 },
      );
    }

    logModifyTrace({
      enabled: telemetryEnabled,
      sessionId,
      traceId,
      traceRowId,
      model: "claude-sonnet-4-6",
      systemPrompt,
      userMessage,
      rawResponse: { text },
      parsedResponse: parsed,
      latencyMs: Date.now() - startedAt,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    });

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Modify] Error:", message);
    logModifyTrace({
      enabled: telemetryEnabled,
      sessionId,
      traceId,
      traceRowId,
      model: "claude-sonnet-4-6",
      systemPrompt,
      userMessage,
      latencyMs: Date.now() - startedAt,
      error: message,
    });
    return NextResponse.json(
      { error: "ai_error", message },
      { status: 500 },
    );
  }
}

interface ModifyLogArgs {
  enabled: boolean;
  sessionId: string;
  traceId: string;
  traceRowId: string;
  model?: string | null;
  systemPrompt?: string | null;
  userMessage?: string | null;
  rawResponse?: unknown;
  parsedResponse?: unknown;
  latencyMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  error?: string | null;
}

function logModifyTrace(args: ModifyLogArgs) {
  if (!args.enabled || !args.sessionId || !args.traceId || !args.traceRowId) return;
  const redactedUser = redact(args.userMessage);
  const redactedSystem = redact(args.systemPrompt);
  after(
    logAiTrace({
      id: args.traceRowId,
      session_id: args.sessionId,
      trace_id: args.traceId,
      kind: "modify",
      model: args.model ?? null,
      system_prompt: redactedSystem.text,
      user_message: redactedUser.text,
      raw_response: args.rawResponse ?? null,
      parsed_response: args.parsedResponse ?? null,
      latency_ms: args.latencyMs ?? null,
      input_tokens: args.inputTokens ?? null,
      output_tokens: args.outputTokens ?? null,
      error: args.error ?? null,
      redacted: redactedUser.redacted || redactedSystem.redacted,
    }).then(() => undefined),
  );
}
