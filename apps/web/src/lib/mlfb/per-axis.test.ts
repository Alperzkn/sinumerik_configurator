/**
 * Per-axis resolver tests. Run:
 *   npx tsx apps/web/src/lib/mlfb/per-axis.test.ts
 */
import assert from "node:assert/strict";
import {
  getBaseMlfb,
  getFamilyCode,
  resolveFeedAxisMlfbs,
  resolveFullMotorMlfb,
} from "./per-axis";

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

t("1FT2 verified per-axis: full MLFBs with brake-aware pos 11", () => {
  // After page 8.1/55 verification: brake is position 11 (0/1), not
  // a combined shaft+brake char as in 1FT7. X-axes with brake → "11"
  // at positions 11-12, Y-axes without → "01".
  const result = resolveFeedAxisMlfbs({
    baseArticle: "1FT2206-4AF",
    axisNames: ["X1", "Y1"],
    brakeAxes: ["X1"],
  });
  assert.equal(result.length, 2);
  assert.equal(result[0].mlfb, "1FT2206-4AF11-1MB0");
  assert.equal(result[0].brake, true);
  assert.equal(result[0].completeness, "verified");
  assert.equal(result[1].mlfb, "1FT2206-4AF01-1MB0");
  assert.equal(result[1].brake, false);
  assert.equal(result[1].completeness, "verified");
});

t("1FK2 trunk-only per-axis", () => {
  const result = resolveFeedAxisMlfbs({
    baseArticle: "1FK2103-2AG",
    axisNames: ["X1", "X2", "Y1", "Y2"],
    brakeAxes: ["X1", "X2"],
    connection: "OCC",
  });
  assert.equal(result.length, 4);
  for (const row of result) {
    assert.equal(row.mlfb, "1FK2103-2AG");
    assert.equal(row.completeness, "trunk-only");
  }
});

t("1FT7 verified per-axis: full MLFB with brake-aware suffix", () => {
  const result = resolveFeedAxisMlfbs({
    baseArticle: "1FT7064-5AF71-1DA1",
    axisNames: ["X1", "Y1"],
    brakeAxes: ["X1"],
  });
  assert.equal(result.length, 2);
  assert.equal(result[0].mlfb, "1FT7064-5AF71-1BA1"); // brake → B
  assert.equal(result[0].completeness, "verified");
  assert.equal(result[1].mlfb, "1FT7064-5AF71-1AA1"); // no brake → A
  assert.equal(result[1].completeness, "verified");
});

// ── resolveFullMotorMlfb ────────────────────────────────────────────

t("1FT2 verified — full MLFB from D21.4 page 8.1/55 layout", () => {
  // 1FT2 was promoted from trunk-only to verified after the structure
  // table on page 8.1/55 was decoded position-by-position.
  assert.deepEqual(resolveFullMotorMlfb("1FT2206-4AF"), {
    mlfb: "1FT2206-4AF01-1MB0",
    completeness: "verified",
  });
});

t("trunk-only families still return just the trunk", () => {
  // 1FK2 / 1FK7 / 1PH3 / 1FE1 / etc. still pending catalog verification.
  assert.deepEqual(resolveFullMotorMlfb("1FK2103-2AG"), {
    mlfb: "1FK2103-2AG",
    completeness: "trunk-only",
  });
});

t("verified 1FT7 article round-trips unchanged with verified flag", () => {
  // 1FT7 stores the full ordering code in MOTOR_SPECS — return as-is.
  assert.deepEqual(resolveFullMotorMlfb("1FT7034-5AK71-1DA1"), {
    mlfb: "1FT7034-5AK71-1DA1",
    completeness: "verified",
  });
});

t("verified 1PH8 spindle MLFB is preserved", () => {
  assert.deepEqual(resolveFullMotorMlfb("1PH8133-1FF10-0LA1"), {
    mlfb: "1PH8133-1FF10-0LA1",
    completeness: "verified",
  });
});

t("returns trunk-only when family has no model", () => {
  assert.deepEqual(resolveFullMotorMlfb("9XYZ123"), {
    mlfb: "9XYZ123",
    completeness: "trunk-only",
  });
});

t("decoded entries are populated for verified families", () => {
  // 1FT7 is verified — the decoder rows feed the BOM tooltip.
  const result = resolveFeedAxisMlfbs({
    baseArticle: "1FT7064-5AF71-1DA1",
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

t("decoded is undefined for trunk-only families", () => {
  // 1FK2 still pending catalog verification — no decoder for trunk-only.
  const result = resolveFeedAxisMlfbs({
    baseArticle: "1FK2103-2AG",
    axisNames: ["X1"],
    brakeAxes: [],
  });
  assert.equal(result[0].decoded, undefined);
});

console.log(`\n${pass} passed`);
