# User Guide

The plain-English guide to the SINUMERIK ONE Configurator. No code,
no jargon — just what each screen does and how to get a clean bill of
materials out the other side.

> **Who this is for** — application engineers, sales engineers, and
> anyone who needs a starting-point BOM for a SINUMERIK ONE machine.
> If you are a developer, see [ARCHITECTURE.md](ARCHITECTURE.md) instead.

---

## What the app does in one sentence

You describe a machine in plain language (or pick a template). The
app picks every Siemens part — control unit, drives, motors, safety,
HMI, cables — and gives you a complete BOM with real article numbers
(MLFBs) you can hand to your Siemens partner.

It is a **starting point for discussion**, not an order. Every BOM
must be reviewed by a qualified engineer before procurement.

---

## The 4-step wizard

```text
┌──────────┐    ┌──────────┐    ┌────────────┐    ┌──────────────┐
│ 1.       │ →  │ 2.       │ →  │ 3.         │ →  │ 4.           │
│ Describe │    │ Analyse  │    │ Configure  │    │ Bill of      │
│          │    │ (AI)     │    │            │    │ materials    │
└──────────┘    └──────────┘    └────────────┘    └──────────────┘
```

A step indicator at the top shows where you are. You can click any
finished step to jump back.

---

## Step 1 — Describe your machine

You have two ways to tell the app what you're building.

### Option A: pick a template

Eight machine types, each with sensible defaults baked in:

| Template      | Typical axes               | Used for                        |
| ------------- | -------------------------- | ------------------------------- |
| 3-axis mill   | X, Y, Z + spindle          | General milling                 |
| 5-axis mill   | X, Y, Z, A, C + spindle    | Aerospace, complex geometry     |
| CNC lathe     | X, Z + spindle             | Cylindrical parts               |
| Mill-turn     | Multi-axis + multi-spindle | Combined turning + milling      |
| Grinding      | X, Y, Z + wheel            | Surface or cylindrical grinding |
| Laser cutting | X, Y, Z + laser            | Sheet metal                     |
| Punching      | X, Y + tool                | Sheet metal forming             |
| Robot cell    | 6 joint axes               | Articulated arm                 |

Picking a template alone is enough to get a starter BOM. If you
*also* fill in the mechanical specs form below, the AI uses those
values to size motors and drives properly — strongly recommended for
production machines.

### Option B: write a free-form description

Type a paragraph. Example:

> "5-axis gantry milling machine for aerospace parts. X 3000 mm,
> Y 2000 mm, Z 1000 mm. Moving mass per axis around 2000 kg. Spindle
> 24 000 rpm at 30 kW. High surface quality on titanium alloys."

The AI parses natural language. The more numbers you give it, the
better the sizing. Vague descriptions ("big machine, heavy duty")
get vague sizing.

### The mechanical specs form

| Field          | Example value                | Why it matters                             |
| -------------- | ---------------------------- | ------------------------------------------ |
| Machine size   | Small / Medium / Large       | Picks default motor shaft height           |
| Axis travel    | 800 × 500 × 500 mm           | Affects rapid traverse power               |
| Moving mass    | 300 kg per axis              | Bigger mass → bigger motor torque          |
| Rapid traverse | 30 m/min                     | Higher speed → more motor power            |
| Spindle power  | 15 kW                        | Picks the 1PH8 spindle motor               |
| Spindle speed  | 12 000 rpm                   | Above 10 000 rpm → forced ventilation      |
| Material       | Aluminium / Steel / Titanium | Cutting force → torque                     |
| Cable length   | 7 m                          | Determines power and encoder cable lengths |
| Safety level   | Basic / Extended / Full      | Hard override on safety package            |

> ⚠ **If you skip the specs form**, the AI may pick undersized
> motors. A yellow warning appears.

---

## Step 2 — AI analysis

The app sends your description and specs to Claude (Anthropic). It
takes 8–15 seconds. Live status updates show what's happening:

> Connecting to AI… → Analysing requirements… → Selecting control
> unit… → Evaluating drive options… → Matching motors… → Validating…

If the AI needs more details, it asks 1–3 clarifying questions in
chat. Type your answer and press Enter.

> **Heads-up** — if you only picked a template and filled nothing
> else, the AI is **skipped entirely** and a built-in architecture
> for that template is used. Faster and cheaper. As soon as you fill
> any spec, the call routes through the AI so your input is heard.

---

## Step 3 — Configure

You land on a clean overview: every BOM section is collapsed by
default with an item count next to it. Click any section header to
open it, or use **Expand all** in the top-right of the BOM to fan
everything open at once.

Sections you'll see (some appear only when relevant):

