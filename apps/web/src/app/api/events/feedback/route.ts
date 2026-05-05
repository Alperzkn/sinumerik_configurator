import { NextResponse } from "next/server";
import {
  redact,
  telemetryEnabled,
  updateAiTraceFeedback,
  updateConfigurationFeedback,
} from "@sinumerik/telemetry";

/**
 * Client → server: persist a thumbs-up / thumbs-down rating + optional
 * comment on either an ai_traces row or a configurations row.
 *
 * Body shapes:
 *   { kind: "ai_trace",     trace_row_id, rating: 1 | -1, comment? }
 *   { kind: "configuration", config_row_id, rating: 1 | -1, comment? }
 */
export async function POST(request: Request) {
  if (request.headers.get("x-telemetry") === "off") {
    return NextResponse.json({ ok: true, skipped: true });
  }
  if (!telemetryEnabled()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const body = await request.json();
    const rating = body?.rating;
    if (rating !== 1 && rating !== -1) {
      return NextResponse.json({ error: "rating must be 1 or -1" }, { status: 400 });
    }
    const comment = redact(body?.comment ?? null).text;

    if (body.kind === "ai_trace") {
      if (!body.trace_row_id) {
        return NextResponse.json({ error: "missing trace_row_id" }, { status: 400 });
      }
      const ok = await updateAiTraceFeedback({ trace_row_id: body.trace_row_id, rating, comment });
      return NextResponse.json({ ok });
    }
    if (body.kind === "configuration") {
      if (!body.config_row_id) {
        return NextResponse.json({ error: "missing config_row_id" }, { status: 400 });
      }
      const ok = await updateConfigurationFeedback({ config_row_id: body.config_row_id, rating, comment });
      return NextResponse.json({ ok });
    }
    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  } catch (e) {
    console.warn("[log/feedback] failed:", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
