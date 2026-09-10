import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side telemetry helpers.
 *
 * All logging goes through the service-role key (server-only). The
 * tables have RLS enabled and no anon policies, so leaked anon keys
 * cannot read or write telemetry data.
 *
 * Every `log*` helper is fire-and-forget — call it inside `waitUntil`
 * so it never blocks the user's response. On error we console.warn
 * and continue.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

function client(): SupabaseClient | null {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  if (cached) return cached;
  cached = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "sinumerik-configurator-telemetry" } },
  });
  return cached;
}

/** Returns true when telemetry is wired up. Useful for guards. */
export function telemetryEnabled(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

// ── Redaction ────────────────────────────────────────────────────
//
// Best-effort scrub of obvious PII from free-text user prompts before
// they hit the database. We do NOT try to be perfect — we trim the
// most common shapes (emails, long all-caps tokens that look like
// project codes, customer references like CR12345) and surface
// `redacted: true` so a reviewer can sanity-check the row.

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PROJECT_CODE_RE = /\b(?:project|ref(?:erence)?|customer|order)\s*[#:]?\s*[A-Z0-9-]{4,}\b/gi;
const LONG_DIGIT_RE = /\b\d{6,}\b/g; // long bare digit runs that aren't MLFB-shaped

export function redact(text: string | undefined | null): { text: string | null; redacted: boolean } {
  if (!text) return { text: text ?? null, redacted: false };
  const before = text;
  const after = text
    .replace(EMAIL_RE, "[email]")
    .replace(PROJECT_CODE_RE, "[project-code]")
    .replace(LONG_DIGIT_RE, "[number]");
  return { text: after, redacted: after !== before };
}

/**
 * Apply `redact()` to every string leaf of an arbitrary JSON value.
 * Conversation history and the model's raw / parsed reply routinely echo
 * the user's own words, so scrubbing only `user_message` left the same
 * PII in the other columns. Returns the scrubbed copy and whether any
 * leaf changed.
 */
export function redactDeep(value: unknown): { value: unknown; redacted: boolean } {
  let hit = false;
  const walk = (v: unknown, depth: number): unknown => {
    if (depth > 12) return v;
    if (typeof v === "string") {
      const r = redact(v);
      if (r.redacted) hit = true;
      return r.text;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, depth + 1));
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = walk(x, depth + 1);
      return out;
    }
    return v;
  };
  return { value: walk(value, 0), redacted: hit };
}

// ── Schema-shaped row types ──────────────────────────────────────

export interface AiTraceRow {
  /** Primary key — generated client-side so the client can attach feedback later. */
  id?: string;
  session_id: string;
  trace_id: string;
  kind: "recommend" | "modify";
  model?: string | null;
  system_prompt?: string | null;
  user_message?: string | null;
  conversation?: unknown;
  raw_response?: unknown;
  parsed_response?: unknown;
  latency_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  error?: string | null;
  redacted?: boolean;
}

export interface ConfigurationRow {
  session_id: string;
  trace_id: string;
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
}

export interface UserActionRow {
  session_id: string;
  trace_id: string;
  kind: string;
  details?: unknown;
}

// ── Insert helpers ───────────────────────────────────────────────

/**
 * Insert an ai_trace row. Returns the inserted row's `id` so the
 * caller can pass it back to the client (the client uses it to
 * attach feedback later via /api/events/feedback).
 */