| Section          | Contains                                                    |
| ---------------- | ----------------------------------------------------------- |
| Control unit     | NCU 1740/1750/1760 or PPU 1740 + spec sheet                 |
| CNC software     | Export or full-scope variant + version                      |
| Tech packages    | S41 (Operate), S42 (3-axis), S43 (5-axis), …                |
| Software options | A03 additional axes, S60/S61 safety, communication options  |
| Drive system     | Line module + motor modules with article numbers            |
| Motors           | 1FT2/1FK2/1FT7/1FK7 servo + 1PH8 spindle (per-axis MLFBs)   |
| HMI components   | Thin-client panel + MCP + handwheel                         |
| I/O modules      | PP 72/48 or ET200SP                                         |
| Safety           | Basic STO/SS1/SBC + extended (S60/S61) if applicable        |
| Cables           | DRIVE-CLiQ, motor power (sized by current), encoder, MCP    |

### Three ways to change anything

1. **Swap a single component** — click any card, browse compatible
   variants from the catalog. Dependent components (motor modules,
   line modules, cables) re-size automatically.
2. **Ask the AI in plain English** — open the *Ask AI to modify*
   pane at the top. Try "make the spindle 30 kW" or "switch to
   active line module". The AI returns a small change set, the
   app re-runs sizing on top of your existing config.
3. **Add or remove options** — use the *Add option or package*
   button inside the Software options section.

### History panel

Every change is snapshotted. The History panel at the bottom (closed
by default) lists every step. Click any entry to revert.

### What the colours mean on motor cards

- **Trunk-only badge** — the motor's catalog "trunk" is verified, but
  the encoder/brake/shaft/IP characters of its full MLFB are
  assigned at order time by your Siemens partner. Don't try to
  guess them.
- **Per-axis MLFB list** — when you specify which axes need brakes,
  each axis gets its own complete orderable MLFB shown beneath the
  motor card with a leader-line decoder showing what each suffix
  position means.

### Engineering review reminder

A yellow disclaimer banner sits below the page header. The first
time you arrive on this step you also see a one-time gating dialog
explaining that **every BOM must be reviewed by a qualified
engineer**. Click "Re-read the disclaimer" any time to see it again.

---

## Step 4 — Bill of materials

The final BOM table. Four exports:

Every line carries a **Basis** pill and the Siemens catalog it comes
from (NC63, D21.4, D32): *Catalog* means the article is listed verbatim
in the local catalog data, *Composed* is a motor trunk plus a verified
suffix, *Trunk only* means your Siemens partner assigns the suffix, and
*Order code* is a safety option ordered by its code. The same two
columns appear in the clipboard and Excel exports.

### Copy to clipboard

Tab-separated text — paste straight into Excel, email, or a ticket:

```text
Pos   MLFB                    Qty   Description
1     6FC5317-5AA00-0AA1      1     NCU 1750
2     6FC5852-1XG25-1YA0      1     CNC SW 6.25 SP1 (full scope)
…
```

### Excel (.xlsx)

Three sheets: BOM, Summary, and Notes.

### PDF

Page 1: bill of materials table + sizing notes.

Page 2: **Configuration rationale** — the new addition. Includes a
deterministic narrative of what was selected and why, your original
requirement quoted verbatim, every input parameter you entered, the
architecture decisions table, a "Selected packages & software
options" table with a *Selected for* column from the catalog, drive
and motor one-liners, per-axis MLFB suffix decoder, and any
warnings. Hand this to your Siemens partner — they can verify
line-by-line without going back to the conversation.

### Import an existing BOM

The share dialog has an **Import BOM** tab. Paste rows from Excel or
upload an .xlsx / .csv and every article number is matched against the
local catalog: control unit, software, options, drives, motors, HMI,
safety and cables. Unmatched lines are listed, never guessed, and the
result loads into step 3 where you can swap or modify as usual.

### Working on several machines

Once you have saved a configuration (step 3 → *Save*), a chip bar
appears above the wizard with one chip per saved machine. Click a chip
to switch; the work you were on is saved back first so nothing is lost.
Chips show the control unit and a count of open warnings.

### Share as text

A single text blob (markdown BOM + a base64 payload). Someone else
can paste it back into the configurator to load your exact config.
You can attach an optional one-line modification request that's
applied as soon as it's loaded.

---

## The 808D → 828D Smart converter

A separate tool at **/convert** (fourth card on the landing page). It
takes an existing **SINUMERIK 808D ADVANCED** parts list and re-selects
every line from the *"SINUMERIK 828D Smart system – Details"* catalogue.
No AI is involved in choosing products — every rule is deterministic and
every article carries the PDF page (or Siemens listing) it came from.

### Getting a list in

- **Paste from Excel** — copy the rows (article number, quantity and
  description in any column order) and press *Convert pasted rows*.
  Tab-, semicolon- and wide-space-separated text all work. Typos like
  the letter `O` instead of a zero inside an article number are repaired.
- **Read with AI** — for messy text (merged cells, quantities written as
  words, copies from a PDF or e-mail). Claude only reads the text into
  rows; product selection still goes through the rule engine.
- **Upload files** — drop one or more `.xlsx` / `.csv` files. Each file
  (or each distinct value in a *Configuration* column) becomes its own
  configuration. *Download Excel template* gives you the expected layout.

### Reading the result

