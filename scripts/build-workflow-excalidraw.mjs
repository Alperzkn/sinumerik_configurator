// Build docs/workflow.excalidraw from a compact source representation.
//
// Why this exists: the MCP-shorthand JSON we use during create_view
// (with `label` on shapes/arrows) isn't valid Excalidraw file format —
// excalidraw.com only renders text via separate `text` elements that
// reference their parent via `containerId`, with the parent listing the
// text in `boundElements`. This script expands the shorthand and
// stamps the boilerplate fields (angle, seed, version, ...) that the
// excalidraw.com renderer expects.
//
// Run with: node scripts/build-workflow-excalidraw.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outPath = path.join(repoRoot, "docs", "workflow.excalidraw");

// ── Source elements (compact form) ──────────────────────────────────
//
// Same shape as the MCP create_view payload. `label` on a shape adds
// auto-centered bound text. `label` on an arrow adds a midpoint label.
//
// Layout philosophy: stacked phases in a single tall canvas. Tinted
// zone backgrounds (low opacity) group the phases so the eye can scan
// the pipeline as: input → routing → fast / AI branches → parse →
// sizing engine + catalog → BOM → post-BOM lifecycle.
const source = [
  // ── Title ──────────────────────────────────────────────────────────
  { type: "text", id: "title", x: 330, y: 20, width: 480, height: 32, text: "SINUMERIK Configurator — How it works", fontSize: 24, strokeColor: "#1e1e1e" },
  { type: "text", id: "sub",   x: 220, y: 56, width: 700, height: 22, text: "AI picks the high-level design · the catalog fills in every part number", fontSize: 16, strokeColor: "#757575" },

  // ── Phase 01 · INPUT ───────────────────────────────────────────────
  { type: "rectangle", id: "z1", x: 20, y: 100, width: 1060, height: 220, backgroundColor: "#dbe4ff", strokeColor: "#4a9eed", strokeWidth: 1, opacity: 35 },
  { type: "text", id: "z1h", x: 40, y: 110, width: 320, height: 18, text: "1   ·   WHAT YOU PROVIDE", fontSize: 14, strokeColor: "#2563eb" },
  { type: "rectangle", id: "t1", x: 70,  y: 145, width: 220, height: 155, backgroundColor: "#a5d8ff", strokeColor: "#4a9eed", roundness: { type: 3 }, label: { text: "Pick a template\n\n3-axis mill · 5-axis center\nCNC lathe · mill-turn\ngrinding · laser cutting\npunching · robot cell\n\n(8 machine types)", fontSize: 13 } },
  { type: "rectangle", id: "t2", x: 310, y: 145, width: 220, height: 155, backgroundColor: "#a5d8ff", strokeColor: "#4a9eed", roundness: { type: 3 }, label: { text: "Or describe it freely\n\n\"Gantry mill, 3 m × 2 m,\naerospace parts,\n24 000 rpm spindle…\"\n\nUseful when no template fits", fontSize: 13 } },
  { type: "rectangle", id: "t3", x: 550, y: 145, width: 510, height: 155, backgroundColor: "#a5d8ff", strokeColor: "#4a9eed", roundness: { type: 3 }, label: { text: "Add your machine specs (every field is optional)\n\nspindle power & speed   ·   moving mass   ·   rapid traverse   ·   axis travel\nworkpiece material   ·   machine size class   ·   safety level\nhandheld terminal   ·   I/O module   ·   preferred cable length", fontSize: 13 } },

  // ── Phase 02 · ROUTING ─────────────────────────────────────────────
  { type: "diamond", id: "d1", x: 420, y: 360, width: 260, height: 100, backgroundColor: "#fff3bf", strokeColor: "#f59e0b", label: { text: "Did you fill in any\nspecs or notes?", fontSize: 16 } },
  { type: "arrow", id: "a1", x: 180, y: 300, width: 290, height: 60, points: [[0, 0], [290, 60]], endArrowhead: "arrow", startBinding: { elementId: "t1", focus: 0, gap: 1 }, endBinding: { elementId: "d1", focus: 0, gap: 1 } },
  { type: "arrow", id: "a2", x: 420, y: 300, width: 130, height: 60, points: [[0, 0], [130, 60]], endArrowhead: "arrow", startBinding: { elementId: "t2", focus: 0, gap: 1 }, endBinding: { elementId: "d1", focus: 0, gap: 1 } },
  { type: "arrow", id: "a3", x: 800, y: 300, width: -250, height: 60, points: [[0, 0], [-250, 60]], endArrowhead: "arrow", startBinding: { elementId: "t3", focus: 0, gap: 1 }, endBinding: { elementId: "d1", focus: 0, gap: 1 } },

  // ── Phase 02a · FAST PATH ──────────────────────────────────────────
  { type: "rectangle", id: "z2a", x: 20, y: 500, width: 510, height: 200, backgroundColor: "#d3f9d8", strokeColor: "#22c55e", strokeWidth: 1, opacity: 35 },
  { type: "text", id: "z2ah", x: 40, y: 510, width: 360, height: 18, text: "2A   ·   FAST PATH (template only)", fontSize: 14, strokeColor: "#15803d" },
  { type: "rectangle", id: "b1", x: 60, y: 545, width: 430, height: 140, backgroundColor: "#b2f2bb", strokeColor: "#22c55e", roundness: { type: 3 }, label: { text: "Use the template's preset design\n\nEvery template ships with a tested\ndefault: control unit, packages,\nsafety level, and operator panel size.\n\nNo AI call — same result every time.", fontSize: 14 } },
  { type: "arrow", id: "a4", x: 440, y: 460, width: -180, height: 85, points: [[0, 0], [-180, 85]], endArrowhead: "arrow", strokeColor: "#22c55e", label: { text: "no", fontSize: 14 }, startBinding: { elementId: "d1", focus: 0, gap: 1 }, endBinding: { elementId: "b1", focus: 0, gap: 1 } },

  // ── Phase 02b · AI PATH ────────────────────────────────────────────
  { type: "rectangle", id: "z2b", x: 560, y: 500, width: 520, height: 200, backgroundColor: "#e5dbff", strokeColor: "#8b5cf6", strokeWidth: 1, opacity: 35 },
  { type: "text", id: "z2bh", x: 580, y: 510, width: 320, height: 18, text: "2B   ·   AI PATH (your specs are considered)", fontSize: 14, strokeColor: "#7c3aed" },
  { type: "rectangle", id: "ai1", x: 580, y: 545, width: 150, height: 90, backgroundColor: "#d0bfff", strokeColor: "#8b5cf6", roundness: { type: 3 }, label: { text: "Build the request\n\ndomain rules\n+ your inputs", fontSize: 13 } },
  { type: "rectangle", id: "ai2", x: 750, y: 545, width: 150, height: 90, backgroundColor: "#d0bfff", strokeColor: "#8b5cf6", roundness: { type: 3 }, label: { text: "Send to AI\n\n(Claude — picks\nthe high-level design)", fontSize: 13 } },
  { type: "rectangle", id: "ai3", x: 920, y: 545, width: 150, height: 90, backgroundColor: "#d0bfff", strokeColor: "#8b5cf6", roundness: { type: 3 }, label: { text: "AI returns\nthe design plan\n\ncontrol unit · packages\nsafety · drive family", fontSize: 13 } },
  { type: "arrow", id: "ai_a1", x: 730, y: 590, width: 20, height: 0, points: [[0, 0], [20, 0]], endArrowhead: "arrow", strokeColor: "#8b5cf6", startBinding: { elementId: "ai1", focus: 0, gap: 1 }, endBinding: { elementId: "ai2", focus: 0, gap: 1 } },
  { type: "arrow", id: "ai_a2", x: 900, y: 590, width: 20, height: 0, points: [[0, 0], [20, 0]], endArrowhead: "arrow", strokeColor: "#8b5cf6", startBinding: { elementId: "ai2", focus: 0, gap: 1 }, endBinding: { elementId: "ai3", focus: 0, gap: 1 } },
  { type: "text", id: "ai_note", x: 590, y: 660, width: 470, height: 22, text: "The AI never invents part numbers — only the design plan", fontSize: 13, strokeColor: "#7c3aed" },
  { type: "arrow", id: "a5", x: 660, y: 460, width: -5, height: 85, points: [[0, 0], [-5, 85]], endArrowhead: "arrow", strokeColor: "#8b5cf6", label: { text: "yes", fontSize: 14 }, startBinding: { elementId: "d1", focus: 0, gap: 1 }, endBinding: { elementId: "ai1", focus: 0, gap: 1 } },

  // ── Phase 03 · Translate to a real config ─────────────────────────
  { type: "rectangle", id: "pp", x: 330, y: 730, width: 440, height: 90, backgroundColor: "#fff3bf", strokeColor: "#f59e0b", strokeWidth: 2, roundness: { type: 3 }, label: { text: "3   ·   Translate the design plan\ninto a real configuration\n(your safety choice always wins)", fontSize: 14 } },
  { type: "arrow", id: "a6", x: 275, y: 685, width: 175, height: 50, points: [[0, 0], [175, 50]], endArrowhead: "arrow", strokeColor: "#22c55e", startBinding: { elementId: "b1", focus: 0, gap: 1 }, endBinding: { elementId: "pp", focus: 0, gap: 1 } },
  { type: "arrow", id: "a7", x: 995, y: 635, width: -345, height: 95, points: [[0, 0], [-345, 95]], endArrowhead: "arrow", strokeColor: "#8b5cf6", startBinding: { elementId: "ai3", focus: 0, gap: 1 }, endBinding: { elementId: "pp", focus: 0, gap: 1 } },

  // ── Phase 04 · COMPONENT SELECTION ────────────────────────────────
  { type: "rectangle", id: "z4", x: 20, y: 860, width: 720, height: 460, backgroundColor: "#ffeacc", strokeColor: "#9a5030", strokeWidth: 1, opacity: 35 },
  { type: "text", id: "z4h", x: 40, y: 870, width: 480, height: 18, text: "4   ·   COMPONENT SELECTION (rule-based, deterministic)", fontSize: 14, strokeColor: "#9a5030" },
  { type: "rectangle", id: "sz1", x: 60, y: 905, width: 660, height: 60, backgroundColor: "#ffd8a8", strokeColor: "#9a5030", roundness: { type: 3 }, label: { text: "Pick the spindle motor that meets your kW & RPM", fontSize: 14 } },
  { type: "rectangle", id: "sz2", x: 60, y: 975, width: 660, height: 60, backgroundColor: "#ffd8a8", strokeColor: "#9a5030", roundness: { type: 3 }, label: { text: "Pick feed-axis motors based on moving mass and rapid traverse", fontSize: 14 } },
  { type: "rectangle", id: "sz3", x: 60, y: 1045, width: 660, height: 60, backgroundColor: "#ffd8a8", strokeColor: "#9a5030", roundness: { type: 3 }, label: { text: "Match each motor with its drive module", fontSize: 14 } },
  { type: "rectangle", id: "sz4", x: 60, y: 1115, width: 660, height: 60, backgroundColor: "#ffd8a8", strokeColor: "#9a5030", roundness: { type: 3 }, label: { text: "Size the line module that powers all motors together", fontSize: 14 } },
  { type: "rectangle", id: "sz5", x: 60, y: 1185, width: 660, height: 60, backgroundColor: "#ffd8a8", strokeColor: "#9a5030", roundness: { type: 3 }, label: { text: "Choose power, signal, and DRIVE-CLiQ cables of the right size and length", fontSize: 13 } },
  { type: "rectangle", id: "sz6", x: 60, y: 1255, width: 660, height: 50, backgroundColor: "#ffd8a8", strokeColor: "#9a5030", roundness: { type: 3 }, label: { text: "Pair the operator panel + MCP, add handheld / I/O / safety hardware", fontSize: 13 } },
  { type: "arrow", id: "a8", x: 460, y: 825, width: -70, height: 80, points: [[0, 0], [-70, 80]], endArrowhead: "arrow", strokeColor: "#9a5030", strokeWidth: 2, startBinding: { elementId: "pp", focus: 0, gap: 1 }, endBinding: { elementId: "sz1", focus: 0, gap: 1 } },

  // ── Phase 05 · CATALOG ────────────────────────────────────────────
  { type: "rectangle", id: "z5", x: 760, y: 860, width: 320, height: 460, backgroundColor: "#c3fae8", strokeColor: "#0891b2", strokeWidth: 1, opacity: 35 },
  { type: "text", id: "z5h", x: 780, y: 870, width: 300, height: 18, text: "5   ·   CATALOG DATA", fontSize: 14, strokeColor: "#0891b2" },
  { type: "rectangle", id: "cat1", x: 790, y: 905, width: 270, height: 50, backgroundColor: "#c3fae8", strokeColor: "#0891b2", roundness: { type: 3 }, label: { text: "Motor catalog (16 series)", fontSize: 13 } },
  { type: "rectangle", id: "cat2", x: 790, y: 965, width: 270, height: 50, backgroundColor: "#c3fae8", strokeColor: "#0891b2", roundness: { type: 3 }, label: { text: "Motor variants (~130 models)", fontSize: 13 } },
  { type: "rectangle", id: "cat3", x: 790, y: 1025, width: 270, height: 50, backgroundColor: "#c3fae8", strokeColor: "#0891b2", roundness: { type: 3 }, label: { text: "Cable catalog", fontSize: 13 } },
  { type: "rectangle", id: "cat4", x: 790, y: 1085, width: 270, height: 50, backgroundColor: "#c3fae8", strokeColor: "#0891b2", roundness: { type: 3 }, label: { text: "Operator panel & MCP catalog", fontSize: 13 } },
  { type: "rectangle", id: "cat5", x: 790, y: 1145, width: 270, height: 50, backgroundColor: "#c3fae8", strokeColor: "#0891b2", roundness: { type: 3 }, label: { text: "Safety functions catalog", fontSize: 13 } },
  { type: "rectangle", id: "cat6", x: 790, y: 1205, width: 270, height: 50, backgroundColor: "#c3fae8", strokeColor: "#0891b2", roundness: { type: 3 }, label: { text: "Software options catalog", fontSize: 13 } },
  { type: "rectangle", id: "cat7", x: 790, y: 1265, width: 270, height: 50, backgroundColor: "#c3fae8", strokeColor: "#0891b2", roundness: { type: 3 }, label: { text: "Technology packages catalog", fontSize: 13 } },

  // Catalog → sizing read arrows
  { type: "arrow", id: "ca1", x: 790, y: 930, width: -70, height: 0, points: [[0, 0], [-70, 0]], endArrowhead: "arrow", strokeColor: "#0891b2", strokeWidth: 1 },
  { type: "arrow", id: "ca2", x: 790, y: 990, width: -70, height: 0, points: [[0, 0], [-70, 0]], endArrowhead: "arrow", strokeColor: "#0891b2", strokeWidth: 1, label: { text: "look up", fontSize: 11 } },
  { type: "arrow", id: "ca3", x: 790, y: 1145, width: -70, height: 70, points: [[0, 0], [-70, 70]], endArrowhead: "arrow", strokeColor: "#0891b2", strokeWidth: 1 },
  { type: "arrow", id: "ca4", x: 790, y: 1210, width: -70, height: 70, points: [[0, 0], [-70, 70]], endArrowhead: "arrow", strokeColor: "#0891b2", strokeWidth: 1 },

  // ── Phase 06 · BOM OUTPUT ──────────────────────────────────────────
  { type: "rectangle", id: "bom", x: 340, y: 1370, width: 420, height: 80, backgroundColor: "#b2f2bb", strokeColor: "#15803d", strokeWidth: 3, roundness: { type: 3 }, label: { text: "Bill of materials   ·   real Siemens part numbers   ·   quantities", fontSize: 18 } },
  { type: "arrow", id: "a9", x: 380, y: 1305, width: 175, height: 65, points: [[0, 0], [175, 65]], endArrowhead: "arrow", strokeColor: "#15803d", strokeWidth: 2, startBinding: { elementId: "sz6", focus: 0, gap: 1 }, endBinding: { elementId: "bom", focus: 0, gap: 1 } },

  // ── Phase 07 · POST-BOM LIFECYCLE ──────────────────────────────────
  { type: "rectangle", id: "z7", x: 20, y: 1495, width: 1060, height: 200, backgroundColor: "#e5dbff", strokeColor: "#9333ea", strokeWidth: 1, opacity: 30 },
  { type: "text", id: "z7h", x: 40, y: 1505, width: 480, height: 18, text: "6   ·   WHAT YOU CAN DO WITH THE BOM", fontSize: 14, strokeColor: "#9333ea" },
  { type: "rectangle", id: "lc1", x: 50,  y: 1540, width: 195, height: 130, backgroundColor: "#eebefa", strokeColor: "#9333ea", roundness: { type: 3 }, label: { text: "Swap a component\n\nReplace any motor,\ndrive, or panel —\ndependent parts\nresize automatically.", fontSize: 13 } },
  { type: "rectangle", id: "lc2", x: 260, y: 1540, width: 195, height: 130, backgroundColor: "#eebefa", strokeColor: "#9333ea", roundness: { type: 3 }, label: { text: "Ask AI to change it\n\n\"Make the spindle\n40 kW.\"\n\nThe AI returns the\nchange and the engine\napplies it.", fontSize: 13 } },
  { type: "rectangle", id: "lc3", x: 470, y: 1540, width: 195, height: 130, backgroundColor: "#eebefa", strokeColor: "#9333ea", roundness: { type: 3 }, label: { text: "Share as text\n\nCopy a single message —\nanyone can paste it back\nto load the exact\nconfiguration.", fontSize: 13 } },
  { type: "rectangle", id: "lc4", x: 680, y: 1540, width: 195, height: 130, backgroundColor: "#eebefa", strokeColor: "#9333ea", roundness: { type: 3 }, label: { text: "Change history\n\nEvery change is saved.\nRevert to any earlier\nversion with one click.", fontSize: 13 } },
  { type: "rectangle", id: "lc5", x: 890, y: 1540, width: 175, height: 130, backgroundColor: "#eebefa", strokeColor: "#9333ea", roundness: { type: 3 }, label: { text: "Export\n\nClipboard\nExcel\nPDF\nJSON file", fontSize: 13 } },
  { type: "arrow", id: "la1", x: 460, y: 1450, width: -310, height: 90, points: [[0, 0], [-310, 90]], endArrowhead: "arrow", strokeColor: "#9333ea", strokeWidth: 1, startBinding: { elementId: "bom", focus: 0, gap: 1 }, endBinding: { elementId: "lc1", focus: 0, gap: 1 } },
  { type: "arrow", id: "la2", x: 500, y: 1450, width: -140, height: 90, points: [[0, 0], [-140, 90]], endArrowhead: "arrow", strokeColor: "#9333ea", strokeWidth: 1, startBinding: { elementId: "bom", focus: 0, gap: 1 }, endBinding: { elementId: "lc2", focus: 0, gap: 1 } },
  { type: "arrow", id: "la3", x: 550, y: 1450, width: 20,   height: 90, points: [[0, 0], [20, 90]],   endArrowhead: "arrow", strokeColor: "#9333ea", strokeWidth: 1, startBinding: { elementId: "bom", focus: 0, gap: 1 }, endBinding: { elementId: "lc3", focus: 0, gap: 1 } },
  { type: "arrow", id: "la4", x: 600, y: 1450, width: 180,  height: 90, points: [[0, 0], [180, 90]],  endArrowhead: "arrow", strokeColor: "#9333ea", strokeWidth: 1, startBinding: { elementId: "bom", focus: 0, gap: 1 }, endBinding: { elementId: "lc4", focus: 0, gap: 1 } },
  { type: "arrow", id: "la5", x: 640, y: 1450, width: 340,  height: 90, points: [[0, 0], [340, 90]],  endArrowhead: "arrow", strokeColor: "#9333ea", strokeWidth: 1, startBinding: { elementId: "bom", focus: 0, gap: 1 }, endBinding: { elementId: "lc5", focus: 0, gap: 1 } },
];

