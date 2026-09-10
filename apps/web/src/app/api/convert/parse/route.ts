import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractJson } from "@/lib/ai/extract-json";
import { MLFB_RE, normMlfb } from "@/lib/convert-808d/parser";
import type { InputRow } from "@/lib/convert-808d/types";
import { AI_ROUTE_LIMIT, rateLimit } from "@/lib/server/request-guards";

export const maxDuration = 120;

/** Hard cap on pasted text — a BOM never needs more than this. */
const MAX_INPUT_CHARS = 40_000;
const MODEL = "claude-opus-5";

const SYSTEM_PROMPT = `You extract bill-of-material rows from text copied from Excel, PDFs or e-mails for Siemens SINUMERIK 808D configurations.

Return ONLY JSON of the shape:
{"rows":[{"mlfb":"<Siemens article number exactly as written, e.g. 6FC5370-2AM03-0AA0 or 6SL5510-1BE11-5AF0-Z T80>","qty":<integer>,"desc":"<product description text>"}]}

Rules:
- one row per article number
- keep article numbers verbatim (do not invent or correct them)
- quantity is the piece count (default 1 if absent)
- ignore prices, headers, totals
- never choose or suggest products; you only read what is written`;

/**
 * "Read with AI" for the 808D → 828D Smart converter.
 *
 * The model is used ONLY to read messy text (merged cells, quantities as
 * words, PDF copies) into {mlfb, qty, desc} rows. Product selection stays
 * in the rule-based engine on the client. Rows whose article number does
 * not look like a Siemens MLFB are dropped server-side.
 *
 *  503  ai_unavailable   ANTHROPIC_API_KEY missing
 *  400  bad_request      no text / too long
 *  502  ai_parse_failed  AI replied but not with the expected JSON
 *  500  ai_error         anything else
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "convert-parse", AI_ROUTE_LIMIT);
  if (limited) return limited;

  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    return NextResponse.json({ error: "bad_request", message: "Body must be JSON." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "bad_request", message: "Paste some text first." }, { status: 400 });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: "bad_request", message: `Text is too long (max ${MAX_INPUT_CHARS} characters).` },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return NextResponse.json(
      { error: "ai_unavailable", message: "AI reading is not configured on this server. Use the rule-based reader." },
      { status: 503 },
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Reading rows is routine extraction — low effort keeps it fast and cheap.
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Text:\n\n${text}` }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "ai_error", message: "The AI declined to read this text. Use the rule-based reader." },
        { status: 502 },
      );
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("AI returned no text content");
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "ai_response_truncated", message: "The AI response was cut off. Try a shorter list." },
        { status: 502 },
      );
    }

    const parsed = extractJson(textBlock.text) as { rows?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.rows)) {
      return NextResponse.json(
        { error: "ai_parse_failed", message: "The AI replied but its answer wasn't the expected JSON. Please retry." },
        { status: 502 },
      );
    }

    const rows: InputRow[] = [];
    for (const r of parsed.rows as unknown[]) {
      if (!r || typeof r !== "object") continue;
      const o = r as { mlfb?: unknown; qty?: unknown; desc?: unknown };
      const mlfb = normMlfb(String(o.mlfb ?? ""));
      if (!mlfb.match(MLFB_RE)) continue;
      const qtyNum = typeof o.qty === "number" ? o.qty : parseInt(String(o.qty ?? ""), 10);
      rows.push({
        mlfb,
        qty: Number.isFinite(qtyNum) && qtyNum >= 1 ? Math.floor(qtyNum) : 1,
        qtyAssumed: false,
        desc: String(o.desc ?? "").slice(0, 500),
      });
    }
    return NextResponse.json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[convert/parse] error:", message);
    return NextResponse.json({ error: "ai_error", message }, { status: 500 });
  }
}