export async function logAiTrace(input: AiTraceRow): Promise<string | null> {
  const sb = client();
  if (!sb) return null;
  // Scrub every free-text column, not just user_message / system_prompt.
  const conv = redactDeep(input.conversation ?? null);
  const rawR = redactDeep(input.raw_response ?? null);
  const parsedR = redactDeep(input.parsed_response ?? null);
  const row: AiTraceRow = {
    ...input,
    conversation: conv.value,
    raw_response: rawR.value,
    parsed_response: parsedR.value,
    redacted: Boolean(input.redacted) || conv.redacted || rawR.redacted || parsedR.redacted,
  };
  try {
    const { data, error } = await sb
      .from("ai_traces")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      console.warn("[telemetry] ai_traces insert failed:", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.warn("[telemetry] ai_traces insert threw:", e);
    return null;
  }
}

export async function logConfiguration(row: ConfigurationRow): Promise<string | null> {
  const sb = client();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("configurations")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      console.warn("[telemetry] configurations insert failed:", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.warn("[telemetry] configurations insert threw:", e);
    return null;
  }
}

export async function logUserAction(row: UserActionRow): Promise<void> {
  const sb = client();
  if (!sb) return;
  try {
    const { error } = await sb.from("user_actions").insert(row);
    if (error) {
      console.warn("[telemetry] user_actions insert failed:", error.message);
    }
  } catch (e) {
    console.warn("[telemetry] user_actions insert threw:", e);
  }
}

// ── Feedback updates ─────────────────────────────────────────────

export async function updateAiTraceFeedback(args: {
  trace_row_id: string;
  rating: 1 | -1;
  comment?: string | null;
}): Promise<boolean> {
  const sb = client();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_traces")
    .update({
      feedback_rating: args.rating,
      feedback_comment: args.comment ?? null,
      feedback_at: new Date().toISOString(),
    })
    .eq("id", args.trace_row_id);
  if (error) {
    console.warn("[telemetry] feedback update failed:", error.message);
    return false;
  }
  return true;
}

export async function updateConfigurationFeedback(args: {
  config_row_id: string;
  rating: 1 | -1;
  comment?: string | null;
}): Promise<boolean> {
  const sb = client();
  if (!sb) return false;
  const { error } = await sb
    .from("configurations")
    .update({
      feedback_rating: args.rating,
      feedback_comment: args.comment ?? null,
      feedback_at: new Date().toISOString(),
    })
    .eq("id", args.config_row_id);
  if (error) {
    console.warn("[telemetry] config feedback update failed:", error.message);
    return false;
  }
  return true;
}

// ── Read helpers (admin dashboard) ───────────────────────────────

export interface SessionsOverviewRow {
  session_id: string;
  started_at: string;
  last_event_at: string;
  recommend_calls: number;
  modify_calls: number;
  total_latency_ms: number;
  total_input_tokens: number;
  total_output_tokens: number;
  thumbs_up: number;
  thumbs_down: number;
  errors: number;
}

export async function listSessions(opts: {
  limit?: number;
  offset?: number;
  hasThumbsDown?: boolean;
  hasModify?: boolean;
}): Promise<SessionsOverviewRow[]> {
  const sb = client();
  if (!sb) return [];
  let q = sb
    .from("sessions_overview")
    .select("*")
    .order("last_event_at", { ascending: false })
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 50) - 1);
  if (opts.hasThumbsDown) q = q.gt("thumbs_down", 0);
  if (opts.hasModify) q = q.gt("modify_calls", 0);
  const { data, error } = await q;
  if (error) {
    console.warn("[telemetry] listSessions failed:", error.message);
    return [];
  }
  return (data ?? []) as SessionsOverviewRow[];
}

export interface SessionTimelineEntry {
  source: "ai_trace" | "configuration" | "user_action";
  id: string;
  created_at: string;
  payload: Record<string, unknown>;
}

const TIMELINE_CAP = 500;

export async function getSessionTimeline(sessionId: string): Promise<SessionTimelineEntry[]> {
  const sb = client();
  if (!sb) return [];
  // session_id is client-supplied on the public write path, so a single
  // session can hold an unbounded number of rows. Cap each source at the
  // most recent TIMELINE_CAP entries; the UI sorts ascending afterwards.
  const [traces, configs, actions] = await Promise.all([
    sb.from("ai_traces").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(TIMELINE_CAP),
    sb.from("configurations").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(TIMELINE_CAP),
    sb.from("user_actions").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(TIMELINE_CAP),
  ]);

  const entries: SessionTimelineEntry[] = [];
  for (const r of traces.data ?? [])
    entries.push({ source: "ai_trace", id: r.id, created_at: r.created_at, payload: r });
  for (const r of configs.data ?? [])
    entries.push({ source: "configuration", id: r.id, created_at: r.created_at, payload: r });
  for (const r of actions.data ?? [])
    entries.push({ source: "user_action", id: r.id, created_at: r.created_at, payload: r });

  entries.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return entries;
}

export async function getAiTrace(id: string): Promise<Record<string, unknown> | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb.from("ai_traces").select("*").eq("id", id).single();
  if (error) {
    console.warn("[telemetry] getAiTrace failed:", error.message);
    return null;
  }
  return data;
}
