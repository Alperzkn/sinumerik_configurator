# Telemetry & admin dashboard

The configurator records every prompt, AI response, resulting BOM, and user
action so we can debug poor configurations and learn from real usage. The
data lives in Supabase. A separate admin app (under `apps/admin/`) reads it.

## Repo layout

This repo is an npm workspaces monorepo:

```
apps/
├── web/                    # public configurator (deploys as the main site)
└── admin/                  # private telemetry dashboard (separate Vercel project)
packages/
└── telemetry/              # shared Supabase server client + types + redaction
```

Run scripts from the repo root:

```bash
npm install                 # installs all workspaces
npm run dev                 # apps/web on :3000
npm run dev:admin           # apps/admin on :3001
npm run build               # apps/web only
npm run build:admin         # apps/admin only
npm run build:all           # both
```

## What gets logged

Three tables, defined in `supabase/migrations/0001_telemetry.sql`:

| Table            | One row per…                                                      |
| ---------------- | ----------------------------------------------------------------- |
| `ai_traces`      | every call to `/api/recommend` and `/api/modify`                  |
| `configurations` | every distinct BOM the user lands on                              |
| `user_actions`   | swap / export / journey-start events                              |

A `sessions_overview` SQL view aggregates by `session_id` for the dashboard
list page.

Both `ai_traces` and `configurations` carry `feedback_rating` (1 / -1) and
`feedback_comment` columns, populated when the user clicks the thumbs UI.

## Privacy

- The telemetry client redacts emails, project codes, and long digit runs
  before posting (`packages/telemetry/src/server.ts` → `redact()`).
- Telemetry is opt-out at any time from the disclaimer dialog (writes
  `sinumerik-telemetry-disabled=1` to `localStorage`); the client then
  sends `X-Telemetry: off` on every call and the server skips the insert.
- Tables have RLS enabled and **no anon policies**. Only the service-role
  key (server-side) can read or write. A leaked anon key cannot reach
  this data.

## Required env vars

### apps/web/.env.local

```
ANTHROPIC_API_KEY=...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

If `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are missing the configurator
runs normally — the log writes silently no-op.

### apps/admin/.env.local

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_TOKEN=<a long random string>
```

If `ADMIN_TOKEN` is missing the login page tells you so. The dashboard uses
a single shared token (no multi-user) — the cookie value IS the token, sent
httpOnly + sameSite=lax + secure-in-prod.

## Running the migration

```bash
# from the repo root, against your linked Supabase project:
supabase db push        # applies supabase/migrations/0001_telemetry.sql
```

Or paste the file contents into the SQL editor in the Supabase dashboard.

## Vercel deployment

Two separate Vercel projects, both pointing at this monorepo:

| Vercel project | Root Directory | Build command         | Domain                  |
| -------------- | -------------- | --------------------- | ----------------------- |
| `web`          | `apps/web`     | `npm run build`       | the public site         |
| `admin`        | `apps/admin`   | `npm run build`       | e.g. `admin.your.tld`   |

Vercel auto-detects npm workspaces — the install command runs at the repo
root and hoists deps, then each project builds its own app.

Set env vars per-project (above). Do **not** put `ADMIN_TOKEN` on the web
project; do **not** put `ANTHROPIC_API_KEY` on the admin project.

## Admin dashboard pages

| Route                    | What it shows                                              |
| ------------------------ | ---------------------------------------------------------- |
| `/login`                 | password gate; sets the `admin_token` cookie               |
| `/`                      | sessions list, with filters for `thumbsDown` / `modify`    |
| `/sessions/[id]`         | full timeline for one session (AI calls + BOMs + actions)  |
| `/traces/[id]`           | one AI trace in detail — prompt, raw response, JSON parse  |

## Adding a new tracked event

1. POST something to `/api/log/action` with `{kind: "your_event", details}`
   from a client component, via `trackAction()` in
   `apps/web/src/lib/telemetry/client.ts`.
2. The dashboard's session timeline picks it up automatically — no schema
   change needed; `details` is `jsonb`.

For brand-new tables, add a migration in `supabase/migrations/`, extend
`packages/telemetry/src/server.ts`, and the dashboard.
