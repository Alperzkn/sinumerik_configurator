/**
 * Self-running test for the control-system families. Run from the repo root:
 *
 *   npx tsx --tsconfig apps/web/tsconfig.json apps/web/src/lib/ai/family.test.ts
 */
import assert from "node:assert/strict";
import { buildConfigFromTemplate } from "./build-from-template";
import type { GeneratedConfiguration } from "@/types/catalog";

let pass = 0;
const t = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    pass++;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (e) {
    process.stderr.write(`  ✗ ${name}\n    ${(e as Error).message}\n`);
    process.exit(1);
  }
};
const articles = (c: GeneratedConfiguration) => [
  c.controlUnit.articleNumber,
  c.cncSoftware.articleNumber,
  ...c.softwareOptions.map((o) => o.articleNumber),
  ...c.drives.map((d) => d.articleNumber),
  ...c.motors.map((m) => m.articleNumber ?? ""),
  ...c.hmiComponents.map((h) => h.articleNumber),
  ...(c.cables ?? []).map((x) => x.articleNumber),
];
const has = (c: GeneratedConfiguration, re: RegExp) => articles(c).some((a) => re.test(a));

(async () => {
  console.log("Control-system families");

  await t("SINUMERIK ONE template is unchanged (NCU 1740, S42, Line Module)", async () => {
    const c = await buildConfigFromTemplate("3axis_mill", {}, "sinumerik_one");
    assert.ok(c);
    assert.equal(c.family, "sinumerik_one");
    assert.equal(c.controlUnit.id, "NCU_1740");
    assert.ok(c.technologyPackages.some((p) => p.orderCode === "S42"));
    assert.ok(c.drives.some((d) => d.componentType.startsWith("line_module")));
  });

  await t("explicit axis counts recompute the ONE licence (5 feed + 1 spindle → A03)", async () => {
    const c = await buildConfigFromTemplate("3axis_mill", { feedAxisCount: 5, spindleCount: 1 }, "sinumerik_one");
    assert.ok(c);
    assert.equal(c.totalAxes, 6);
    assert.ok(c.softwareOptions.some((o) => o.orderCode === "A03"));
    assert.ok(!c.softwareOptions.some((o) => o.orderCode === "A01"));
  });

  await t("828D 3-axis mill → PPU 271.5, milling SD card SW 28x, Combi + reactor, MCP 1200U-H", async () => {
    const c = await buildConfigFromTemplate(
      "3axis_mill",
      { spindlePowerKw: 7.5, spindleMaxRpm: 8000, movingMassKg: 150, rapidTraverseMpm: 20 },
      "828d"
    );
    assert.ok(c);
    assert.equal(c.family, "828d");
    assert.equal(c.controlUnit.articleNumber, "6FC5370-5AA50-0AA0");
    assert.equal(c.cncSoftware.articleNumber, "6FC5836-2GY50-0YA0");
    assert.equal(c.technologyPackages.length, 0);
    assert.ok(has(c, /^6SL3111-[34]VE2/), "Combi power module expected");
    assert.ok(has(c, /^6SL3100-0EE2/), "line reactor expected");
    assert.ok(!c.drives.some((d) => d.componentType.startsWith("line_module")), "no booksize line module");
    assert.ok(has(c, /^6FC5303-0AF32-1AA1$/), "MCP 1200U-H expected");
    // 3 feed + 1 spindle = 4 = milling base scope → no 0AC20
    assert.ok(!c.softwareOptions.some((o) => o.orderCode === "0AC20"));
  });

  await t("828D lathe with 4 feed axes → PPU 270.5 (vertical), turning SD card, 0AC20 × 2", async () => {
    const c = await buildConfigFromTemplate("cnc_lathe", { feedAxisCount: 4, spindleCount: 1 }, "828d");
    assert.ok(c);
    assert.equal(c.controlUnit.id, "PPU_270_5");
    assert.equal(c.cncSoftware.articleNumber, "6FC5836-1GY50-0YA0");
    const lic = c.softwareOptions.find((o) => o.orderCode === "0AC20");
    assert.ok(lic, "0AC20 expected");
    assert.equal(c.optionQuantities[lic.id], 2); // 5 total − 3 base (turning)
    assert.ok(has(c, /^6FC5303-0AF33-1AA1$/), "MCP 1200U-V expected");
  });

  await t("828D with 5 feed axes stays on Combi with expansion Motor Modules", async () => {
    const c = await buildConfigFromTemplate(
      "3axis_mill",
      { feedAxisCount: 5, spindleCount: 1, spindlePowerKw: 7.5, spindleMaxRpm: 8000, movingMassKg: 150, rapidTraverseMpm: 20 },
      "828d"
    );
    assert.ok(c);
    assert.ok(has(c, /^6SL3111-4VE2/), "4-axis Combi expected");
    assert.ok(has(c, /^6SL3161-3XP00-0AA0$/), "connection kit expected for expansion axes");
    const lic = c.softwareOptions.find((o) => o.orderCode === "0AC20");
    assert.equal(lic && c.optionQuantities[lic.id], 2); // 6 total − 4 base (milling)
  });

  await t("828D with 8 drive axes falls back to booksize and adds NX10.3", async () => {
    const c = await buildConfigFromTemplate("3axis_mill", { feedAxisCount: 7, spindleCount: 1 }, "828d");
    assert.ok(c);
    assert.ok(has(c, /^6SL3040-1NC00-0AA0$/), "NX10.3 expected for 8 drive axes");
    assert.ok(c.drives.some((d) => d.componentType.startsWith("line_module")), "booksize line module expected");
  });

  await t("828D template with no specs defaults to a compact machine and lands on the Combi", async () => {
    const c = await buildConfigFromTemplate("3axis_mill", {}, "828d");
    assert.ok(c);
    assert.ok(has(c, /^6SL3111-[34]VE2/), "Combi power module expected for the default 828D mill");
    assert.ok(c.notes.some((n) => /compact/i.test(n)), "size-class assumption note expected");
  });

  await t("828D feed motors above 9 A fall back to S120 booksize", async () => {
    const c = await buildConfigFromTemplate("3axis_mill", { spindlePowerKw: 11, spindleMaxRpm: 8000, movingMassKg: 800, rapidTraverseMpm: 40 }, "828d");
    assert.ok(c);
    assert.ok(c.notes.some((n) => /Combi envelope/.test(n)));
    assert.ok(c.drives.some((d) => d.componentType.startsWith("line_module")));
  });

  await t("828D Smart 3-axis mill → PPU 261.5, SW 24x card, 1FL2 + S200, 1PH3 Pro + S200 Spindle, MC350 cables", async () => {
    const c = await buildConfigFromTemplate("3axis_mill", { spindlePowerKw: 7.5, spindleMaxRpm: 8000, movingMassKg: 300, rapidTraverseMpm: 24 }, "828d_smart");
    assert.ok(c);
    assert.equal(c.family, "828d_smart");
    assert.equal(c.controlUnit.articleNumber, "6FC5370-2AA50-0AA0");
    assert.equal(c.cncSoftware.articleNumber, "6FC5835-2GY50-0YA0");
    const fl2 = c.motors.find((m) => m.articleNumber?.startsWith("1FL2"));
    assert.ok(fl2, "1FL2 feed motor expected");
    assert.match(fl2.articleNumber ?? "", /^1FL2\d{3}-\dA[CF]01-0MB0$/); // full ordering code, no brake, plain shaft
    assert.equal(fl2.mlfbCompleteness, "verified");
    assert.ok(c.motors.some((m) => m.articleNumber?.startsWith("1PH3")), "1PH3 Pro spindle expected");
    assert.ok(has(c, /^6SL5510-1BE/), "S200 feed converter expected");
    assert.ok(has(c, /^6SL5510-1EE/), "S200 Spindle converter expected");
    assert.ok(!c.drives.some((d) => d.componentType.startsWith("line_module")), "no line module on S200");
    assert.ok(has(c, /^6FX3502-2XB12/), "MC350 encoder cable expected");
    assert.ok(has(c, /^6XV1870-3QH20$/), "PROFINET cord expected");
    assert.ok((c.cables ?? []).some((x) => /braking resistor/i.test(x.name)));
  });

  await t("828D Smart refuses more than 5 axes with an error warning", async () => {
    const c = await buildConfigFromTemplate("3axis_mill", { feedAxisCount: 5, spindleCount: 1 }, "828d_smart");
    assert.ok(c);
    assert.ok(c.warnings.some((w) => w.severity === "error" && /limit of 5/.test(w.message)));
  });

  await t("safety level extended on 828D adds 0AC50 per axis; on Smart it warns", async () => {
    const a = await buildConfigFromTemplate("3axis_mill", { safetyLevel: "extended" }, "828d");
    assert.ok(a);
    const s = a.softwareOptions.find((o) => o.orderCode === "0AC50");
    assert.ok(s, "0AC50 expected");
    assert.equal(a.optionQuantities[s.id], 4);
    const b = await buildConfigFromTemplate("3axis_mill", { safetyLevel: "extended" }, "828d_smart");
    assert.ok(b);
    assert.ok(b.warnings.some((w) => /not available on 828D Smart/.test(w.message)));
  });

  console.log(`\n${pass} passed`);
})();