// ── Build proper Excalidraw elements ────────────────────────────────

// Stable pseudo-random from id so the file is deterministic across runs.
const seedFor = (id) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

const baseDefaults = (id) => ({
  angle: 0,
  fillStyle: "solid",
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: null,
  seed: seedFor(id),
  version: 1,
  versionNonce: seedFor(id) ^ 0x5a5a,
  isDeleted: false,
  boundElements: [],
  updated: 1700000000000,
  link: null,
  locked: false,
});

const out = [];
const labelFor = new Map(); // containerId -> { textId, label, isArrow }

for (const el of source) {
  const { label, ...rest } = el;

  if (rest.type === "text") {
    out.push({
      ...baseDefaults(rest.id),
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      strokeWidth: 1,
      fontFamily: 1,
      textAlign: "left",
      verticalAlign: "top",
      lineHeight: 1.25,
      originalText: rest.text,
      ...rest,
    });
    continue;
  }

  if (rest.type === "arrow") {
    const arrow = {
      ...baseDefaults(rest.id),
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      strokeWidth: 2,
      startArrowhead: null,
      lastCommittedPoint: null,
      ...rest,
    };
    if (label) {
      const textId = `${rest.id}-label`;
      arrow.boundElements = [{ type: "text", id: textId }];
      labelFor.set(rest.id, { textId, label, isArrow: true });
    }
    out.push(arrow);
    continue;
  }

  // rectangle / ellipse / diamond
  const shape = {
    ...baseDefaults(rest.id),
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    strokeWidth: 2,
    ...rest,
  };
  if (label) {
    const textId = `${rest.id}-label`;
    shape.boundElements = [{ type: "text", id: textId }];
    labelFor.set(rest.id, { textId, label, isArrow: false });
  }
  out.push(shape);
}

