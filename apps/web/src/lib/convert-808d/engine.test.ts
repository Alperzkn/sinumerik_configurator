/**
 * Self-running test for the 808D → 828D Smart mapping engine. Run with:
 *
 *   npx tsx apps/web/src/lib/convert-808d/engine.test.ts
 */
import assert from "node:assert/strict";
import { convert, isSelectedLine, needsReview } from "./engine";
import { parseText } from "./parser";
import type { InputRow, ResultLine } from "./types";
import { EXAMPLE_808D_TEXT as EXAMPLE } from "./example";

let pass = 0;
const t = (name: string, fn: () => void) => {
  try {
    fn();
    pass++;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (e) {
    process.stderr.write(`  ✗ ${name}\n    ${(e as Error).message}\n`);
    process.exit(1);
  }
};

const row = (mlfb: string, qty = 1, desc = ""): InputRow => ({ mlfb, qty, qtyAssumed: false, desc });
const find = (lines: ResultLine[], mlfb: string) => lines.find((l) => l.mlfb === mlfb);
const all = (lines: ResultLine[], mlfb: string) => lines.filter((l) => l.mlfb === mlfb);

console.log("808D → 828D Smart engine — example gantry mill");
const ex = convert(parseText(EXAMPLE).rows);

t("detects milling + horizontal from the PPU article", () => {
  assert.equal(ex.tech, "M");
  assert.equal(ex.orient, "H");
});

t("PPU → 828D Smart PPU 261.5 + milling SD card, ordered first", () => {
  assert.equal(ex.lines[0].mlfb, "6FC5370-2AA50-0AA0");
  assert.equal(ex.lines[1].mlfb, "6FC5835-2GY50-0YA0");
  assert.equal(ex.lines[2].mlfb, "6FC5303-0AF32-1AA1");
  assert.equal(ex.lines[0].cls, "pdf");
});

t("1FL6 motors → derived 1FL2 codes with brake/shaft digits", () => {
  const m1 = find(ex.lines, "1FL2306-2AC11-1MB0"); // 1 kW, brake, key
  const m2 = find(ex.lines, "1FL2306-4AC01-1MB0"); // 1.5 kW, no brake, key
  assert.ok(m1 && m2);
  assert.equal(m1.qty, 1);
  assert.equal(m2.qty, 3);
  assert.equal(m1.cls, "derived");
  assert.match(m1.desc, /WITH holding brake/);
  assert.match(m2.desc, /without brake/);
});

t("each 1FL6 line generates a matching S200 drive line", () => {
  assert.equal(find(ex.lines, "6SL5510-1BE11-0AF0-Z T80")?.qty, 1);
  assert.equal(find(ex.lines, "6SL5510-1BE11-5AF0-Z T80")?.qty, 3);
});

t("V70 drives are superseded, not counted", () => {
  const v70 = ex.lines.filter((l) => l.cls === "replaced" && /V70/.test(l.desc));
  assert.equal(v70.length, 2);
  assert.ok(v70.every((l) => !isSelectedLine(l)));
});

t("options: 0AK80 aliases to 0AC30, known keys pass through", () => {
  assert.equal(find(ex.lines, "6FC5800-0AC30-0YH0")?.cls, "pdf");
  assert.ok(find(ex.lines, "6FC5800-0AS51-0YH0"));
  assert.ok(find(ex.lines, "6FC5800-0AM08-0YH0"));
});

t("V70 bus cables → nearest PROFINET cord at or above the length", () => {
  assert.equal(find(ex.lines, "6XV1870-3QE50")?.qty, 3); // 0.35 m → 0.5 m
  assert.equal(find(ex.lines, "6XV1870-3QH30")?.qty, 1); // 3 m
});

t("1FL6 cables → MOTION-CONNECT 350, unverified lengths flagged for review", () => {
  const enc = find(ex.lines, "6FX3502-2XB12-1BF0");
  const pwr = find(ex.lines, "6FX3502-5CL02-1BF0");
  const brk = find(ex.lines, "6FX3502-5BL03-1BF0");
  assert.equal(enc?.cls, "verified");
  assert.equal(pwr?.cls, "review");
  assert.equal(brk?.cls, "review");
});

t("analog spindle setpoint cable is superseded and counts as one spindle", () => {
  const sp = ex.lines.find((l) => /Analog spindle setpoint/.test(l.desc));
  assert.equal(sp?.cls, "replaced");
  assert.equal(ex.axes, 5); // 4 feed + 1 analog spindle
  assert.ok(!ex.notes.some(([k]) => k === "crit"));
});

t("lines are grouped in display order", () => {
  const groups = ex.lines.map((l) => l.grp);
  const order = ["CNC", "Software options", "Feed axes", "Feed-axis cables", "Spindle", "PROFINET", "Other"];
  let last = -1;
  for (const g of groups) {
    const i = order.indexOf(g);
    assert.ok(i >= last, `group ${g} out of order`);
    last = i;
  }
});

t("no V70-count mismatch warning when drives match motors", () => {
  assert.ok(!ex.notes.some(([, txt]) => /V70 drives but/.test(txt)));
});

console.log("\n808D → 828D Smart engine — edge cases");

t("vertical PPU + turning picks PPU 260.5 and the turning SD card", () => {
  const r = convert([row("6FC5370-2BT03-0AA0"), row("6FC5303-0AF35-0AA0")]);
  assert.equal(r.tech, "T");
  assert.equal(r.orient, "V");
  assert.equal(r.lines[0].mlfb, "6FC5370-3AA50-0AA0");
  assert.equal(r.lines[1].mlfb, "6FC5835-1GY50-0YA0");
  assert.equal(r.lines[2].mlfb, "6FC5303-0AF33-1AA1");
});

t("technology guessed from descriptions when the PPU is unknown", () => {
  const r = convert([row("6FC5370-1AT03-0AA0", 1, "808D basic PPU"), row("1FL6064-1AC61-2AA1", 1, "lathe X axis")]);
  assert.equal(r.tech, "T");
});

t("missing technology falls back to milling with a warning", () => {
  const r = convert([row("6FC5370-9XX99-0AA0")]);
  assert.equal(r.tech, "M");
  assert.ok(r.notes.some(([k, txt]) => k === "warn" && /milling SD card selected/.test(txt)));
});

t("missing PPU produces a warning", () => {
  const r = convert([row("1FL6064-1AC61-2AA1")]);
  assert.ok(r.notes.some(([k, txt]) => k === "warn" && /No 808D PPU/.test(txt)));
});

t("more than 5 axes triggers a critical note", () => {
  const r = convert([row("1FL6064-1AC61-2AA1", 6)]);
  assert.equal(r.axes, 6);
  assert.ok(r.notes.some(([k]) => k === "crit"));
});

t("V70 count mismatch is reported", () => {
  const r = convert([row("1FL6064-1AC61-2AA1", 2), row("6SL3210-5DE16-0UA0", 3)]);
  assert.ok(r.notes.some(([k, txt]) => k === "warn" && /3 V70 drives but 2 motors/.test(txt)));
});

t("PROFINET note appears when drives exist but no cords were listed", () => {
  const r = convert([row("1FL6064-1AC61-2AA1", 3)]);
  assert.ok(r.notes.some(([, txt]) => /2 cord\(s\) S200 → S200/.test(txt)));
});

t("known 1PH1 spindle → 1PH3 Pro TTL + S200 Spindle + braking resistor", () => {
  const r = convert([row("1PH1103-1LD12-0GA0", 1, "808D spindle motor")]);
  const motor = find(r.lines, "1PH3103-1LD12-0GA1");
  assert.ok(motor, "expected derived 1PH3103 TTL plain-shaft code");
  assert.equal(motor.cls, "derived");
  assert.ok(find(r.lines, "6SL5510-1EE13-7AF0"));
  assert.ok(find(r.lines, "3rd party"));
  assert.equal(r.axes, 1);
});

t("1PH1 with feather key picks shaft digit 2", () => {
  const r = convert([row("1PH1103-1LD12-1GA0")]);
  assert.ok(find(r.lines, "1PH3103-1LD12-2GA1"));
});

t("unknown 1PH1 with kW in the description matches the 1PH3 table", () => {
  const r = convert([row("1PH1105-1XX12-0GA0", 1, "spindle 7.5 kW 2000 rpm")]);
  // 7.5 kW, 2000 rpm, TTL preferred → 1PH3105-1LG12-0GA1
  assert.ok(find(r.lines, "1PH3105-1LG12-0GA1"));
});

t("unknown 1PH1 without power data asks for manual selection", () => {
  const r = convert([row("1PH1999-1XX12-0GA0")]);
  assert.ok(find(r.lines, "1PH3 Pro – select"));
  assert.ok(find(r.lines, "S200 Spindle – select"));
  assert.ok(find(r.lines, "3rd party"));
});

t("PDF-listed 1PH3 Pro pasted directly is kept with the pdf basis", () => {
  const r = convert([row("1PH3105-1HG12-0KA1")]);
  const m = find(r.lines, "1PH3105-1HG12-0KA1");
  assert.equal(m?.cls, "pdf");
  assert.ok(find(r.lines, "6SL5510-1EE17-5AF0"));
});

t("S120-style 1PH3 (DRIVE-CLiQ) is rejected", () => {
  const r = convert([row("1PH3105-1DG02-0KA0")]);
  assert.equal(r.lines[0].cls, "none");
  assert.equal(r.axes, 0);
});

t("1PH1 power cable picks the cross-section from the preceding spindle", () => {
  const r = convert([row("1PH1103-1LD12-0GA0"), row("6FX5008-1BB21-1AF0")]);
  const c = find(r.lines, "6FX5008-1BB21-1DA0");
  assert.equal(c?.cls, "verified");
});

t("1PH1 encoder cable with an unlisted length is flagged", () => {
  const r = convert([row("6FX3002-2CT30-1DA0")]);
  assert.equal(find(r.lines, "6FX3502-2XB13-1DA0")?.cls, "review");
});

t("unknown option matched by description keywords is marked review", () => {
  const r = convert([row("6FC5800-0ZZ99-0YB0", 1, "Residual material detection")]);
  const l = find(r.lines, "6FC5800-0AP13-0YH0");
  assert.equal(l?.cls, "review");
});

t("option with no 828D Smart counterpart is marked none", () => {
  const r = convert([row("6FC5800-0AP07-0YB0")]);
  assert.equal(r.lines[0].cls, "none");
  assert.ok(needsReview(r.lines[0]));
});

t("1FL6 size outside the table is flagged", () => {
  const r = convert([row("1FL6099-1AC61-2AA1")]);
  assert.equal(r.lines[0].cls, "review");
  assert.equal(r.axes, 0);
});

t("handwheel and SITOP are carried over for review", () => {
  const r = convert([row("6FC9320-5DB01-0AA0", 1, "Handwheel"), row("6EP1333-2BA20", 1, "SITOP")]);
  assert.equal(all(r.lines, "6FC9320-5DB01-0AA0").length, 1);
  assert.equal(all(r.lines, "6EP1333-2BA20").length, 1);
});

t("unknown article gets a review placeholder", () => {
  const r = convert([row("6ES7999-0AA00-0AA0", 2, "mystery")]);
  assert.equal(r.lines[0].cls, "review");
  assert.equal(r.lines[0].mlfb, "—");
});

t("assumed quantities are reported once", () => {
  const r = convert([{ mlfb: "1FL6064-1AC61-2AA1", qty: 1, qtyAssumed: true, desc: "" }]);
  assert.ok(r.notes.some(([, txt]) => /Quantity not found for 1 line/.test(txt)));
});

console.log(`\n${pass} passed`);
