/**
 * Self-running test for the 808D input parser. Run with:
 *
 *   npx tsx apps/web/src/lib/convert-808d/parser.test.ts
 */
import assert from "node:assert/strict";
import { fixOh, normMlfb, parseCells, parseText, rowsFromSheetMatrix, textToMatrix } from "./parser";

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

console.log("808D parser");

t("fixOh repairs letter-O typos only at digit positions", () => {
  assert.equal(fixOh("6FC5800-OAK70-OYB0"), "6FC5800-0AK70-0YB0");
  assert.equal(fixOh("6fc537o-2am03-0aa0"), "6FC5370-2AM03-0AA0");
  // A real letter O inside a description survives
  assert.equal(fixOh("MOTOR 1FL6064-1AC61-2AA1"), "MOTOR 1FL6064-1AC61-2AA1");
});

t("normMlfb normalises the -Z suffix spacing", () => {
  assert.equal(normMlfb("6sl5510-1be11-5af0-Z T80"), "6SL5510-1BE11-5AF0-Z T80");
  assert.equal(normMlfb("6SL5510-1BE11-5AF0 -ZT80"), "6SL5510-1BE11-5AF0-Z T80");
});

t("parseCells finds the MLFB in any column and reads a numeric qty", () => {
  const r = parseCells(["3", "SIMOTICS S-1FL6 1.5 kW", "1FL6064-1AC61-2AA1"]);
  assert.ok(r);
  assert.equal(r.mlfb, "1FL6064-1AC61-2AA1");
  assert.equal(r.qty, 3);
  assert.equal(r.qtyAssumed, false);
  assert.equal(r.desc, "SIMOTICS S-1FL6 1.5 kW");
});

t("parseCells accepts '2 pcs' and 'x2' quantity styles", () => {
  assert.equal(parseCells(["1FL6064-1AC61-2AA1", "2 pcs"])!.qty, 2);
  assert.equal(parseCells(["1FL6064-1AC61-2AA1", "x2"])!.qty, 2);
  assert.equal(parseCells(["1FL6064-1AC61-2AA1", "4,00"])!.qty, 4);
});

t("parseCells assumes qty 1 when none is present", () => {
  const r = parseCells(["1FL6064-1AC61-2AA1", "servo motor"]);
  assert.equal(r!.qty, 1);
  assert.equal(r!.qtyAssumed, true);
});

t("parseCells keeps text that shares a cell with the MLFB", () => {
  const r = parseCells(["6SL3210-5DE16-0UA0 SINAMICS V70 5.8 A", "3"]);
  assert.equal(r!.mlfb, "6SL3210-5DE16-0UA0");
  assert.equal(r!.desc, "SINAMICS V70 5.8 A");
});

t("parseCells returns null when there is no article number", () => {
  assert.equal(parseCells(["Article", "Qty", "Description"]), null);
});

t("parseText splits on tabs and skips header rows silently", () => {
  const { rows, unparsed } = parseText(
    "Article\tQty\tDescription\n1FL6064-1AC61-2AA1\t3\tmotor\n\nsome random note\n6FC5370-2AM03-0AA0\t1\tPPU",
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(unparsed, ["some random note"]);
  assert.equal(rows[1].mlfb, "6FC5370-2AM03-0AA0");
});

t("parseText falls back to semicolons and 2+ spaces", () => {
  const { rows } = parseText("1FL6064-1AC61-2AA1;2;motor\n6FC5370-2AM03-0AA0   1   PPU");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].qty, 2);
  assert.equal(rows[1].qty, 1);
});

t("rowsFromSheetMatrix splits by Configuration column", () => {
  const cfgs = rowsFromSheetMatrix(
    [
      ["Configuration", "Article No.", "Qty", "Description"],
      ["VMC A", "1FL6064-1AC61-2AA1", 3, "motor"],
      ["VMC B", "6FC5370-2AM03-0AA0", 1, "PPU"],
      ["VMC A", "6FC5370-2AM03-0AA0", 1, "PPU"],
      ["", "", "", ""],
      ["VMC B", "nonsense", "", ""],
    ],
    "file",
  );
  assert.equal(cfgs.length, 2);
  const a = cfgs.find((c) => c.name === "VMC A")!;
  const b = cfgs.find((c) => c.name === "VMC B")!;
  assert.equal(a.rows.length, 2);
  assert.equal(b.rows.length, 1);
  assert.equal(a.unparsed.length, 1);
});

t("rowsFromSheetMatrix uses the fallback name without a Configuration column", () => {
  const cfgs = rowsFromSheetMatrix([["1FL6064-1AC61-2AA1", 3, "motor"]], "my-file");
  assert.equal(cfgs.length, 1);
  assert.equal(cfgs[0].name, "my-file");
  assert.equal(cfgs[0].rows[0].qty, 3);
});

t("rowsFromSheetMatrix returns one empty config when nothing parses", () => {
  const cfgs = rowsFromSheetMatrix([["hello"]], "x");
  assert.equal(cfgs.length, 1);
  assert.equal(cfgs[0].rows.length, 0);
});

t("textToMatrix splits csv and tsv", () => {
  assert.deepEqual(textToMatrix("a,b\nc\td"), [["a", "b"], ["c", "d"]]);
});

console.log(`\n${pass} passed`);
