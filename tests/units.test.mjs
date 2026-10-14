// Units and standard drinks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtOz, fmtAmount, fmtVolume, standardDrinks } from "../js/units.js";

test("oz show as quarters with fractions", () => {
  assert.equal(fmtOz(1.5), "1½");
  assert.equal(fmtOz(0.75), "¾");
  assert.equal(fmtOz(2), "2");
  assert.equal(fmtOz(0.25), "¼");
});

test("recipe amounts in oz or ml (to the nearest 5 ml)", () => {
  assert.equal(fmtAmount(1.5, "oz"), "1½ oz");
  assert.equal(fmtAmount(1.5, "ml"), "45 ml");
  assert.equal(fmtAmount(2, "ml"), "60 ml");
  assert.equal(fmtAmount(0.25, "ml"), "5 ml");
});

test("drink sizes in oz or ml", () => {
  assert.equal(fmtVolume(355, "ml"), "355 ml");
  assert.equal(fmtVolume(355, "oz"), "12 oz");
  assert.equal(fmtVolume(473, "oz"), "16 oz");
  assert.equal(fmtVolume(500, "oz"), "16.9 oz");
});

test("standard drinks use the Canadian 17.05 ml of alcohol", () => {
  assert.equal(standardDrinks(341, 5), 1);       // a bottle of beer
  assert.equal(standardDrinks(473, 5), 1.4);     // a tallboy
  assert.equal(standardDrinks(44.36, 40), 1);    // 1.5 oz of spirits
  assert.equal(standardDrinks(0, 5), 0);
  assert.equal(standardDrinks(355, 0), 0);
});
