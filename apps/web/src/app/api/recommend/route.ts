import { NextResponse, after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { retrieveCatalogContext } from "@/lib/ai/catalog-retriever";
import { extractJson } from "@/lib/ai/extract-json";
import { logAiTrace, redact } from "@sinumerik/telemetry";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";
import { AI_ROUTE_LIMIT, boundedString, rateLimit } from "@/lib/server/request-guards";

/** Caps on client-supplied text — a machine description never needs more. */
const MAX_MESSAGE_CHARS = 20_000;
const MAX_HISTORY_MESSAGES = 20;

// Vercel Pro caps function duration at 300s. With max_tokens at 16k
// and big system prompts, generation can run 90-180s; give plenty of
// headroom so detailed user prompts don't get killed.
export const maxDuration = 300;

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

  const limited = rateLimit(request, "recommend", AI_ROUTE_LIMIT);
  if (limited) return limited;

  try {
    const body = (await request.json()) as {
      userMessage?: unknown;
      conversationHistory?: unknown;
      controlFamily?: unknown;
    };
    const controlFamily =
      body.controlFamily === "sinumerik_one" || body.controlFamily === "828d" || body.controlFamily === "828d_smart"
        ? body.controlFamily
        : "auto";
    // The system prompt is built HERE, never taken from the client: the
    // route would otherwise be an open proxy where anyone could rewrite
    // the instructions and run arbitrary prompts on our API key.
    const systemPrompt = buildSystemPrompt(controlFamily);
    userMessage = boundedString(body.userMessage, MAX_MESSAGE_CHARS);
    const conversationHistory = (Array.isArray(body.conversationHistory) ? body.conversationHistory : [])
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          !!m &&
          typeof m === "object" &&
          ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") &&
          typeof (m as { content?: unknown }).content === "string",
      )
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
    if (!userMessage.trim() && conversationHistory.length === 0) {
      return NextResponse.json({ error: "bad_request", message: "Describe the machine first." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-api-key-here") {
      logTraceFireAndForget({
        enabled: telemetryEnabled,
        sessionId,
        traceId,
        traceRowId,
        kind: "recommend",
        model: null,
        systemPrompt,
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

    const allText = [...conversationHistory.map((m) => m.content), userMessage].join(" ");
    const catalogContext = retrieveCatalogContext(allText, null);
    const fullSystemPrompt = systemPrompt + catalogContext;

    const messages: Anthropic.MessageParam[] = [];
    for (const msg of conversationHistory) {
      const role = msg.role;
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
      // Detailed user prompts can produce 8-12k token configs. 16384
      // gives ~60KB of output headroom and is well within sonnet-4-6's
      // budget. The "DO NOT echo description" rule in the system prompt
      // also keeps typical outputs around 4-6k.
      max_tokens: 16384,
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
