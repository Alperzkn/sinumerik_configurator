# How the SINUMERIK ONE Configurator Works

A short, friendly tour of the app — written so a new user (or new contributor) can read it cover-to-cover in 10 minutes.

---

## 1. What does this app do?

You describe a machine tool — what kind, how big, how powerful — and the app produces a complete **bill of materials** (BOM) for a SINUMERIK ONE CNC system: control unit, software, drives, motors, HMI, safety, cables. Every component carries its real Siemens article number (MLFB) so you can hand the BOM straight to procurement.

```
┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ 1. Describe your │ →  │ 2. App picks    │ →  │ 3. You get the   │
│    machine       │    │    components   │    │    BOM (Excel,   │
│  (template OR    │    │   (AI plans +   │    │    PDF, JSON)    │
│   custom text)   │    │   sized motors) │    │                  │
└──────────────────┘    └─────────────────┘    └──────────────────┘
```

---

## 2. The 5-step wizard

| Step | What happens |
|---|---|
| **1. Describe Machine** | Pick a template (3-axis mill, 5-axis center, lathe, mill-turn, grinding, laser, punching, robot) **or** type your own description. Optionally fill in mechanical specs (axis travels, spindle power, etc.). All specs are optional — defaults are derived from the machine class. |
| **2. AI Analysis** | Only runs for **custom descriptions**. Templates skip this step. The AI asks 0–3 clarifying questions if your description lacks numbers, then plans the architecture. |
| **3. Configuration** | The recommended BOM appears, organised into accordion sections (Control Unit, CNC Software, Software Options, Drives, Motors, HMI, I/O, Handheld, Safety, Cables). You can swap any component, add/remove software options, ask the AI to modify, and revert to any earlier state via the History panel. |
| **4. Review** | Flat table of every line item for a final check. |
| **5. Summary** | Final BOM. Copy to clipboard, export as Excel or PDF, save the configuration locally, or jump back to make more changes. |

The wizard step indicator at the top shows which step you're on; you can click any completed step to jump back.

---

## 3. The "AI plans, code sizes" split — why your motors are right

This is the most important design decision in the app.

```
┌────────────────────────────────────────────────────────────────┐
│  AI (Claude Sonnet 4.6)                                        │
│  ─────────────────────                                         │
│  Decides ARCHITECTURE only:                                    │
│   • Which control unit (PPU 1740 / NCU 1740/1750/1760)         │
│   • Which technology packages (S41 / S42 / S43 / M30 / …)      │
│   • Total axes, channels, spindle count                        │
│   • Safety level (basic / extended / kinematics)               │
│   • HMI panel size                                             │
│   • Drive family (S120 booksize / S210)                        │
│   • CNC SW variant (export / full scope)                       │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  Deterministic sizing engine (src/lib/sizing/)                 │
│  ──────────────────────────────────────────                    │
│  Picks SPECIFIC ARTICLE NUMBERS from the catalog:              │
│   • Spindle motor (filter MOTOR_SPECS by required kW + max rpm)│
│   • Feed motor (filter by torque from moving mass + rapid)     │
│   • Motor module (paired with motor by current draw)           │
│   • Line module (sized for total motor power × 0.7)            │
│   • Cables (cross-section + length matched to motors)          │
│   • MCP (matched to HMI panel size)                            │
│   • DRIVE-CLiQ cable count (from topology)                     │
└────────────────────────────────────────────────────────────────┘
```

**Why this matters:** AI is great at understanding "5-axis HSC with 35 kW spindle" and choosing the right architecture. But asking it to also pick a motor article number means it pattern-matches on examples and gets it wrong. The sizing engine treats motor selection as the deterministic engineering lookup it actually is — given (power, max rpm, torque) → smallest catalog row that meets all constraints.

Result: motors are **always** picked correctly when the catalog has a match, and you get a real warning ("Required 12000 rpm — no 1PH8 reaches that at 35 kW, consider a motor spindle") when it doesn't.

---

## 4. What you can do on the Configuration page

