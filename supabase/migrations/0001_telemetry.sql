-- ============================================================
-- SINUMERIK Configurator — telemetry schema (v1)
-- ============================================================
--
-- Run this in the Supabase SQL editor against the project where
-- you want to host the telemetry. Then set these env vars on the
-- Next.js app (Vercel project settings):
--
--   SUPABASE_URL                = https://<project-ref>.supabase.co
--   SUPABASE_SERVICE_ROLE_KEY   = <service role key — server-only>
--   ADMIN_TOKEN                 = <password for /admin>
--
-- The service-role key bypasses RLS — only ever exposed on the
-- server. We never use the anon key from the client; all writes
-- go through Next API routes.

-- ── ai_traces ──────────────────────────────────────────────────
-- One row per /api/recommend or /api/modify call.
create table if not exists public.ai_traces (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null,
  trace_id        uuid not null,
  created_at      timestamptz not null default now(),

  kind            text not null check (kind in ('recommend', 'modify')),
  model           text,
  system_prompt   text,
  user_message    text,
  conversation    jsonb,
  raw_response    jsonb,
  parsed_response jsonb,

  latency_ms      int,
  input_tokens    int,
  output_tokens   int,
  error           text,
  redacted        boolean not null default false,

  -- Set later via /api/log/feedback when the user clicks 👍 / 👎
  feedback_rating  smallint check (feedback_rating in (-1, 1)),
  feedback_comment text,
  feedback_at      timestamptz
);

create index if not exists idx_ai_traces_session_created
  on public.ai_traces (session_id, created_at desc);
create index if not exists idx_ai_traces_trace_created
  on public.ai_traces (trace_id, created_at);
create index if not exists idx_ai_traces_kind_created
  on public.ai_traces (kind, created_at desc);
create index if not exists idx_ai_traces_feedback
  on public.ai_traces (feedback_rating, created_at desc)
  where feedback_rating is not null;

-- ── configurations ─────────────────────────────────────────────
-- One row when a BOM is built (initial render or after re-sizing).
-- We log the most recent state per (session, trace) pair as a fresh
-- row so we can see how the configuration evolved.
create table if not exists public.configurations (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null,
  trace_id        uuid not null,
  created_at      timestamptz not null default now(),

  template        text,
  description     text,
  machine_specs   jsonb,
  control_unit    text,
  cnc_software    text,
  total_axes      int,
  total_channels  int,
  complexity      text,
  bom_items       jsonb,
  warnings        jsonb,
  notes           jsonb,

  feedback_rating  smallint check (feedback_rating in (-1, 1)),
  feedback_comment text,
  feedback_at      timestamptz
);

create index if not exists idx_configs_session_created
  on public.configurations (session_id, created_at desc);
create index if not exists idx_configs_trace_created
  on public.configurations (trace_id, created_at);

-- ── user_actions ───────────────────────────────────────────────
-- Fine-grained UX events: swaps, history reverts, exports, share, save.
create table if not exists public.user_actions (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null,
  trace_id     uuid not null,
  created_at   timestamptz not null default now(),
  kind         text not null,
  details      jsonb
);

create index if not exists idx_actions_session_created
  on public.user_actions (session_id, created_at desc);
create index if not exists idx_actions_trace_created
  on public.user_actions (trace_id, created_at);
create index if not exists idx_actions_kind_created
  on public.user_actions (kind, created_at desc);

-- ── Sessions view (helper for the admin list page) ─────────────
-- Aggregate stats per session so the dashboard can render fast.
create or replace view public.sessions_overview as
  select
    session_id,
    min(created_at)                                                    as started_at,
    max(created_at)                                                    as last_event_at,
    count(*) filter (where kind = 'recommend')                         as recommend_calls,
    count(*) filter (where kind = 'modify')                            as modify_calls,
    sum(coalesce(latency_ms, 0))                                       as total_latency_ms,
    sum(coalesce(input_tokens, 0))                                     as total_input_tokens,
    sum(coalesce(output_tokens, 0))                                    as total_output_tokens,
    count(*) filter (where feedback_rating = 1)                        as thumbs_up,
    count(*) filter (where feedback_rating = -1)                       as thumbs_down,
    count(*) filter (where error is not null)                          as errors
  from public.ai_traces
  group by session_id;

-- Row-level security: lock these tables down. All access goes
-- through the Next API routes using the service-role key.
alter table public.ai_traces      enable row level security;
alter table public.configurations enable row level security;
alter table public.user_actions   enable row level security;

-- (no policies created — service-role bypasses RLS, anon has no access)
