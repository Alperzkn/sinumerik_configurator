# SINUMERIK ONE AI Configurator

AI-powered web application for configuring Siemens SINUMERIK ONE CNC systems. Users describe their machine tool requirements and the app recommends a complete bill of materials with real Siemens article numbers (MLFBs).

## Features

- **AI-powered selection** — Claude Sonnet 4 analyzes machine requirements and picks optimal SINUMERIK ONE components
- **Catalog-based** — Uses actual Siemens NC63 and D21.4 / D32 catalog data for accurate component selection
- **Complete MLFBs** — Every component in the BOM has a real Siemens article number (no "See SiePortal" placeholders)
- **Mechanical specs form** — Structured form for axis travels, moving mass, spindle specs — ensures proper motor sizing
- **Drive system sizing rules** — Auto-validates line module sizing, DRIVE-CLiQ cable counts, MCP-panel matching
- **Export formats** — Copy to clipboard, Excel (.xlsx), PDF
- **System visualization** — Block diagram showing operator level → control level → drives → motors
- **Live sidebar** — Tracks selected components across all wizard steps

## Quick Start

### Prerequisites

- Node.js 20+
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com/settings/keys)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local with your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." > .env.local

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── configure/
│   │   ├── page.tsx                # Main wizard
│   │   └── system/page.tsx         # System visualization
│   └── api/recommend/route.ts      # AI recommendation endpoint
│
├── components/
│   ├── configurator/               # 5-step wizard components
│   ├── landing/                    # Landing page sections
│   └── ui/                         # shadcn/ui primitives
│
├── data/                           # Catalog data (TypeScript)
│   ├── control-units.ts
│   ├── software-options.ts         # 120+ software licenses
│   ├── technology-packages.ts      # S41/S42/S43 etc.
│   ├── drives.ts / motors.ts       # Component families
│   ├── hmi-components.ts           # Panels, MCPs, handwheels
│   ├── safety.ts
│   └── cables.ts                   # Auto-selected cables
│
├── lib/
│   ├── ai/                         # AI integration
│   │   ├── prompt-builder.ts       # System prompt construction
│   │   ├── catalog-retriever.ts    # Compact catalog tables for AI
│   │   ├── recommendation-engine.ts # Client-side API caller
│   │   └── response-parser.ts      # Parses AI JSON to typed config
│   ├── validation/
│   │   └── drive-system-rules.ts   # Line module, DRIVE-CLiQ, MCP rules
│   └── export/
│       └── pdf-generator.ts
│
├── store/configurator-store.ts     # Zustand state
└── types/catalog.ts                # All domain types
```

## Tech Stack

- **Next.js 16** (App Router + Turbopack)
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion** — animations
- **Zustand** — state management
- **Anthropic SDK** (`@anthropic-ai/sdk`) — Claude API integration
- **xlsx** — Excel export
- **jsPDF** + **jspdf-autotable** — PDF export

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System architecture, data flow, diagrams
- [User Guide](docs/USER_GUIDE.md) — How to use the configurator

## Data Sources

- **NC63** — SINUMERIK ONE CNC system catalog (Siemens, January 2026)
- **D21.4** — SINAMICS S120/S220 + SIMOTICS motor catalog (Siemens, December 2023)
- **D32** — SINAMICS S210 servo drive system catalog (Siemens, February 2026)

Catalog markdown extracts are in the `docs/` folder.

## License

Independent tool. Not affiliated with Siemens AG. Article numbers (MLFBs) are Siemens product identifiers.
