/**
 * Cable MLFB length-code tests. Run:
 *   npx tsx apps/web/src/lib/mlfb/cables.test.ts
 */
import assert from "node:assert/strict";
import { lengthCodeFor, buildCableMlfb } from "./cables";

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

console.log("MLFB cables");

t("standard 5m → 1AF0", () => {
  assert.deepEqual(lengthCodeFor(5), { code: "1AF0", actualMeters: 5 });
});

t("standard 10m → 1BA0", () => {
  assert.deepEqual(lengthCodeFor(10), { code: "1BA0", actualMeters: 10 });
});

t("non-standard 7m → 1AH0 (exact match)", () => {
  assert.deepEqual(lengthCodeFor(7), { code: "1AH0", actualMeters: 7 });
});

t("8m rounds up to 10m → 1BA0", () => {
  assert.deepEqual(lengthCodeFor(8), { code: "1BA0", actualMeters: 10 });
});

t("12m rounds up to 15m → 1BC0", () => {
  assert.deepEqual(lengthCodeFor(12), { code: "1BC0", actualMeters: 15 });
});

t("110m clamps to 100m → 1HA0", () => {
  assert.deepEqual(lengthCodeFor(110), { code: "1HA0", actualMeters: 100 });
});

t("zero / negative defaults to 10m", () => {
  assert.deepEqual(lengthCodeFor(0), { code: "1BA0", actualMeters: 10 });
  assert.deepEqual(lengthCodeFor(-5), { code: "1BA0", actualMeters: 10 });
});

t("buildCableMlfb appends suffix for bare base", () => {
  assert.deepEqual(buildCableMlfb("6FX8002-5CA15", 7), {
    mlfb: "6FX8002-5CA15-1AH0",
    actualMeters: 7,
  });
});

t("buildCableMlfb replaces existing suffix", () => {
  assert.deepEqual(buildCableMlfb("6FX8002-5CA15-1AF0", 10), {
    mlfb: "6FX8002-5CA15-1BA0",
    actualMeters: 10,
  });
});

t("buildCableMlfb preserves multi-segment base", () => {
  // "6FX8002-5CA15" has only one hyphen-separated suffix slot; ensure
  // we don't accidentally chop the middle segment.
  const out = buildCableMlfb("6FX8002-5CA15", 25);
  assert.equal(out.mlfb, "6FX8002-5CA15-1CC0");
});

console.log(`\n${pass} passed`);
