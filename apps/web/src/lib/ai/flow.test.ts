/**
 * Selection order after a manual change: motor → drive → line module → cables.
 * Run from the repo root:
 *
 *   npx tsx --tsconfig apps/web/tsconfig.json apps/web/src/lib/ai/flow.test.ts
 */
import assert from "node:assert/strict";
import { buildConfigFromTemplate } from "./build-from-template";
import { applySwap, setAxisCounts } from "./config-mutations";
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

const feedMm = (c: GeneratedConfiguration) => c.drives.find((d) => d.id.startsWith("feed-mm-"));
const lineModule = (c: GeneratedConfiguration) => c.drives.find((d) => d.componentType.startsWith("line_module"));
const feedMotor = (c: GeneratedConfiguration) => c.motors.find((m) => m.motorType === "feed_servo_sync");
const cable = (c: GeneratedConfiguration, re: RegExp) => c.cables.find((x) => re.test(x.articleNumber) || re.test(x.name));

(async () => {
  console.log("Manual changes keep the motor → drive → cable order");

  const one = await buildConfigFromTemplate("3axis_mill", {}, "sinumerik_one");
  assert.ok(one);

  await t("swapping the feed motor re-pairs the Motor Module from the catalog and re-sizes the Line Module", () => {
    const before = feedMm(one)!.articleNumber;
    const c = applySwap(one, "motor_feed", "1FT7042-5AF71-1DA1");
    assert.equal(feedMotor(c)?.articleNumber, "1FT7042-5AF71-1DA1");
    assert.notEqual(feedMm(c)!.articleNumber, before);
    assert.equal(feedMm(c)!.articleNumber, "6SL3120-1TE13-0AD0"); // catalog pairing for the 1FT7042 (SH48)
    assert.ok(lineModule(c), "line module still present for booksize");
  });

  await t("swapping the feed motor keeps the axis layout and rebuilds per-axis MLFBs (Z brake survives)", () => {
    const c = applySwap(one, "motor_feed", "1FT7042-5AF71-1DA1");
    const axes = feedMotor(c)?.perAxisMlfbs ?? [];
    assert.deepEqual(axes.map((a) => a.axis), feedMotor(one)!.perAxisMlfbs!.map((a) => a.axis));
    assert.equal(axes.find((a) => a.axis === "Z")?.brake, true);
    assert.ok(axes.every((a) => a.mlfb.startsWith("1FT7042")));
    assert.ok(feedMotor(c)?.mlfbCompleteness);
  });

  await t("swapping the feed motor rebuilds the cables for the new shaft height", () => {
    const c = applySwap(one, "motor_feed", "1FT7042-5AF71-1DA1", { cableLengthMeters: "15" });
    const pwr = c.cables.find((x) => /^6FX8002-5C/.test(x.articleNumber));
    const pwrBefore = one.cables.find((x) => /^6FX8002-5C/.test(x.articleNumber));
    assert.ok(pwr && pwrBefore, "feed power cable expected");
    assert.equal(pwr.length, "15 m");
    assert.match(pwr.articleNumber, /-1BC0$/); // 15 m length code
    assert.notEqual(pwr.articleNumber.slice(0, 13), pwrBefore.articleNumber.slice(0, 13)); // SH63 → SH48 cross-section
  });

  await t("swapping to a 1FK2 (OCC) pairs an S210 converter, OCC cables, and warns about the booksize spindle left behind", () => {
    const c = applySwap(one, "motor_feed", "1FK2104-4AK");
    assert.match(feedMm(c)!.articleNumber, /^6SL5310/);
    assert.equal(feedMm(c)!.driveFamily, "S210");
    assert.ok(lineModule(c), "the 1PH8 spindle is still on booksize, so its Line Module stays");
    assert.equal(cable(c, /OCC/i)?.quantity, 3);
    assert.ok(c.warnings.some((w) => /mixes S210 and S120/.test(w.message)));
  });

  await t("a Motor Module swap also rebuilds the cables", () => {
    const c = applySwap(one, "motor_module_feed", "6SL3120-1TE21-8AD0");
    assert.equal(feedMm(c)!.articleNumber, "6SL3120-1TE21-8AD0");
    assert.ok(c.cables.length > 0);
    assert.ok(cable(c, /DRIVE-CLiQ/i));
  });

  const smart = await buildConfigFromTemplate("3axis_mill", {}, "828d_smart");
  assert.ok(smart);

  await t("828D Smart: swapping to a bigger 1FL2 picks the matching S200 converter and SH90 cable, no Line Module", () => {
    const c = applySwap(smart, "motor_feed", "1FL2310-2AC");
    assert.equal(feedMm(c)!.articleNumber, "6SL5510-1BE13-5AF0-Z T80");
    assert.equal(feedMm(c)!.driveFamily, "S200");
    assert.equal(lineModule(c), undefined);
    assert.ok(cable(c, /^6FX3502-5CL02/), "4x1.5 SH90 power cable expected");
    assert.equal(cable(c, /DRIVE-CLiQ/i), undefined);
    const z = feedMotor(c)?.perAxisMlfbs?.find((a) => a.axis === "Z");
    assert.match(z?.mlfb ?? "", /^1FL2310-2AC11-0MB0$/);
    assert.ok(cable(c, /^6FX3502-5BL03/), "brake cable for the braked Z expected");
  });

  const d828 = await buildConfigFromTemplate("3axis_mill", {}, "828d");
  assert.ok(d828);

  await t("828D Combi: DRIVE-CLiQ cables are counted from the drive line-up, not per axis", () => {
    const dcliq = cable(d828, /DRIVE-CLiQ/i);
    assert.ok(dcliq);
    assert.equal(dcliq!.quantity, 1); // one Combi Power Module = one DRIVE-CLiQ device
  });

  await t("ONE: raising the feed axes to 5 propagates to quantities, per-axis codes, licence, drives and cables", () => {
    const c = setAxisCounts(one, { feedAxes: 5 });
    const fm = feedMotor(c)!;
    assert.equal(c.motorQuantities[fm.id], 5);
    assert.deepEqual(fm.perAxisMlfbs?.map((a) => a.axis), ["X", "Y", "Z", "A", "C"]);
    assert.equal(fm.perAxisMlfbs?.find((a) => a.axis === "Z")?.brake, true);
    assert.equal(c.driveQuantities[feedMm(c)!.id], 5);
    assert.equal(c.totalAxes, 6);
    assert.ok(c.softwareOptions.some((o) => o.orderCode === "A03"), "6 axes − 3 base = A03");
    assert.equal(cable(c, /DRIVE-CLiQ/i)?.quantity, 7); // 5 feed MM + spindle MM + Line Module
    assert.equal(c.cables.find((x) => /^6FX8002-5C/.test(x.articleNumber))?.quantity, 5);
  });

  await t("828D: dropping to 2 feed axes re-selects a 3-axis Combi from the motors", () => {
    const c = setAxisCounts(d828, { feedAxes: 2 });
    assert.ok(c.drives.some((d) => d.componentType === "power_module_3axis"), "3-axis Combi expected");
    assert.ok(!c.drives.some((d) => d.componentType === "power_module_4axis"));
    assert.equal(c.totalAxes, 3);
    assert.ok(!c.softwareOptions.some((o) => o.orderCode === "0AC20"), "3 axes are in the M base scope");
  });

  await t("828D: swapping the feed motor keeps the Combi line-up instead of adding a booksize module", () => {
    const c = applySwap(d828, "motor_feed", "1FK7042-2AF71");
    assert.ok(c.drives.some((d) => d.componentType.startsWith("power_module_")));
    assert.ok(!c.drives.some((d) => d.id.startsWith("feed-mm-")), "no stray booksize feed module next to the Combi");
    assert.ok(!c.drives.some((d) => d.componentType.startsWith("line_module")));
  });

  await t("828D: swapping the control unit to PPU 290.5 works through the catalog and re-matches the MCP", () => {
    const c = applySwap(d828, "control_unit", "6FC5370-8AA50-0BA0");
    assert.equal(c.controlUnit.id, "PPU_290_5");
    assert.ok(c.hmiComponents.some((h) => h.id === "hmi828-mcp_1500u"));
  });

  await t("ONE: PROFINET cords are counted from the PN devices (panel, MCP, I/O)", () => {
    const pn = one.cables.find((x) => /PROFINET/i.test(x.name));
    const devices = one.hmiComponents.filter((h) => ["thin_client", "panel_pc", "mcp", "io_module", "handheld_terminal"].includes(h.category)).length;
    assert.ok(devices >= 2);
    assert.equal(pn?.quantity, devices);
  });

  console.log(`\n${pass} passed`);
})();
