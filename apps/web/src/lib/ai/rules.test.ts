/**
 * Self-running test for the deterministic post-AI rules (brakes on vertical
 * axes, gantry licence, stated motor size). Run from the repo root:
 *
 *   npx tsx --tsconfig apps/web/tsconfig.json apps/web/src/lib/ai/rules.test.ts
 */
import assert from "node:assert/strict";
import { parseAiResponse, setCatalogData } from "./response-parser";
import { buildConfigFromTemplate } from "./build-from-template";
import { catalogBundle } from "@/data/catalog-bundle";
import type { AiRawResponse } from "./recommendation-engine";

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

/** What the AI actually returned for a wood router with X1/X2/Y1/Z1 — no brakes, no gantry. */
const routerFromAi: AiRawResponse = {
  controlSystem: { family: "sinumerik_one", reason: "test" },
  controlUnit: { id: "NCU_1740", reason: "" },
  cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
  technologyPackages: [],
  additionalOptions: [{ orderCode: "A02", name: "", quantity: 1, reason: "" }],
  driveArchitecture: { family: "S120_booksize", feedAxisCount: 4, spindleCount: 1, highSpeedSpindle: true, reason: "" },
  hmi: { type: "thin_client", panelSizeInch: 15, reason: "" },
  safety: { options: [], reason: "" },
  totalAxes: 5,
  totalChannels: 1,
  userPreferences: { axisNames: ["X1", "X2", "Y1", "Z1"], feedPowerKw: 1.5, spindlePowerKw: 7.5, spindleMaxRpm: 18000 },
};

(async () => {
  setCatalogData(catalogBundle);
  console.log("Deterministic rules after the AI");

  await t("vertical axis Z1 gets a holding brake even when the AI forgot it", () => {
    const c = parseAiResponse(routerFromAi, {}, "custom");
    assert.ok(c);
    const feed = c.motors.find((m) => m.motorType === "feed_servo_sync");
    assert.ok(feed?.perAxisMlfbs, "per-axis MLFBs expected");
    const z = feed.perAxisMlfbs.find((a) => a.axis === "Z1");
    assert.equal(z?.brake, true);
    assert.equal(feed.perAxisMlfbs.find((a) => a.axis === "X1")?.brake, false);
    assert.ok(c.notes.some((n) => /Holding brake added on vertical axis Z1/.test(n)));
  });

  await t("X1 + X2 add the gantry licence M02 on SINUMERIK ONE", () => {
    const c = parseAiResponse(routerFromAi, {}, "custom");
    assert.ok(c);
    const m02 = c.softwareOptions.find((o) => o.orderCode === "M02");
    assert.ok(m02, "M02 expected");
    assert.equal(c.optionQuantities[m02.id], 1);
  });

  await t("the same router on 828D Smart gets 0AS51 and a braked 1FL2 on Z1", () => {
    const c = parseAiResponse(routerFromAi, {}, "custom", "828d_smart");
    assert.ok(c);
    assert.ok(c.softwareOptions.some((o) => o.orderCode === "0AS51"), "0AS51 expected");
    const feed = c.motors.find((m) => m.motorType === "feed_servo_sync");
    const z = feed?.perAxisMlfbs?.find((a) => a.axis === "Z1");
    assert.match(z?.mlfb ?? "", /^1FL2\d{3}-\dA[CF]11-0MB0$/); // brake digit 1
    assert.match(feed?.perAxisMlfbs?.find((a) => a.axis === "X1")?.mlfb ?? "", /01-0MB0$/);
  });

  await t("a stated 1.5 kW motor size keeps the feed motor small (≥ 1.5 kW, not the 3 kW class)", () => {
    const c = parseAiResponse(routerFromAi, {}, "custom");
    assert.ok(c);
    const feed = c.motors.find((m) => m.motorType === "feed_servo_sync");
    const kw = parseFloat(feed?.ratedPower ?? "0");
    assert.ok(kw >= 1.5 && kw < 3, `expected 1.5–3 kW feed motor, got ${feed?.ratedPower}`);
  });

  await t("axes without names still get per-axis MLFBs with a braked Z", () => {
    const c = parseAiResponse({ ...routerFromAi, userPreferences: {} }, { feedAxisCount: 3, spindleCount: 1 }, "3axis_mill");
    assert.ok(c);
    const feed = c.motors.find((m) => m.motorType === "feed_servo_sync");
    assert.deepEqual(feed?.perAxisMlfbs?.map((a) => a.axis), ["X", "Y", "Z"]);
    assert.equal(feed?.perAxisMlfbs?.find((a) => a.axis === "Z")?.brake, true);
  });

  await t("the Gantry Router template builds with M02, braked Z1 and a high-speed spindle", async () => {
    const c = await buildConfigFromTemplate("router", {}, "sinumerik_one");
    assert.ok(c);
    assert.ok(c.softwareOptions.some((o) => o.orderCode === "M02"));
    const feed = c.motors.find((m) => m.motorType === "feed_servo_sync");
    assert.equal(feed?.perAxisMlfbs?.find((a) => a.axis === "Z1")?.brake, true);
    assert.equal(c.totalAxes, 5);
  });

  console.log(`\n${pass} passed`);
})();
