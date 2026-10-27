-- ============================================================
-- SINUMERIK Configurator — telemetry schema (v2)
-- ============================================================
--
-- sessions_overview used to aggregate ai_traces only, so a browser session
-- that never called the AI (template flow, manual swaps, exports, the
-- 808D → 828D Smart converter) never appeared on the admin Sessions page.
-- The view now unions all three tables: every session that logged
-- anything shows up, with AI stats where they exist.
--
-- Run in the Supabase SQL editor (or `supabase db push`).

create or replace view public.sessions_overview as
  with events as (
    select session_id, created_at, 'ai'     as src, kind, latency_ms, input_tokens, output_tokens, feedback_rating, error
      from public.ai_traces
    union all
    select session_id, created_at, 'config' as src, null, null, null, null, feedback_rating, null
      from public.configurations
    union all
    select session_id, created_at, 'action' as src, kind, null, null, null, null, null
      from public.user_actions
  )
  select
    session_id,
    min(created_at)                                                          as started_at,
    max(created_at)                                                          as last_event_at,
    count(*) filter (where src = 'ai' and kind = 'recommend')                as recommend_calls,
    count(*) filter (where src = 'ai' and kind = 'modify')                   as modify_calls,
    coalesce(sum(latency_ms) filter (where src = 'ai'), 0)                   as total_latency_ms,
    coalesce(sum(input_tokens) filter (where src = 'ai'), 0)                 as total_input_tokens,
    coalesce(sum(output_tokens) filter (where src = 'ai'), 0)                as total_output_tokens,
    count(*) filter (where feedback_rating = 1)                              as thumbs_up,
    count(*) filter (where feedback_rating = -1)                             as thumbs_down,
    count(*) filter (where src = 'ai' and error is not null)                 as errors,
    count(*) filter (where src = 'config')                                   as configurations,
    count(*) filter (where src = 'action')                                   as actions,
    count(*) filter (where src = 'action' and kind = 'convert_808d')         as convert_calls
  from events
  group by session_id;
