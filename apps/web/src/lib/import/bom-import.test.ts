/**
 * Self-running test for the BOM importer. Run with:
 *
 *   npx tsx apps/web/src/lib/import/bom-import.test.ts
 */
import assert from "node:assert/strict";
import { importBomRows } from "./bom-import";
import type { InputRow } from "@/lib/convert-808d/types";

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

console.log("BOM import");

t("matches control unit, software, option, drives, motors and cables", () => {
  const r = importBomRows([
    row("6FC5317-5AA00-0AA1"), // NCU 1750
    row("6FC5800-0BM15-0YB0", 1), // option M15
    row("6SL3120-1TE21-0AD0", 3), // motor module
    row("6SL3120-1TE23-0AD0", 1), // spindle module
    row("6SL3130-7TE23-6AA3"), // active line module
    row("6SL3100-0BE23-6AB0"), // its interface module
    row("1FT7064-5AF71-1DA1", 3),
    row("1PH8133-1FF10-0LA1", 1),
  ]);
  assert.equal(r.configuration.controlUnit.id, "NCU_1750");
  assert.ok(r.configuration.softwareOptions.some((o) => o.orderCode === "M15"));
  assert.equal(r.configuration.driveQuantities["feed-mm-6SL3120-1TE21-0AD0"], 3);
  assert.equal(r.configuration.driveQuantities["spindle-mm-6SL3120-1TE23-0AD0"], 1);
  assert.ok(r.configuration.drives.some((d) => d.componentType === "line_module_active"));
  assert.ok(r.configuration.drives.some((d) => d.componentType === "interface_module"));
  assert.equal(r.configuration.motors.length, 2);
  assert.equal(r.configuration.totalAxes, 4);
  assert.equal(r.unmatched.length, 0);
  assert.equal(r.matched, 8);
});

t("unmatched articles are reported, not guessed", () => {
  const r = importBomRows([row("6FC5317-5AA00-0AA1"), row("6ES7999-0AA00-0AA0", 2, "mystery")]);
  assert.equal(r.unmatched.length, 1);
  assert.equal(r.unmatched[0].mlfb, "6ES7999-0AA00-0AA0");
  assert.ok(r.notes.some((n) => /no catalog match/.test(n)));
});

t("missing control unit and software are assumed with a note", () => {
  const r = importBomRows([row("1FT7064-5AF71-1DA1", 3)]);
  assert.equal(r.configuration.controlUnit.id, "NCU_1740");
  assert.ok(r.notes.some((n) => /No control unit/.test(n)));
  assert.ok(r.notes.some((n) => /No CNC software/.test(n)));
});

t("S210 converters are recognised as S210 drives", () => {
  const r = importBomRows([row("6SL5310-1BE12-0DF1", 2), row("1FK2104-6AF", 2)]);
  const d = r.configuration.drives[0];
  assert.equal(d.driveFamily, "S210");
  assert.equal(r.configuration.driveQuantities[d.id], 2);
  assert.equal(r.configuration.motors[0].motorType, "feed_servo_sync");
});

t("option quantities accumulate across duplicate rows", () => {
  const r = importBomRows([row("6FC5800-0BM15-0YB0", 1), row("6FC5800-0BM15-0YB0", 2)]);
  const opt = r.configuration.softwareOptions[0];
  assert.equal(r.configuration.optionQuantities[opt.id], 3);
});

t("-Z order suffixes are ignored for matching", () => {
  const r = importBomRows([row("6FC5317-5AA00-0AA1-Z A03")]);
  assert.equal(r.configuration.controlUnit.id, "NCU_1750");
});

console.log(`\n${pass} passed`);
