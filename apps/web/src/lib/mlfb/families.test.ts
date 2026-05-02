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

t("1FT2 default brake-off", () => {
  const sel = ft2SelectionsFor({ brake: false });
  const mlfb = buildMlfb(ft2DriveCliq, "1FT2104-4AF21", sel);
  assert.equal(mlfb, "1FT2104-4AF21-2AA0");
});

t("1FT2 with brake → code B", () => {
  const sel = ft2SelectionsFor({ brake: true });
  const mlfb = buildMlfb(ft2DriveCliq, "1FT2104-4AF21", sel);
  assert.equal(mlfb, "1FT2104-4AF21-2BA0");
});

t("1FK2 OCC no brake", () => {
  const sel = fk2SelectionsFor({ brake: false, connection: "OCC" });
  const mlfb = buildMlfb(fk2, "1FK2103-2AG31", sel);
  assert.equal(mlfb, "1FK2103-2AG31-1AA0");
});

t("1FK2 OCC with brake", () => {
  const sel = fk2SelectionsFor({ brake: true, connection: "OCC" });
  const mlfb = buildMlfb(fk2, "1FK2103-2AG31", sel);
  assert.equal(mlfb, "1FK2103-2AG31-2AA0");
});

t("1FK2 PROFINET RJ45 with brake", () => {
  const sel = fk2SelectionsFor({ brake: true, connection: "RJ45" });
  const mlfb = buildMlfb(fk2, "1FK2103-2AG31", sel);
  assert.equal(mlfb, "1FK2103-2AG31-4AA0");
});

t("1FK7 default brake-off", () => {
  const sel = fk7SelectionsFor({ brake: false });
  const mlfb = buildMlfb(fk7Compact, "1FK7042-5AF71", sel);
  assert.equal(mlfb, "1FK7042-5AF71-1AA1");
});

t("1FK7 with brake", () => {
  const sel = fk7SelectionsFor({ brake: true });
  const mlfb = buildMlfb(fk7Compact, "1FK7042-5AF71", sel);
  assert.equal(mlfb, "1FK7042-5AF71-1BA1");
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

t("1PH3 default", () => {
  const sel = ph3SelectionsFor({});
  const mlfb = buildMlfb(ph3, "1PH3105-1AF40", sel);
  assert.equal(mlfb, "1PH3105-1AF40-0LA1");
});

t("1FE1 default (water + incremental)", () => {
  const sel = fe1SelectionsFor({});
  const mlfb = buildMlfb(fe1, "1FE1051-4HC10", sel);
  assert.equal(mlfb, "1FE1051-4HC10-W10");
});

t("1FN3 default (water + standard thermal)", () => {
  const sel = fn3SelectionsFor({});
  const mlfb = buildMlfb(fn3, "1FN3450-4WC00", sel);
  assert.equal(mlfb, "1FN3450-4WC00-WC0-0AA1");
});

t("1FW6 built-in default (water-cooled)", () => {
  const sel = fw6SelectionsFor({ form: "built-in" });
  const mlfb = buildMlfb(fw6, "1FW6230-8WC07", sel);
  assert.equal(mlfb, "1FW6230-8WC07-WC0-1JA0");
});

t("1FW6 complete air-cooled", () => {
  const sel = fw6SelectionsFor({ form: "complete", cooling: "air" });
  const mlfb = buildMlfb(fw6, "1FW6090-8RB07", sel);
  assert.equal(mlfb, "1FW6090-8RB07-RC0-1JA0");
});

t("FAMILY_MODELS registry has all 10 families", () => {
  const expected = ["1FT2", "1FT7", "1FK2", "1FK7", "1PH8", "1PH3", "1FE1", "1FE2", "1FN3", "1FW6"];
  for (const f of expected) {
    assert.ok(FAMILY_MODELS[f], `missing ${f}`);
  }
});

console.log(`\n${pass} passed`);
