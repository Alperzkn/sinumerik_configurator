/**
 * Client-side telemetry helpers.
 *
 * Two ids:
 *   - sessionId: anonymous, lasts the browser session (sessionStorage).
 *                One per browser tab → cleared when the tab closes.
 *   - traceId:   one configuration journey. New trace generated when
 *                the user hits "Build configuration" / "Analyze with AI"
 *                from the description step. All subsequent events
 *                (modify, swap, export) attach to this trace.
 *
 * Opt-out: localStorage["sinumerik-telemetry-disabled"] = "1".
 * When set, every helper here becomes a no-op AND the server routes
 * receive an `X-Telemetry: off` header so they skip writing too.
 */

const SESSION_KEY = "sinumerik-session-id";
const TRACE_KEY = "sinumerik-trace-id";
const OPTOUT_KEY = "sinumerik-telemetry-disabled";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Old-browser fallback — random hex shaped like a uuid.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isTelemetryDisabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(OPTOUT_KEY) === "1";
  } catch {
    return true;
  }
}

export function setTelemetryDisabled(disabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (disabled) localStorage.setItem(OPTOUT_KEY, "1");
    else localStorage.removeItem(OPTOUT_KEY);
  } catch {
    /* ignore */
  }
}

/** Get-or-create the session id (sessionStorage scope). */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return uuid(); // last resort — non-persisted
  }
}

/** Get-or-create the trace id (sessionStorage scope). */
export function getTraceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(TRACE_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(TRACE_KEY, id);
    }
    return id;
  } catch {
    return uuid();
  }
}

/** Start a fresh configuration journey — generates a new traceId. */
export function startNewTrace(): string {
  if (typeof window === "undefined") return "";
  const id = uuid();
  try {
    sessionStorage.setItem(TRACE_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}

// ── Helpers used by the configurator store / pages ──────────────

export interface TelemetryHeaders {
  "X-Telemetry"?: string;
  "X-Session-Id"?: string;
  "X-Trace-Id"?: string;
  "X-Trace-Row-Id"?: string;
}

/**
 * Headers to attach to /api/recommend and /api/modify fetch calls.
 *
 * `X-Trace-Row-Id` is freshly generated for *each* AI call. The server
 * uses it as the primary key of the inserted ai_traces row, so the
 * client already knows the id and can post feedback against it later
 * without an extra round-trip.
 */
export function telemetryHeaders(): TelemetryHeaders & { traceRowId: string } {
  const traceRowId = uuid();
  if (isTelemetryDisabled()) {
    return { "X-Telemetry": "off", traceRowId };
  }
  return {
    "X-Session-Id": getSessionId(),
    "X-Trace-Id": getTraceId(),
    "X-Trace-Row-Id": traceRowId,
    traceRowId,
  };
}

/** Fire a user-action event (swap, history-revert, export, share, save). */
export async function trackAction(
  kind: string,
  details?: Record<string, unknown>
): Promise<void> {
  if (isTelemetryDisabled()) return;
  try {
    await fetch("/api/events/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        session_id: getSessionId(),
        trace_id: getTraceId(),
        kind,
        details: details ?? null,
      }),
    });
  } catch {
    /* swallow — telemetry must never break the UX */
  }
}

/** Log the current BOM (after sizing engine builds it). */
export async function logConfiguration(payload: {
  template?: string | null;
  description?: string | null;
  machine_specs?: unknown;
  control_unit?: string | null;
  cnc_software?: string | null;
  total_axes?: number | null;
  total_channels?: number | null;
  complexity?: string | null;
  bom_items?: unknown;
  warnings?: unknown;
  notes?: unknown;
}): Promise<string | null> {
  if (isTelemetryDisabled()) return null;
  try {
    const res = await fetch("/api/events/configuration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        trace_id: getTraceId(),
        ...payload,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch {
    return null;
  }
}

/** Submit thumbs-up / thumbs-down + optional comment on an AI trace. */
export async function submitAiFeedback(args: {
  trace_row_id: string;
  rating: 1 | -1;
  comment?: string;
}): Promise<boolean> {
  if (isTelemetryDisabled()) return false;
  try {
    const res = await fetch("/api/events/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "ai_trace", ...args }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Submit thumbs-up / thumbs-down on a configuration row. */
export async function submitConfigurationFeedback(args: {
  config_row_id: string;
  rating: 1 | -1;
  comment?: string;
}): Promise<boolean> {
  if (isTelemetryDisabled()) return false;
  try {
    const res = await fetch("/api/events/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "configuration", ...args }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
