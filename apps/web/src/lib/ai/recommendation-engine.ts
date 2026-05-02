import type { AiMessage, MachineType } from "@/types/catalog";
import { buildSystemPrompt, buildUserMessage } from "./prompt-builder";
import { telemetryHeaders } from "@/lib/telemetry/client";

/**
 * Typed error so the UI can branch — e.g., show a "Pick a template
 * instead" CTA when the server replies 503/ai_unavailable.
 *
 * `code` mirrors the JSON `error` field returned by the route handler.
 */
export class AiServiceError extends Error {
  code:
    | "ai_unavailable"
    | "ai_parse_failed"
    | "ai_response_truncated"
    | "ai_timeout"
    | "ai_error";
  status: number;
  constructor(
    code: AiServiceError["code"],
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "AiServiceError";
    this.code = code;
    this.status = status;
  }
}

export interface AiRecommendationRequest {
  description: string;
  template: MachineType | null;
  conversationHistory: AiMessage[];
  clarifications?: Record<string, string>;
}

/**
 * AI response — ARCHITECTURE ONLY.
 *
 * Motor/drive/line-module/cable article numbers are NOT the AI's concern;
 * they are picked deterministically by the sizing engine (src/lib/sizing)
 * from the user's mechanical specs. The AI decides control unit, technology
 * packages, axis/channel count, safety level, HMI type, and drive family.
 */
export interface AiRawResponse {
  needsClarification?: boolean;
  questions?: string[];
  controlUnit?: {
    id: string;
    reason: string;
  };
  cncSoftware?: {
    variant: string;
    swVersion: string;
  };
  technologyPackages?: Array<{
    id: string;
    reason: string;
  }>;
  additionalOptions?: Array<{
    orderCode: string;
    name: string;
    quantity: number;
    reason: string;
  }>;
  /** New architectural drive description — no article numbers. */
  driveArchitecture?: {
    family: "S120_booksize" | "S210" | string;
    feedAxisCount: number;
    spindleCount: number;
    preferActiveLineModule?: boolean;
    highSpeedSpindle?: boolean;
    reason: string;
  };
  hmi?: {
    type: string;
    panelSizeInch?: number;
    reason: string;
  };
  safety?: {
    options: string[];
    reason: string;
  };
  totalAxes?: number;
  totalChannels?: number;
  notes?: string[];
  estimatedComplexity?: string;
}

export async function getAiRecommendation(
  request: AiRecommendationRequest
): Promise<AiRawResponse> {
  const history = request.conversationHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // If we have conversation history (follow-up after clarification),
  // send the full history as-is — the last message IS the user's answer.
  // If no history (initial call), build the first user message.
  let userMessage: string;
  if (history.length > 0) {
    // Follow-up call — the user has answered clarifying questions.
    // Pop the last user message and append a directive.
    const lastMsg = history[history.length - 1];
    if (lastMsg.role === "user") {
      userMessage = lastMsg.content + "\n\nNow generate the COMPLETE configuration as JSON based on ALL information provided in this conversation. Include the original machine request and my answers above. Do NOT ask more questions — provide the full JSON configuration now.";
      history.pop();
    } else {
      userMessage = "Based on all the information I provided above, generate the COMPLETE configuration as JSON now. Do NOT ask more questions.";
    }
  } else {
    userMessage = buildUserMessage(
      request.description,
      request.template,
      request.clarifications
    );
  }

  const controller = new AbortController();
  // Detailed configs at 8k max_tokens can take ~60-90s end-to-end.
  // Match the route's maxDuration (120s) with a small buffer subtracted.
  const timeout = setTimeout(() => controller.abort(), 110_000);

  // Telemetry headers also carry a freshly-generated trace_row_id
  // (the future primary key of the ai_traces row) so the caller can
  // attach feedback later without an extra round-trip.
  const tHeaders = telemetryHeaders();
  const { traceRowId, ...telHeaderObj } = tHeaders;

  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...telHeaderObj },
      body: JSON.stringify({
        systemPrompt: buildSystemPrompt(),
        userMessage,
        conversationHistory: history,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const code = (body?.error as AiServiceError["code"]) ?? "ai_error";
      const msg = (body?.message as string) ?? response.statusText;
      throw new AiServiceError(code, msg, response.status);
    }

    const data = await response.json();
    const result = data as AiRawResponse;
    // Stash the trace row id on the response so callers can submit
    // thumbs feedback against this exact AI call.
    (result as AiRawResponse & { _traceRowId?: string })._traceRowId = traceRowId;
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiServiceError(
        "ai_timeout",
        "AI request timed out. Please try again.",
        504,
      );
    }
    throw error;
  }
}
