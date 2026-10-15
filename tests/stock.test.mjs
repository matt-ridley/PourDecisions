// The bar and the fridge: households, where things go, bottle levels and what a household can make.
import { test } from "node:test";
import assert from "node:assert/strict";
import { itemById } from "../js/catalog.js";
import { coverMap, sortByHave } from "../js/makeable.js";
import { allItems } from "../js/catalog.js";
import { stockId, householdOf, defaultWhere, stockIn, level, levelText, onHand, isLow, fridgeCount, haveFromStock, homeless } from "../js/stock.js";

const covers = coverMap();
const fridge = (item, count, extra = {}) => ({ id: stockId("h1", "fridge", "drink", item), hh: "h1", where: "fridge", kind: "drink", item, count, ...extra });
const bottle = (item, left, extra = {}) => ({ id: stockId("h1", "bar", "drink", item), hh: "h1", where: "bar", kind: "drink", item, size: 750, left, ...extra });
const ing = (item, extra = {}) => ({ id: stockId("h1", "bar", "ing", item), hh: "h1", where: "bar", kind: "ing", item, ...extra });

test("stock ids name the household, where, kind and item", () => {
  assert.equal(stockId("h1", "bar", "ing", "lime-juice"), "h1~bar~ing~lime-juice");
});

test("someone's household, and who isn't in one yet", () => {
  const hs = [{ id: "h1", members: ["a", "b"] }, { id: "h2", members: ["c"] }];
  assert.equal(householdOf(hs, "b").id, "h1");
  assert.equal(householdOf(hs, "z"), null);
  assert.deepEqual(homeless([{ id: "a" }, { id: "z" }], hs).map(m => m.id), ["z"]);
});

test("beer goes in the fridge, whisky in the bar", () => {
  assert.equal(defaultWhere(itemById("drink", "molson-canadian")), "fridge");
  assert.equal(defaultWhere(itemById("drink", "crown-royal-deluxe")), "bar");
});

test("bottle levels round to the nearest quarter, and a sip left is never Empty", () => {
  assert.equal(levelText(bottle("campari", 750)), "Full");
  assert.equal(levelText(bottle("campari", 400)), "½");
  assert.equal(levelText(bottle("campari", 10)), "¼");
  assert.equal(levelText(bottle("campari", 0)), "Empty");
  assert.equal(level(bottle("campari", 900)), 1);
});

test("what's on hand: fridge counts, bottles with something in them or a spare, ingredients not out", () => {
  assert.ok(onHand(fridge("molson-canadian", 3)));
  assert.ok(!onHand(fridge("molson-canadian", 0)));
  assert.ok(!onHand(fridge("molson-canadian", -1)), "two people drinking the last can offline");
  assert.equal(fridgeCount(fridge("molson-canadian", -1)), 0);
  assert.ok(!onHand(bottle("campari", 0)));
  assert.ok(onHand(bottle("campari", 0, { spares: 1 })));
  assert.ok(onHand(ing("lime-juice")));
  assert.ok(!onHand(ing("lime-juice", { out: true })));
});

test("running low is at or below the household's level", () => {
  assert.ok(isLow(fridge("molson-canadian", 2, { low: 2 })));
  assert.ok(!isLow(fridge("molson-canadian", 3, { low: 2 })));
  assert.ok(!isLow(fridge("molson-canadian", 0)), "no level set, no warning");
});

test("the fridge lists the most recently changed first; the bar lists bottles then ingredients", () => {
  const stock = [fridge("molson-canadian", 1, { at: 1 }), fridge("molson-canadian-67", 1, { at: 5 }), ing("lime-juice"), bottle("campari", 750),
    { ...fridge("gone", 1), item: "not-a-drink" }];
  assert.deepEqual(stockIn(stock, "h1", "fridge").map(s => s.item), ["molson-canadian-67", "molson-canadian"]);
  assert.deepEqual(stockIn(stock, "h1", "bar").map(s => s.item), ["campari", "lime-juice"]);
  assert.deepEqual(stockIn(stock, "h2", "bar"), []);
});

test("a household's bar feeds What can I make: Crown Royal counts as rye, the fridge counts too", () => {
  const stock = [bottle("crown-royal-deluxe", 500), ing("lemon-juice"), ing("simple-syrup"), ing("ginger-ale", { out: true }),
    { ...bottle("campari", 0), hh: "h2" }];
  const have = haveFromStock(stock, "h1", covers);
  assert.ok(have.has("rye") && have.has("whisky") && have.has("crown-royal"));
  assert.ok(!have.has("ginger-ale"), "out of it");
  assert.ok(!have.has("campari"), "another household's bottle");
  const { now } = sortByHave(allItems().filter(i => i.kind === "cocktail"), have);
  assert.ok(now.some(r => r.item.id === "whisky-sour"));
});
