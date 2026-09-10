# SINUMERIK ONE AI Configurator

AI-powered web application for configuring Siemens SINUMERIK ONE CNC
systems. Users describe their machine tool in plain language and the
app produces a complete bill of materials with real Siemens article
numbers (MLFBs) — every component traceable to a catalog page.

## Documentation

- **[User Guide](docs/USER_GUIDE.md)** — what the app does, the
  4-step wizard, the BOM, the export options, FAQ. Written for
  non-technical readers.
- **[Architecture](docs/ARCHITECTURE.md)** — repo layout, AI
  integration, MLFB compositional grammar, drive-system rules,
  telemetry pipeline, admin dashboard, file reference. Written for
  developers and contributors.
- **[Telemetry](docs/TELEMETRY.md)** — operational notes for the
  admin app: env vars, Supabase migration, Vercel deployment,
  adding new tracked events.
- **Architecture diagrams** (interactive HTML, open in any browser):
  [`docs/diagrams/how-it-works.html`](docs/diagrams/how-it-works.html)
  for non-technical readers and
  [`docs/diagrams/technical-architecture.html`](docs/diagrams/technical-architecture.html)
  for developers. Built with [archify](https://github.com/tt-a1i/archify)
  from the `.architecture.json` sources next to them.
- **`docs/workflow.excalidraw`** — one-page diagram of the data
  flow. Open at [excalidraw.com](https://excalidraw.com).

## Features

- **AI picks the architecture, the catalog fills in the MLFBs** —
  Claude does only the fuzzy decisions; deterministic rule-based
  code looks up every actual article number.
- **Compositional MLFB grammar** — 189 catalog-verified motor
  trunks × ~30 verified suffix combinations each = ~5,300 distinct
  orderable MLFBs. Trunk-only families render with a badge so
  partners specify the final characters at order time — never
  fabricated.
- **Per-axis MLFBs** — each feed axis can carry its own complete
  orderable MLFB with a leader-line decoder showing what each
  suffix character means.
- **Drive-system sizing rules** — line module sizing, DRIVE-CLiQ
  cable count, MCP-panel matching, NCU port checks all auto-
  validated and warned.
- **Modify in plain English** — *"upgrade the spindle to 30 kW
  and switch to active line module"* runs through the AI, returns
  a small change set, the rule code re-runs sizing.
- **Export** — copy to clipboard, Excel (.xlsx), PDF with a
  deterministic configuration-rationale page, share-as-text round-
  trip.
- **History panel** — every change snapshotted; revert any step.
- **Telemetry + admin dashboard** — separate `apps/admin/` Next.js
  app reads anonymised session traces from Supabase. One-click
  opt-out from the engineering-review dialog.
- **808D → 828D Smart converter** (`/convert`) — paste or upload a
  SINUMERIK 808D ADVANCED parts list and get every line re-selected
  from the 828D Smart catalogue (PPU, SD card, S200 drives, 1FL2 /
  1PH3 Pro motors, cables) with a source page per article. Rule-based;
  AI is only offered as an optional text reader.

## Quick start

### Prerequisites

- Node.js 20+
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com/settings/keys)

### Setup

```bash
# 1. Install all workspaces
npm install

# 2. Add your Anthropic API key to apps/web
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." > apps/web/.env.local

# 3. Start the configurator on :3000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: run the admin dashboard

The admin app is in a separate workspace and reads from Supabase. See
[docs/TELEMETRY.md](docs/TELEMETRY.md) for the env vars and migration.

```bash
npm run dev:admin       # apps/admin on :3001
```

### Production build

```bash
npm run build           # apps/web only
npm run build:admin     # apps/admin only
npm run build:all       # both
```

## Repo layout (npm workspaces monorepo)

```text
apps/
├── web/                public configurator (deploys as the main site)
└── admin/              private telemetry dashboard (separate Vercel project)
packages/
└── telemetry/          shared Supabase server client + types + redaction
docs/                   user guide, architecture, telemetry, excalidraw
supabase/migrations/    SQL migrations for the telemetry tables
```

## Tech stack

- **Next.js 16** (App Router + Turbopack)
- **TypeScript** (strict)
- **Tailwind CSS** + base-ui primitives + custom industrial-blueprint
  utilities
- **Framer Motion** — animations
- **Zustand** — state management
- **Anthropic SDK** (`@anthropic-ai/sdk`) — Claude API integration
- **Supabase** (`@supabase/supabase-js`) — telemetry storage
- **xlsx** — Excel export
- **jsPDF** + **jspdf-autotable** — PDF export

## Data sources

- **NC63** — SINUMERIK ONE CNC system catalog (Siemens, January 2026)
- **D21.4** — SINAMICS S120/S220 + SIMOTICS motor catalog (December 2023)
- **D21.4 (2017 edition)** — 1FK7 Compact selection tables
- **D32** — SINAMICS S210 servo drive system catalog (February 2026)

Catalog markdown extracts are in the `docs/` folder.

## License

Independent tool. Not affiliated with Siemens AG. Article numbers
(MLFBs) are Siemens product identifiers. Every BOM produced by this
tool must be reviewed by a qualified application engineer before
procurement.
