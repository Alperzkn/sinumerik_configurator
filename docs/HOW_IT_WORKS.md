# How the SINUMERIK ONE Configurator works

A short, plain-English walkthrough — written so a new user (or new contributor) can read it cover-to-cover in 10 minutes and understand the whole flow without reading any code.

---

## The big picture

The AI does **only one job**: read your machine description and pick the high-level *architecture* — control unit, technology packages, safety level, drive family, HMI panel size. It never writes article numbers (MLFBs).

Then **rule-based code** in the app, using the Siemens catalog stored locally, fills in every actual MLFB — motors, motor modules, line modules, cables, HMI, accessories — based on your mechanical specs and the AI's architectural choice.

```
┌────────────────────────┐    ┌─────────────────────────┐    ┌──────────────────┐
│ 1. Describe your       │ →  │ 2. App picks            │ →  │ 3. You get the   │
│    machine             │    │    components           │    │    BOM           │
│   (template OR         │    │   (AI for architecture, │    │   (Excel, PDF,   │
│    custom text)        │    │    code for MLFBs)      │    │    share-as-text)│
└────────────────────────┘    └─────────────────────────┘    └──────────────────┘
```

Two halves: the AI handles fuzzy decisions, the code handles exact lookups. That's the whole design.

---

## The 4-step wizard

| Step | What happens |
|---|---|
| **1. Describe** | Pick a template (3-axis mill, 5-axis, lathe, mill-turn, grinding, laser, punching, robot) **or** type your own description. Optionally fill in mechanical specs. All specs are optional — defaults are derived from the machine class or the largest axis-travel dimension. |
| **2. Analyze** | Only runs for custom descriptions, OR for templates plus any specs/notes. Pure template-only goes straight to step 3. The AI may ask 0–3 clarifying questions, then returns the architecture. |
| **3. Configure** | The recommended BOM appears in expandable sections (Control Unit, Drives, Motors, HMI, Safety, Cables, …). You can swap any component, add/remove options, ask the AI to modify in plain English, and revert any change via the History panel. |
| **4. Bill of materials** | The final BOM table. Copy, export as Excel or PDF, share as text, save locally, or jump back to keep editing. |

The wizard step indicator at the top shows which step you're on; you can click any completed step to jump back.

---

## What each input on the form does

| Input | Where it goes |
|---|---|
| **Template** (3-axis mill, 5-axis, …) | Tells the AI what kind of machine you're building. Also acts as a fallback default if you don't fill specs. |
| **Description** (free text) | Pure context for the AI — *"gantry 3000×2000 mm, aerospace parts, high-speed."* |
| **Spindle power (kW)** | Sent to the spindle-sizing function. It picks the smallest 1PH8/1FE motor whose rated power ≥ your number. |
| **Spindle speed (rpm)** | Same — sizing picks a motor with max rpm ≥ yours. Above 10 000 rpm it switches to a synchronous spindle. |
| **Moving mass per axis (kg)** | Drives feed-motor torque selection: torque needed = mass × required acceleration × safety factor → picks 1FT7 / 1FT2 / 1FK2 of the right shaft height. |
| **Rapid traverse (m/min)** | Combined with mass to compute required torque. |
| **Axis travel** | If you didn't pick a machine size class, the largest dimension here is binned into small / medium / large / very-large — used as defaults for whatever specs you skipped. |
| **Material** | Light/soft materials (aluminum, plastic, composite) bias toward a synchronous spindle. |
| **Machine size class** | Default values for any spec you skipped. |
| **Safety level** (basic / extended / full) | Hard override. *Basic* means STO/SS1/SBC only; *Extended* forces S60+S61; *Full* adds K01..Kn for n axes. Wins over whatever the AI suggested. |
| **Handheld terminal**, **I/O module**, **Cable length** | Applied directly by the rule code — added to the BOM as you chose, no AI involvement. |

---

## What we ask the AI (and what we don't)

The AI receives: domain rules (when to pick NCU 1740 vs 1750 vs 1760, which packages bundle which options, when extended safety is needed), your description, and your spec block. It returns a small JSON object:

