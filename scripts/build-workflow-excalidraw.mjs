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
const source = [
  { type: "text", id: "title", x: 140, y: 12, width: 480, height: 30, text: "SINUMERIK Configurator — Workflow", fontSize: 24, strokeColor: "#1e1e1e" },
  { type: "text", id: "sub", x: 230, y: 46, width: 360, height: 22, text: "AI plans, rule-based code picks the MLFBs", fontSize: 16, strokeColor: "#757575" },
  { type: "text", id: "inplabel", x: 15, y: 68, width: 90, height: 18, text: "User input", fontSize: 14, strokeColor: "#2563eb" },

  { type: "rectangle", id: "t1", x: 30,  y: 90,  width: 180, height: 95, backgroundColor: "#a5d8ff", strokeColor: "#4a9eed", roundness: { type: 3 }, label: { text: "Template\n(8 machine types)", fontSize: 18 } },
  { type: "rectangle", id: "t2", x: 230, y: 90,  width: 180, height: 95, backgroundColor: "#a5d8ff", strokeColor: "#4a9eed", roundness: { type: 3 }, label: { text: "Description\n(free text)", fontSize: 18 } },
  { type: "rectangle", id: "t3", x: 430, y: 90,  width: 180, height: 95, backgroundColor: "#a5d8ff", strokeColor: "#4a9eed", roundness: { type: 3 }, label: { text: "Mechanical specs\n(optional)", fontSize: 18 } },

  { type: "diamond", id: "d1", x: 290, y: 230, width: 240, height: 95, backgroundColor: "#fff3bf", strokeColor: "#f59e0b", label: { text: "Specs filled\nor custom text?", fontSize: 18 } },

  { type: "arrow", id: "a1", x: 120, y: 185, width: 260, height: 45, points: [[0, 0], [260, 45]], endArrowhead: "arrow", startBinding: { elementId: "t1", focus: 0, gap: 1 }, endBinding: { elementId: "d1", focus: 0, gap: 1 } },
  { type: "arrow", id: "a2", x: 320, y: 185, width: 90,  height: 45, points: [[0, 0], [90, 45]],  endArrowhead: "arrow", startBinding: { elementId: "t2", focus: 0, gap: 1 }, endBinding: { elementId: "d1", focus: 0, gap: 1 } },
  { type: "arrow", id: "a3", x: 520, y: 185, width: -80, height: 45, points: [[0, 0], [-80, 45]], endArrowhead: "arrow", startBinding: { elementId: "t3", focus: 0, gap: 1 }, endBinding: { elementId: "d1", focus: 0, gap: 1 } },

  { type: "rectangle", id: "b1", x: 50,  y: 380, width: 210, height: 100, backgroundColor: "#b2f2bb", strokeColor: "#22c55e", roundness: { type: 3 }, label: { text: "Fast path\n(canned architecture\nfor template)", fontSize: 18 } },
  { type: "arrow", id: "a4", x: 290, y: 277, width: -130, height: 103, points: [[0, 0], [-130, 103]], endArrowhead: "arrow", strokeColor: "#22c55e", startBinding: { elementId: "d1", focus: 0, gap: 1 }, endBinding: { elementId: "b1", focus: 0, gap: 1 }, label: { text: "no", fontSize: 16 } },

  { type: "rectangle", id: "b2", x: 560, y: 380, width: 210, height: 100, backgroundColor: "#d0bfff", strokeColor: "#8b5cf6", roundness: { type: 3 }, label: { text: "AI flow\n(architecture JSON\nonly, no MLFBs)", fontSize: 18 } },
  { type: "arrow", id: "a5", x: 530, y: 277, width: 135, height: 103, points: [[0, 0], [135, 103]], endArrowhead: "arrow", strokeColor: "#8b5cf6", startBinding: { elementId: "d1", focus: 0, gap: 1 }, endBinding: { elementId: "b2", focus: 0, gap: 1 }, label: { text: "yes", fontSize: 16 } },

  { type: "rectangle", id: "e1", x: 290, y: 540, width: 240, height: 100, backgroundColor: "#ffd8a8", strokeColor: "#9a5030", roundness: { type: 3 }, label: { text: "Sizing engine\n(rule-based,\ndeterministic)", fontSize: 18 } },
  { type: "arrow", id: "a6", x: 260, y: 480, width: 150, height: 60, points: [[0, 0], [150, 60]], endArrowhead: "arrow", strokeColor: "#22c55e", startBinding: { elementId: "b1", focus: 0, gap: 1 }, endBinding: { elementId: "e1", focus: 0, gap: 1 } },
  { type: "arrow", id: "a7", x: 560, y: 480, width: -150, height: 60, points: [[0, 0], [-150, 60]], endArrowhead: "arrow", strokeColor: "#8b5cf6", startBinding: { elementId: "b2", focus: 0, gap: 1 }, endBinding: { elementId: "e1", focus: 0, gap: 1 } },

  { type: "rectangle", id: "c1", x: 600, y: 540, width: 200, height: 100, backgroundColor: "#c3fae8", strokeColor: "#0891b2", roundness: { type: 3 }, label: { text: "Catalog\nmotors / drives /\ncables / safety", fontSize: 18 } },
  { type: "arrow", id: "a8", x: 600, y: 590, width: -70, height: 0, points: [[0, 0], [-70, 0]], endArrowhead: "arrow", strokeColor: "#0891b2", startBinding: { elementId: "c1", focus: 0, gap: 1 }, endBinding: { elementId: "e1", focus: 0, gap: 1 }, label: { text: "reads", fontSize: 14 } },

  { type: "rectangle", id: "bo1", x: 290, y: 700, width: 240, height: 85, backgroundColor: "#b2f2bb", strokeColor: "#15803d", strokeWidth: 3, roundness: { type: 3 }, label: { text: "Bill of materials\nwith real MLFBs", fontSize: 20 } },
  { type: "arrow", id: "a9", x: 410, y: 640, width: 0, height: 60, points: [[0, 0], [0, 60]], endArrowhead: "arrow", startBinding: { elementId: "e1", focus: 0, gap: 1 }, endBinding: { elementId: "bo1", focus: 0, gap: 1 } },

  { type: "rectangle", id: "ac1", x: 35,  y: 840, width: 175, height: 70, backgroundColor: "#eebefa", strokeColor: "#9333ea", roundness: { type: 3 }, label: { text: "Swap component", fontSize: 18 } },
  { type: "rectangle", id: "ac2", x: 225, y: 840, width: 175, height: 70, backgroundColor: "#eebefa", strokeColor: "#9333ea", roundness: { type: 3 }, label: { text: "AI modify", fontSize: 18 } },
  { type: "rectangle", id: "ac3", x: 415, y: 840, width: 175, height: 70, backgroundColor: "#eebefa", strokeColor: "#9333ea", roundness: { type: 3 }, label: { text: "Share as text", fontSize: 18 } },
  { type: "rectangle", id: "ac4", x: 605, y: 840, width: 175, height: 70, backgroundColor: "#eebefa", strokeColor: "#9333ea", roundness: { type: 3 }, label: { text: "Export PDF / Excel", fontSize: 18 } },

  { type: "arrow", id: "a10", x: 340, y: 785, width: -220, height: 55, points: [[0, 0], [-220, 55]], endArrowhead: "arrow", strokeColor: "#9333ea", strokeWidth: 1, startBinding: { elementId: "bo1", focus: 0, gap: 1 }, endBinding: { elementId: "ac1", focus: 0, gap: 1 } },
  { type: "arrow", id: "a11", x: 380, y: 785, width: -70,  height: 55, points: [[0, 0], [-70, 55]],  endArrowhead: "arrow", strokeColor: "#9333ea", strokeWidth: 1, startBinding: { elementId: "bo1", focus: 0, gap: 1 }, endBinding: { elementId: "ac2", focus: 0, gap: 1 } },
  { type: "arrow", id: "a12", x: 440, y: 785, width: 60,   height: 55, points: [[0, 0], [60, 55]],   endArrowhead: "arrow", strokeColor: "#9333ea", strokeWidth: 1, startBinding: { elementId: "bo1", focus: 0, gap: 1 }, endBinding: { elementId: "ac3", focus: 0, gap: 1 } },
  { type: "arrow", id: "a13", x: 480, y: 785, width: 210,  height: 55, points: [[0, 0], [210, 55]],  endArrowhead: "arrow", strokeColor: "#9333ea", strokeWidth: 1, startBinding: { elementId: "bo1", focus: 0, gap: 1 }, endBinding: { elementId: "ac4", focus: 0, gap: 1 } },
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
const labelFor = new Map(); // containerId -> { textId, label, textColor }

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
  // For shapes: text fills the container's bounds (Excalidraw centers).
  // For arrows: place text at midpoint with reasonable bounds.
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