Each configuration shows the 828D Smart selection grouped into CNC,
software options, feed axes, feed-axis cables, spindle, PROFINET and
other. The **Basis** pill tells you how much to trust a line:

| Pill          | Meaning                                                              |
| ------------- | -------------------------------------------------------------------- |
| PDF p.xx      | article listed verbatim in the 828D Smart PDF                        |
| Derived       | built from the PDF's motor code pattern, family verified at Siemens  |
| Outside PDF   | cable / accessory not in the PDF, number verified in Siemens listings|
| Review        | needs a manual decision                                              |
| No equivalent | not available on 828D Smart                                          |
| Superseded    | 808D item that disappears (its function is covered by another line)  |

The notes under the table cover configuration-level checks: axis and
spindle count against the 828D Smart limit of 5, V70 drive count versus
motors, missing PROFINET cords, the mandatory braking resistor for an
S200 Spindle drive, and licences carried over.

The *808D input as read* tab shows exactly what was parsed, including
lines where the quantity was assumed to be 1.

### What comes out

- **Copy as table** — tab-separated, ready for Excel.
- **Export Excel** — one sheet per configuration with source and notes;
  *Export all as Excel* adds a summary sheet across configurations.
- **Show 828D Smart catalogue** — the complete rule base the converter
  can pick from, with the page each article comes from.

Configurations stay in your browser (local storage) between visits.

---

## Frequently asked questions

### How accurate are the article numbers?

Catalog-verified for control units, drives, software, safety,
cables, HMI, and core motor trunks. The configurator never invents
MLFB suffix codes — when a motor's encoder/brake/shaft/IP positions
are catalogue-ambiguous, the BOM shows the verified trunk and a
"trunk-only" badge so you and your partner know to specify the
final characters at order time.

### Does the 808D → 828D Smart converter use AI to pick products?

No. The rule engine maps every 808D article deterministically. The only
optional AI step reads unstructured text into rows, and its output is
validated against the Siemens article-number shape before use.

### Can I trust the BOM for procurement?

No — every BOM must be **reviewed by a qualified application
engineer** first. Compatibility, safety integration, sizing,
cabling environment, EMC, ambient conditions, kinematics — none of
that is fully modelled here.

### What data does the app collect?

Anonymous prompts and AI responses are logged so the tool can
improve. Obvious identifiers (emails, customer codes, long digit
strings) are scrubbed before storage. There is a one-click opt-out
in the disclaimer dialog: *Disable anonymous telemetry on this
device*.

### My session doesn't show up in the admin tool

Most likely your browser has an ad-blocker or privacy extension
(uBlock, Privacy Badger, Brave Shields, AdGuard) blocking the
telemetry endpoint. Check the browser DevTools Network tab for
blocked POSTs.

### The AI picked the wrong motors

- Make sure you filled in the specs form. Garbage in, garbage out.
- Add specific numbers to the description: moving mass, rapid
  speed, acceleration.
- On the Configure step, swap the motor manually or ask the AI to
  modify it ("upgrade the spindle to 40 kW").

### "AI request timed out after 45 seconds"

The Anthropic API is slow right now. Click retry. If it persists:

- Check your `ANTHROPIC_API_KEY` is set (developers only).
- Check Anthropic status at
  [status.anthropic.com](https://status.anthropic.com).
- Try a shorter description.

### What does an MLFB actually look like?

Take `6SL3120-1TE21-0AD0`:

- `6SL3120` → SINAMICS S120 single Motor Module booksize.
- `1TE21` → rated current code (9 A in this case).
- `0AD0` → cooling type (D = internal air + sensor module adapter).

Paste any MLFB into [SiePortal](https://sieportal.siemens.com) to
order.

---

## Tips for the best results

### Do

- Fill in the specs form for production machines.
- Answer AI questions with numbers, not adjectives.
- Specify the workpiece material — affects cutting force and motor
  torque.
- Mention special configurations early: gantry, dual-drive axes,
  linear motors, rotary tables.

### Don't

- Use only vague descriptions ("big machine", "heavy duty").
- Skip the disclaimer — it's there because BOMs need engineering
  review.
- Order parts straight from the BOM without checking with a Siemens
  partner.

---

## Keyboard shortcuts

| Key           | Action                          |
| ------------- | ------------------------------- |
| Enter         | Send answer to AI / submit form |
| Shift + Enter | Newline in the chat input       |

---

## Where to go next

- **One-page picture of how it works** — open
  `docs/diagrams/how-it-works.html` in a browser (no install needed).

- **For developers** — see [ARCHITECTURE.md](ARCHITECTURE.md) for
  the monorepo layout, AI prompt structure, MLFB compositional
  grammar, telemetry pipeline, and admin dashboard.
- **For Siemens reference material** — the `docs/datalab-output-*`
  files contain extracted catalog text from NC63 (SINUMERIK), D21.4
  (SINAMICS), and D32 (1FK2 motors).
- **Visual workflow** — open `docs/workflow.excalidraw` in
  [excalidraw.com](https://excalidraw.com) for a one-page picture
  of the data flow.
