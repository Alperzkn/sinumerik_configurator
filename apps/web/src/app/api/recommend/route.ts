import { NextResponse, after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { retrieveCatalogContext } from "@/lib/ai/catalog-retriever";
import { extractJson } from "@/lib/ai/extract-json";
import { logAiTrace, redact } from "@sinumerik/telemetry";

export const maxDuration = 120;

/**
 * AI architecture recommendation. Returns 5xx on any failure rather
 * than silently substituting a template — the UI shows a clear error
 * and lets the user pick a template explicitly if they want to continue.
 *
 *  503  ai_unavailable     ANTHROPIC_API_KEY missing
 *  502  ai_parse_failed    AI replied but the response wasn't valid JSON
 *  504  ai_timeout         AI exceeded the timeout budget
 *  500  ai_error           any other unexpected failure
 */
export async function POST(request: Request) {
  let userMessage = "";

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
      logTraceFireAndForget({
        enabled: telemetryEnabled,
        sessionId,
        traceId,
        traceRowId,
        kind: "recommend",
        model: null,
        systemPrompt: typeof systemPrompt === "string" ? systemPrompt : null,
        userMessage,
        conversationHistory,
        latencyMs: Date.now() - startedAt,
        error: "ai_unavailable: ANTHROPIC_API_KEY not set",
      });
      return NextResponse.json(
        {
          error: "ai_unavailable",
          message:
            "The AI is not configured on the server. Please pick a machine template to continue without AI, or contact the site owner.",
        },
        { status: 503 },
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const allText = [
      ...(conversationHistory || []).map((m: { content: string }) => m.content),
      userMessage,
    ].join(" ");
    const catalogContext = retrieveCatalogContext(allText, null);
    const fullSystemPrompt = systemPrompt + catalogContext;

    const messages: Anthropic.MessageParam[] = [];
    const historyMsgs = (conversationHistory || []) as { role: string; content: string }[];
    for (const msg of historyMsgs) {
      const role = msg.role as "user" | "assistant";
      if (messages.length > 0 && messages[messages.length - 1].role === role) {
        messages[messages.length - 1].content += "\n\n" + msg.content;
      } else {
        messages.push({ role, content: msg.content });
      }
    }
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages[messages.length - 1].content += "\n\n" + userMessage;
    } else {
      messages.push({ role: "user", content: userMessage });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      // Detailed configs need headroom — saw 6.3KB outputs (≈2k tokens)
      // get cut off at 2048. 8192 is the model's hard ceiling for
      // sonnet-4-6 anyway and gives us ~30KB of slack.
      max_tokens: 8192,
      system: fullSystemPrompt,
      messages,
    });

    const textContent = response.content.find((b) => b.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("AI returned no text content");
    }

    // Truncation = parse failure. If the model hit max_tokens, the JSON
    // is incomplete by definition. Don't even try to parse — surface a
    // distinct error so the user knows to retry / simplify the request.
    if (response.stop_reason === "max_tokens") {
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
        rawResponse: { text: textContent.text },
        latencyMs: Date.now() - startedAt,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        error: `ai_response_truncated: stop_reason=max_tokens at ${response.usage?.output_tokens} tokens`,
      });
      return NextResponse.json(
        {
          error: "ai_response_truncated",
          message:
            "The AI response was cut off before it finished. Please retry or simplify your request.",
        },
        { status: 502 },
      );
    }

    const text = textContent.text;
    const parsed = extractJson(text);

    if (!parsed) {
      // Capture the actual AI text so the admin dashboard can show what
      // we got back. Don't substitute a template — surface the failure.
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI] Recommendation error:", message);
    logTraceFireAndForget({
      enabled: telemetryEnabled,
      sessionId,
      traceId,
      traceRowId,
      kind: "recommend",
      model: "claude-sonnet-4-6",
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

interface LogArgs {
  enabled: boolean;
  sessionId: string;
  traceId: string;
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
    }).then(() => undefined),
  );
}
