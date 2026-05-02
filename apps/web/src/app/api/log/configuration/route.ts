import { NextResponse } from "next/server";
import { logConfiguration, redact, telemetryEnabled } from "@sinumerik/telemetry";

/**
 * Client → server: persist a configuration snapshot when the BOM is built
 * (or rebuilt). Returns the inserted row's id so the client can attach
 * thumbs feedback later.
 */
export async function POST(request: Request) {
  if (request.headers.get("x-telemetry") === "off") {
    return NextResponse.json({ id: null, skipped: true });
  }
  if (!telemetryEnabled()) {
    return NextResponse.json({ id: null, skipped: true });
  }

  try {
    const body = await request.json();
    const { session_id, trace_id, description, ...rest } = body ?? {};
    if (!session_id || !trace_id) {
      return NextResponse.json({ error: "missing session_id or trace_id" }, { status: 400 });
    }
    const id = await logConfiguration({
      session_id,
      trace_id,
      template: rest.template ?? null,
      description: redact(description).text,
      machine_specs: rest.machine_specs ?? null,
      control_unit: rest.control_unit ?? null,
      cnc_software: rest.cnc_software ?? null,
      total_axes: rest.total_axes ?? null,
      total_channels: rest.total_channels ?? null,
      complexity: rest.complexity ?? null,
      bom_items: rest.bom_items ?? null,
      warnings: rest.warnings ?? null,
      notes: rest.notes ?? null,
    });
    return NextResponse.json({ id });
  } catch (e) {
    console.warn("[log/configuration] failed:", e);
    return NextResponse.json({ id: null, error: "log-failed" }, { status: 200 });
  }
}
