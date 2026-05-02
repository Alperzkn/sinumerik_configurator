import { NextResponse } from "next/server";
import { logUserAction, telemetryEnabled } from "@sinumerik/telemetry";

/**
 * Client → server: log a fine-grained user action (swap, history-revert,
 * export, share, save). Fire-and-forget; we still return 200 on insert
 * failure so the caller never sees a UX error from telemetry.
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
    const { session_id, trace_id, kind, details } = body ?? {};
    if (!session_id || !trace_id || !kind) {
      return NextResponse.json({ error: "missing session_id / trace_id / kind" }, { status: 400 });
    }
    await logUserAction({ session_id, trace_id, kind, details: details ?? null });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.warn("[log/action] failed:", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