| Action | How |
|---|---|
| **Swap a component** | Hover any motor / motor module / line module / control unit card → click **Swap** → pick from the catalog table |
| **Add a software option** | "Software Options" section → **Add option or package** → search by name, order code, or article. Multi-slot options (A01–A28, C11–C19, K-axis) collapse into a single row with a quantity selector |
| **Remove a software option / package / safety** | Hover the card → click **Remove** (basic safety STO/SS1/SBC stays locked — it's hardware) |
| **Ask AI to modify** | "Ask AI to modify configuration" pane → type a request like *"upgrade spindle to 30 kW"*, *"switch to NCU 1760"*, *"add HT 10 handheld"*, *"use 1FK2 motors"*. Quick-action buttons cover the common cases. |
| **Save / Open** | **Save** keeps a snapshot in your browser; **Open** lists everything saved. **Export** downloads a JSON file you can share or load on another browser |
| **Revert any change** | Open the **History** panel — every change shows what MLFBs were added / removed / re-quantified. Click **Revert** on any earlier entry to restore that state |

---

## 5. Where things live (for contributors)

```
src/
├── app/
│   ├── api/recommend/route.ts   ← initial AI call (custom description)
│   └── api/modify/route.ts      ← AI modify call from the pane
│
├── data/                        ← STATIC CATALOG DATA (single source of truth)
│   ├── control-units.ts         ← PPU 1740, NCU 1740/1750/1760
│   ├── cnc-software.ts          ← Export vs full-scope variants
│   ├── software-options.ts      ← A01-A28, C, M, P, S, K codes (~120)
│   ├── technology-packages.ts   ← S41, S42, S43, M30, etc.
│   ├── drives.ts                ← TM modules, NX hubs, sensor modules
│   ├── motors.ts                ← motor family stubs (specs in lib/validation)
│   ├── hmi-components.ts        ← thin clients, panels, MCPs, handhelds, I/O
│   ├── safety.ts                ← STO, SS1, SBC, S60, S61, K-axis, kinematics
│   ├── cables.ts                ← MOTION-CONNECT cables + selectCables()
│   └── machine-templates.ts     ← 8 template definitions
│
├── lib/
│   ├── ai/
│   │   ├── prompt-builder.ts        ← system prompt for initial analysis
│   │   ├── recommendation-engine.ts ← initial-call orchestration
│   │   ├── response-parser.ts       ← AI JSON → GeneratedConfiguration
│   │   ├── modify-engine.ts         ← Ask-AI-to-modify pipeline
│   │   ├── config-mutations.ts      ← swap / add / remove helpers
│   │   ├── catalog-retriever.ts     ← compact catalog tables fed to AI
│   │   ├── template-architectures.ts← preset architecture per template
│   │   └── build-from-template.ts   ← skips AI for templates
│   │
│   ├── sizing/                  ← DETERMINISTIC HARDWARE SELECTION
│   │   ├── spindle-sizing.ts        ← pick smallest 1PH8 meeting kW + rpm
│   │   ├── feed-sizing.ts           ← pick smallest 1FT7/1FT2 meeting torque
│   │   └── index.ts                 ← orchestrator + machine-class defaults
│   │
│   ├── validation/
│   │   └── drive-system-rules.ts    ← MOTOR_SPECS (verified catalog data),
│   │                                  MOTOR_MODULE_SPECS, line-module logic,
│   │                                  MCP-HMI matching
│   │
│   ├── history/diff.ts          ← per-change MLFB diff for History panel
│   └── storage/saved-configs.ts ← localStorage save/load
│
├── store/configurator-store.ts  ← single Zustand store (wizard state,
│                                  config, AI messages, history)
│
└── components/configurator/
    ├── wizard-shell.tsx             ← header + step indicator + theme
    ├── machine-description-step.tsx ← step 1
    ├── ai-analysis-step.tsx         ← step 2
    ├── configuration-step.tsx       ← step 3
    ├── review-step.tsx              ← step 4
    ├── summary-step.tsx             ← step 5
    │
    ├── machine-specs-form.tsx       ← optional spec inputs
    ├── component-card.tsx           ← reusable component row
    ├── component-swap-dialog.tsx    ← swap dialog
    ├── software-option-dialog.tsx   ← add option / package dialog
    ├── ai-modify-pane.tsx           ← "Ask AI" pane on Config page
    ├── save-load-dialog.tsx         ← save / open / export / import
    ├── history-panel.tsx            ← per-change history with revert
    └── selection-sidebar.tsx        ← right-side BOM summary
```

**Single source of truth** for hardware data: `src/lib/validation/drive-system-rules.ts` (`MOTOR_SPECS`, `MOTOR_MODULE_SPECS`, line-module table). Everything else reads from these.

---

## 6. Where the catalog data comes from

Every motor / drive / cable article number in the app is **verified against the official Siemens catalog markdown** in `docs/`:

| Catalog file | Contains |
|---|---|
| `motion-control-NC63-complete-english-2026-01.pdf` (.md) | SINUMERIK ONE — control units, software, options, packages, HMI, safety |
| `motion-control-drives-D21-4-…-1/2/3.pdf` (.md) | SINAMICS S120 booksize — line modules, motor modules, sensor modules, motors (1FT7/1FT2/1PH8/1FE1/1FN3/1FW6), MOTION-CONNECT cables |
| `motion-control-drives-D32-…-2026-02.pdf` (.md) | SINAMICS S210 — converters and 1FK2 motors |

If the catalog uses a wildcard MLFB like `1FT2104-4AF■■-■■■B0`, we store the verified base (`1FT2104-4AF`) and note in the description that the customer fills in the encoder / brake / cabling slots at order time.

ET 200SP I/O modules are real Siemens parts but live in the SIMATIC ST 70 catalog, which we don't ship in `docs/`. Those few entries are explicitly marked "Source: SIMATIC catalog ST 70 — verify in your edition" so it's clear you need to cross-check them.

---

## 7. The lifecycle of a configuration

```
                                 ┌──────────────────────┐
                                 │ Template selected?   │
                                 └─────────┬────────────┘
                                       Yes │  No
                                ┌──────────┴───────────┐
                                ▼                      ▼
                  ┌─────────────────────┐    ┌────────────────────┐
                  │ template-architectures.ts│ │ AI /api/recommend  │
                  │ (skip AI round trip)│    │ (Anthropic call)   │
                  └─────────┬───────────┘    └─────────┬──────────┘
                            └──────────┬───────────────┘
                                       ▼
                  ┌────────────────────────────────────────┐
                  │ parseAiResponse(architecture, specs)   │
                  └────────────────────┬───────────────────┘
                                       ▼
                  ┌────────────────────────────────────────┐
                  │ sizeConfiguration(specs)               │
                  │  ↳ selectSpindleMotor + selectFeedMotor│
                  │  ↳ paired motor modules                │
                  │  ↳ selectLineModule (auto-sized)       │
                  │  ↳ selectCables (cross-section + len)  │
                  │  ↳ MCP-HMI match, S00 Operate license  │
                  └────────────────────┬───────────────────┘
                                       ▼
                  ┌────────────────────────────────────────┐
                  │ GeneratedConfiguration → Zustand store │
                  │ history seeded with "init" entry       │
                  └────────────────────┬───────────────────┘
                                       ▼
                  ┌────────────────────────────────────────┐
                  │ Configuration step renders the BOM     │
                  │ User can swap / add / remove / Ask AI  │
                  │ Each change → new history entry +      │
                  │ regenerateCablesFor(updated)           │
                  └────────────────────────────────────────┘
```

Every modification path (swap dialog, add-option dialog, AI modify) ends in:
1. `setConfiguration(updated)` — replaces the config in the store
2. `pushHistory({ kind, title, snapshot })` — adds a History entry with the MLFB diff
3. A toast notification (success / info / warning / error)

---

## 8. Why "Ask AI to modify" is honest

A common pitfall: the AI says *"Upgraded control unit to NCU 1760"* but actually returns the current value, so nothing changes. The app guards against this:

1. The modify prompt contains 10 few-shot examples and an explicit *"NEVER echo the current value"* rule.
2. After applying any change, `applyModifications()` runs `diffConfigurations(current, updated)` to check what **actually** differs at the MLFB level.
3. If `totalChanges === 0` the toast says **"Nothing changed"** with a suggested rephrasing — even if the AI's prose claimed otherwise.

So when you see "Configuration updated" you can trust it: at least one MLFB really changed.

---

## 9. Theme

Top-right of the wizard header has a sun / moon / system pill. Light and dark themes are full-fidelity; the choice is persisted to `localStorage`. The page also follows your OS preference if you pick **System**.

---

## 10. Keyboard / mouse shortcuts

| | |
|---|---|
| `Esc` | close any open dialog |
| Click a step number in the header | jump to that wizard step (only if completed) |
| Hover a component card | reveals **Swap** / **Remove** buttons |
| Click toast `×` | dismiss the notification (toasts are sticky by default) |

---

That's it — the app has more pieces than this doc covers, but if you understand the **AI-plans-code-sizes split**, the **single Zustand store**, and the **History panel as audit trail**, you understand how everything connects.
