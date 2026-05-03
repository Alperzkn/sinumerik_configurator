/**
 * Per-axis resolver tests. Run:
 *   npx tsx apps/web/src/lib/mlfb/per-axis.test.ts
 */
import assert from "node:assert/strict";
import { getBaseMlfb, getFamilyCode, resolveFeedAxisMlfbs } from "./per-axis";

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

console.log("MLFB per-axis");

// ── getBaseMlfb ─────────────────────────────────────────────────────

t("strips 4-char suffix from 1FT7", () => {
  assert.equal(getBaseMlfb("1FT7064-5AF71-1DA1"), "1FT7064-5AF71");
});

t("strips 4-char suffix from 1PH8", () => {
  assert.equal(getBaseMlfb("1PH8133-1FF10-0LA1"), "1PH8133-1FF10");
});

t("preserves 3-char catalog base segment for 1FT2", () => {
  // The "-4AF" is the speed/torque-code part of the BASE, not a
  // configurable suffix. Stripping it produces an under-specified
  // MLFB that's not orderable. Regression guard for the bug user
  // spotted: BOM was showing "1FT2206-2BA0" instead of "1FT2206-4AF-2BA0".
  assert.equal(getBaseMlfb("1FT2206-4AF"), "1FT2206-4AF");
});

t("preserves 3-char catalog base segment for 1FK2", () => {
  assert.equal(getBaseMlfb("1FK2103-2AG"), "1FK2103-2AG");
});

t("preserves bare base with no hyphen", () => {
  assert.equal(getBaseMlfb("1FE1051"), "1FE1051");
});

t("does not strip a 5-char base segment", () => {
  // The middle segment of a fully-suffixed MLFB (e.g. "5AK71" in
  // 1FT7034-5AK71-1DA1) is 5 chars — must not be confused with a suffix.
  // Once the trailing 4-char suffix has been stripped, calling
  // getBaseMlfb on the result must be a no-op.
  assert.equal(getBaseMlfb("1FT7064-5AK71"), "1FT7064-5AK71");
});

// ── getFamilyCode ───────────────────────────────────────────────────

t("detects 1FT7 family", () => {
  assert.equal(getFamilyCode("1FT7064-5AF71-1DA1"), "1FT7");
});

t("detects 1FT2 family", () => {
  assert.equal(getFamilyCode("1FT2206-4AF"), "1FT2");
});

t("detects 1FK2 family", () => {
  assert.equal(getFamilyCode("1FK2103-2AG"), "1FK2");
});

t("detects 1PH8 family", () => {
  assert.equal(getFamilyCode("1PH8133-1FF10-0LA1"), "1PH8");
});

// ── resolveFeedAxisMlfbs ────────────────────────────────────────────

t("1FT2 per-axis MLFB has the full encoder/flange interfix", () => {
  // Catalog trunk "1FT2206-4AF" + interfix "21" + suffix "-2BA0/2AA0"
  // produces the full orderable Siemens article.
  const result = resolveFeedAxisMlfbs({
    baseArticle: "1FT2206-4AF",
    axisNames: ["X1", "Y1"],
    brakeAxes: ["X1"],
  });
  assert.equal(result.length, 2);
  assert.equal(result[0].axis, "X1");
  assert.equal(result[0].mlfb, "1FT2206-4AF21-2BA0");
  assert.equal(result[0].brake, true);
  assert.equal(result[1].axis, "Y1");
  assert.equal(result[1].mlfb, "1FT2206-4AF21-2AA0");
  assert.equal(result[1].brake, false);
});

t("1FK2 OCC per-axis with brakes — full MLFB", () => {
  const result = resolveFeedAxisMlfbs({
    baseArticle: "1FK2103-2AG",
    axisNames: ["X1", "X2", "Y1", "Y2"],
    brakeAxes: ["X1", "X2"],
    connection: "OCC",
  });
  assert.equal(result.length, 4);
  assert.equal(result[0].mlfb, "1FK2103-2AG31-2AA0");
  assert.equal(result[1].mlfb, "1FK2103-2AG31-2AA0");
  assert.equal(result[2].mlfb, "1FK2103-2AG31-1AA0");
  assert.equal(result[3].mlfb, "1FK2103-2AG31-1AA0");
});

t("decoded entries are populated for tooltip", () => {
  const result = resolveFeedAxisMlfbs({
    baseArticle: "1FT2206-4AF",
    axisNames: ["X1"],
    brakeAxes: ["X1"],
  });
  assert.ok(result[0].decoded);
  assert.ok(result[0].decoded.length > 0);
  const brakeRow = result[0].decoded.find((d) =>
    d.label.toLowerCase().includes("brake"),
  );
  assert.ok(brakeRow, "decoder should include the brake slot");
});

console.log(`\n${pass} passed`);
