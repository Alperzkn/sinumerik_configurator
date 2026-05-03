/**
 * Cross-family smoke tests. Run with:
 *   npx tsx apps/web/src/lib/mlfb/families.test.ts
 */
import assert from "node:assert/strict";
import { buildMlfb } from "./builder";
import { ft2DriveCliq, ft2SelectionsFor } from "./families/ft2";
import { fk2, fk2SelectionsFor } from "./families/fk2";
import { fk7Compact, fk7SelectionsFor } from "./families/fk7";
import { ph8, ph8SelectionsFor } from "./families/ph8";
import { ph3, ph3SelectionsFor } from "./families/ph3";
import { fe1, fe1SelectionsFor } from "./families/fe1_fe2";
import { fn3, fn3SelectionsFor } from "./families/fn3";
import { fw6, fw6SelectionsFor } from "./families/fw6";
import { FAMILY_MODELS } from "./index";

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

console.log("MLFB families");

t("1FT2 trunk-only: builder returns just the trunk, no fake suffix", () => {
  // Honest mode: 1FT2 ordering layout not exhaustively cross-checked.
  // The builder skips the suffix template and returns the verified trunk;
  // the BOM line shows a "partner completes suffix" badge.
  const mlfb = buildMlfb(ft2DriveCliq, "1FT2104-4AF", ft2SelectionsFor());
  assert.equal(mlfb, "1FT2104-4AF");
  assert.equal(ft2DriveCliq.completeness, "trunk-only");
});

t("1FK2 trunk-only", () => {
  const mlfb = buildMlfb(fk2, "1FK2103-2AG", fk2SelectionsFor());
  assert.equal(mlfb, "1FK2103-2AG");
  assert.equal(fk2.completeness, "trunk-only");
});

t("1FK7 trunk-only", () => {
  const mlfb = buildMlfb(fk7Compact, "1FK7042-5AF71", fk7SelectionsFor());
  assert.equal(mlfb, "1FK7042-5AF71");
  assert.equal(fk7Compact.completeness, "trunk-only");
});

t("1PH8 default (incremental encoder, air cooling)", () => {
  const sel = ph8SelectionsFor({});
  const mlfb = buildMlfb(ph8, "1PH8133-1FF10", sel);
  assert.equal(mlfb, "1PH8133-1FF10-0LA1");
});

t("1PH8 absolute multi-turn encoder", () => {
  const sel = ph8SelectionsFor({ encoder: "absolute_multi" });
  const mlfb = buildMlfb(ph8, "1PH8133-1FF10", sel);
  assert.equal(mlfb, "1PH8133-1FF10-3LA1");
});

t("1PH8 water cooling", () => {
  const sel = ph8SelectionsFor({ cooling: "water" });
  const mlfb = buildMlfb(ph8, "1PH8133-1FF10", sel);
  assert.equal(mlfb, "1PH8133-1FF10-0WA1");
});

t("1PH3 trunk-only: returns just the trunk", () => {
  const mlfb = buildMlfb(ph3, "1PH3105-1AF40", ph3SelectionsFor({}));
  assert.equal(mlfb, "1PH3105-1AF40");
  assert.equal(ph3.completeness, "trunk-only");
});

t("1FE1 trunk-only", () => {
  const mlfb = buildMlfb(fe1, "1FE1051-4HC10", fe1SelectionsFor({}));
  assert.equal(mlfb, "1FE1051-4HC10");
  assert.equal(fe1.completeness, "trunk-only");
});

t("1FN3 trunk-only", () => {
  const mlfb = buildMlfb(fn3, "1FN3450-4WC00", fn3SelectionsFor({}));
  assert.equal(mlfb, "1FN3450-4WC00");
  assert.equal(fn3.completeness, "trunk-only");
});

t("1FW6 trunk-only", () => {
  const mlfb = buildMlfb(fw6, "1FW6230-8WC07", fw6SelectionsFor({}));
  assert.equal(mlfb, "1FW6230-8WC07");
  assert.equal(fw6.completeness, "trunk-only");
});

t("FAMILY_MODELS registry has all 10 families", () => {
  const expected = ["1FT2", "1FT7", "1FK2", "1FK7", "1PH8", "1PH3", "1FE1", "1FE2", "1FN3", "1FW6"];
  for (const f of expected) {
    assert.ok(FAMILY_MODELS[f], `missing ${f}`);
  }
});

console.log(`\n${pass} passed`);