// Append the bound text elements after their containers.
for (const el of source) {
  const entry = labelFor.get(el.id);
  if (!entry) continue;
  const { textId, label, isArrow } = entry;
  let tx, ty, tw, th;
  if (isArrow) {
    const mx = el.x + el.width / 2;
    const my = el.y + el.height / 2;
    const fontSize = label.fontSize ?? 16;
    const approxW = Math.max(40, label.text.length * fontSize * 0.6);
    const approxH = fontSize * 1.5;
    tx = mx - approxW / 2;
    ty = my - approxH / 2;
    tw = approxW;
    th = approxH;
  } else {
    tx = el.x;
    ty = el.y;
    tw = el.width;
    th = el.height;
  }

  out.push({
    ...baseDefaults(textId),
    type: "text",
    id: textId,
    x: tx,
    y: ty,
    width: tw,
    height: th,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    strokeWidth: 1,
    text: label.text,
    fontSize: label.fontSize ?? 16,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: el.id,
    originalText: label.text,
    lineHeight: 1.25,
  });
}

const file = {
  type: "excalidraw",
  version: 2,
  source: "sinumerik-configurator",
  elements: out,
  appState: {
    viewBackgroundColor: "#ffffff",
    gridSize: null,
  },
  files: {},
};

fs.writeFileSync(outPath, JSON.stringify(file, null, 2) + "\n");
console.log(`Wrote ${outPath} — ${out.length} elements`);