```json
{
  "controlUnit": { "id": "NCU_1750" },
  "cncSoftware": { "variant": "full_scope", "swVersion": "6.25" },
  "technologyPackages": [{ "id": "S43" }],
  "additionalOptions": [{ "orderCode": "M72", "quantity": 1 }],
  "driveArchitecture": {
    "family": "S120_booksize",
    "feedAxisCount": 5,
    "spindleCount": 1,
    "preferActiveLineModule": true,
    "highSpeedSpindle": true
  },
  "hmi": { "type": "thin_client", "panelSizeInch": 19 },
  "safety": { "options": ["S60", "S61"] },
  "totalAxes": 6,
  "totalChannels": 1
}
```

That's it — short codes, no MLFBs. The AI is explicitly forbidden in its prompt from inventing motor or drive part numbers.

If you only picked a template and filled nothing else, the app **skips the AI entirely** and uses a pre-defined architecture for that template (8 of these are stored in the app). Faster + cheaper. As soon as you fill any spec or write notes, the call routes through the AI so your input gets considered.

---

## How real products get picked

Once the AI has returned the architecture, the rule-based code runs:

1. **Motors** — sizing functions take your spindle kW/rpm and your axis mass/rapid, look up in the local motor table (~130 specific motor variants), and pick the smallest one that meets each requirement. Returns the exact MLFB.
2. **Motor modules** — each picked motor has a `motorModule` field paired with it (matched on rated current). One module per axis.
3. **Line module** — sums the motor power × a 0.7 simultaneity factor, picks the smallest line module that handles the load. Active vs Smart depends on what the AI flagged or what you asked for.
4. **HMI + MCP** — your panel size determines the matching MCP automatically (15" panel pairs with the 15" MCP, etc.).
5. **Cables** — derived from the motor shaft heights (cable cross-section), the cable count from the drive topology (DRIVE-CLiQ daisy-chain math), and the length from your *Cable length* input.
6. **Safety** — your safety-level choice replaces whatever the AI returned and gets resolved to specific catalog entries (S60, S61, K01–K0n).
7. **Software options** — anything the AI listed in `additionalOptions` is added; options already bundled in a chosen tech package are deduplicated.

The result is a fully populated configuration with real MLFBs that you can verify against Siemens' catalogs (NC63 for SINUMERIK, D21 for SINAMICS drives + cables, D31 for SIMOTICS motors).

---

## After the BOM exists

- **Swap any component** — click any card, get a list of compatible variants from the catalog; dependent components (motor modules, line modules, cables) re-size automatically.
- **Ask AI to modify** — *"make the spindle 40 kW and switch to active line module"* → the AI returns a small change set (e.g. *"set userSpecsOverride.spindlePowerKw = 40, set preferActiveLineModule = true"*) and the rule code re-runs sizing on top of the existing config.
- **History panel** — every change is snapshotted; revert any step.
- **Share** — a single text blob (markdown BOM + a base64 payload) someone else can paste back to load your exact config. Optional one-line modification request applied in the same step.
- **Export** — clipboard, Excel, PDF, or the share-as-text flow.
- **System diagram** — visual topology view of your config (operator → control → drive → motor → cables) with live MLFBs.

---

## One-line summary

You provide intent + specs → AI picks a small set of architectural codes → rule-based code looks up every real Siemens MLFB from a versioned local catalog → you get a verifiable BOM you can swap, modify, share, and export.

---

## Where to look in the code (for contributors)

| Concern | File |
|---|---|
| AI request shapes, model + system prompt | `src/lib/ai/prompt-builder.ts`, `src/app/api/recommend/route.ts` |
| Per-template canned architectures | `src/lib/ai/template-architectures.ts` |
| Catalog reference fed to the AI | `src/lib/ai/catalog-retriever.ts` |
| Turning AI architecture + specs → full BOM | `src/lib/ai/response-parser.ts` |
| Motor + drive sizing math | `src/lib/sizing/spindle-sizing.ts`, `src/lib/sizing/feed-sizing.ts`, `src/lib/validation/drive-system-rules.ts` |
| Cable selection (length + topology) | `src/data/cables.ts` |
| Catalog data (single source of truth) | `src/data/*.ts` (motors, drives, hmi-components, safety, software-options, technology-packages, …) |
| Modify-on-natural-language pipeline | `src/lib/ai/modify-engine.ts`, `src/app/api/modify/route.ts`, `src/lib/ai/config-mutations.ts` |
| Share-as-text serializer | `src/lib/share/config-sharing.ts` |
| Wizard UI + steps | `src/components/configurator/*.tsx` |
| Routes / pages | `src/app/page.tsx` (landing), `src/app/configure/page.tsx` (wizard), `src/app/configure/system/page.tsx` (diagram) |
