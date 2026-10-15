// What can I make: which ingredients cover others, sorting cocktails by what you have, and best buys.
import { test } from "node:test";
import assert from "node:assert/strict";
import { allItems, itemById } from "../js/catalog.js";
import { coverMap, expandHave, usesIngredient, sortByHave, bestBuys, checklistIngredients } from "../js/makeable.js";

const covers = coverMap();
const cocktails = allItems().filter(i => i.kind === "cocktail");
const names = rows => rows.map(r => r.item.id);

test("a narrower bottle covers the broader ingredient, never the other way round", () => {
  assert.ok(covers.get("rye").has("whisky"));
  assert.ok(covers.get("crown-royal").has("rye"));
  assert.ok(covers.get("crown-royal").has("canadian-whisky"));
  assert.ok(covers.get("tequila-blanco").has("tequila"));
  assert.ok(!covers.get("whisky").has("rye"));
  assert.ok(!covers.get("tequila").has("tequila-blanco"));
});

test("ingredients that aren't bottles, or have no bottles in the list, cover only themselves", () => {
  assert.deepEqual([...covers.get("lemon-juice")], ["lemon-juice"]);
  assert.deepEqual([...covers.get("seagrams-7")], ["seagrams-7"]);
});

test("ticking rye, lemon and simple syrup makes a Whisky Sour (egg white is optional)", () => {
  const have = expandHave(["rye", "lemon-juice", "simple-syrup"], covers);
  const { now } = sortByHave(cocktails, have);
  assert.ok(names(now).includes("whisky-sour"));
});

test("cocktails sort into now, missing 1 and missing 2+, with what's missing", () => {
  const have = expandHave(["bourbon", "lemon-juice"], covers);
  const { now, one, more } = sortByHave(cocktails, have);
  assert.equal(now.length + one.length + more.length, cocktails.length);
  const sour = one.find(r => r.item.id === "whisky-sour");
  assert.ok(sour, "Whisky Sour is one away");
  assert.deepEqual(sour.missing.map(x => x.ing), [["simple-syrup"]]);
  for (const r of more) assert.ok(r.missing.length >= 2);
  for (let k = 1; k < more.length; k++) assert.ok(more[k - 1].missing.length <= more[k].missing.length);
});

test("with nothing ticked, only recipes made of kitchen basics and optional extras are makeable", () => {
  const { now } = sortByHave(cocktails, new Set());
  for (const r of now) assert.equal(r.missing.length, 0);
  assert.ok(now.length < 5);
});

test("a recipe uses an ingredient when it would fill one of its lines", () => {
  const sour = itemById("cocktail", "whisky-sour").data;
  assert.ok(usesIngredient(sour, "rye", covers));
  assert.ok(usesIngredient(sour, "lemon-juice", covers));
  assert.ok(!usesIngredient(sour, "gin", covers));
});

test("best buys rank what unlocks the most missing-1 cocktails, and buying it really makes them", () => {
  const ticked = ["bourbon", "lemon-juice", "lime-juice", "simple-syrup", "sweet-vermouth"];
  const have = expandHave(ticked, covers);
  const { one } = sortByHave(cocktails, have);
  const buys = bestBuys(one, covers);
  assert.ok(buys.length > 0 && buys.length <= 5);
  for (let k = 1; k < buys.length; k++) assert.ok(buys[k - 1].unlocks.length >= buys[k].unlocks.length);
  const top = buys[0];
  const after = sortByHave(cocktails, expandHave([...ticked, top.ing.id], covers));
  for (const c of top.unlocks) assert.ok(names(after.now).includes(c.id), `${top.ing.id} should make ${c.id}`);
});

test("the checklist leaves out kitchen basics", () => {
  assert.ok(checklistIngredients().length > 100);
  assert.ok(checklistIngredients().every(g => !g.pantry));
});
