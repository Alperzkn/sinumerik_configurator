/**
 * Self-running test for the MLFB builder. Run with:
 *
 *   npx tsx apps/web/src/lib/mlfb/builder.test.ts
 *
 * No test runner dependency — uses node:assert. Each `t(...)` block is
 * an independent assertion; failures throw and the script exits non-zero.
 */
import assert from "node:assert/strict";
import { buildMlfb, validateSelections, explainMlfb } from "./builder";
import { ft7CompactDriveCliq, ft7SelectionsFor } from "./families/ft7";

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

console.log("MLFB builder — 1FT7");

t("default selections produce canonical suffix", () => {
  const mlfb = buildMlfb(ft7CompactDriveCliq, "1FT7064-5AF71");
  // shaft_brake=A, terminal=A, spec=1 → -1AA1
  assert.equal(mlfb, "1FT7064-5AF71-1AA1");
});

t("brake on feather/N maps to code B", () => {
  const sel = ft7SelectionsFor({ brake: true });
  assert.equal(sel.shaft_brake, "B");
  const mlfb = buildMlfb(ft7CompactDriveCliq, "1FT7064-5AF71", sel);
  assert.equal(mlfb, "1FT7064-5AF71-1BA1");
});

t("brake off feather/N maps to code A", () => {
  const sel = ft7SelectionsFor({ brake: false });
  assert.equal(sel.shaft_brake, "A");
  const mlfb = buildMlfb(ft7CompactDriveCliq, "1FT7064-5AF71", sel);
  assert.equal(mlfb, "1FT7064-5AF71-1AA1");
});

t("plain shaft + brake maps to H", () => {
  const sel = ft7SelectionsFor({ brake: true, shaftKind: "plain" });
  assert.equal(sel.shaft_brake, "H");
  const mlfb = buildMlfb(ft7CompactDriveCliq, "1FT7106-5AC71", sel);
  assert.equal(mlfb, "1FT7106-5AC71-1HA1");
});

t("tolerance R + brake maps to E", () => {
  const sel = ft7SelectionsFor({ brake: true, tolerance: "R" });
  assert.equal(sel.shaft_brake, "E");
  const mlfb = buildMlfb(ft7CompactDriveCliq, "1FT7106-5AC71", sel);
  assert.equal(mlfb, "1FT7106-5AC71-1EA1");
});

t("custom terminal direction overrides default", () => {
  const mlfb = buildMlfb(ft7CompactDriveCliq, "1FT7064-5AF71", {
    shaft_brake: "B",
    terminal: "5",
    spec: "1",
  });
  assert.equal(mlfb, "1FT7064-5AF71-1B51");
});

t("invalid code throws with a clear message", () => {
  assert.throws(
    () =>
      buildMlfb(ft7CompactDriveCliq, "1FT7064-5AF71", {
        shaft_brake: "Z", // not in choices
      }),
    /not in the allowed choices/,
  );
});

t("missing slot in template throws", () => {
  const broken = {
    ...ft7CompactDriveCliq,
    suffixTemplate: "-1{nonexistent}A1",
  };
  assert.throws(
    () => buildMlfb(broken, "1FT7064-5AF71", {}),
    /not defined for family/,
  );
});

t("validateSelections passes on defaults", () => {
  const issues = validateSelections(ft7CompactDriveCliq, {});
  assert.deepEqual(issues, []);
});

t("validateSelections flags illegal codes", () => {
  const issues = validateSelections(ft7CompactDriveCliq, { shaft_brake: "Z" });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].slotId, "shaft_brake");
});

t("explainMlfb returns one row per slot", () => {
  const rows = explainMlfb(ft7CompactDriveCliq, { shaft_brake: "B" });
  assert.equal(rows.length, 3);
  const brakeRow = rows.find((r) => r.slotId === "shaft_brake")!;
  assert.equal(brakeRow.code, "B");
  assert.match(brakeRow.choiceLabel, /with holding brake/);
});

console.log(`\n${pass} passed`);
