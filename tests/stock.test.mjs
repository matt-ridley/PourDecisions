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

import { pourFrom, sourcesFor, makePours, emptiesOf, lowStock } from "../js/stock.js";

test("a pour comes off the open bottle; the one that empties it kills it, and a spare is opened for the rest", () => {
  assert.deepEqual(pourFrom(bottle("campari", 500), 44), { killed: false, inc: -44 });
  assert.deepEqual(pourFrom(bottle("campari", 30), 44), { killed: true, inc: -44 });
  assert.deepEqual(pourFrom(bottle("campari", 30, { spares: 2 }), 44), { killed: true, set: { left: 736, spares: 1 } });
  assert.deepEqual(pourFrom(bottle("campari", 0, { spares: 1 }), 44), { killed: false, set: { left: 706, spares: 0 } });
  assert.equal(pourFrom(bottle("campari", 0), 44), null, "nothing left to pour");
});

test("a drink can come from your fridge or bar when there's some left", () => {
  const stock = [fridge("molson-canadian", 2), { ...bottle("molson-canadian", 0), item: "molson-canadian", id: stockId("h1", "bar", "drink", "molson-canadian") }, fridge("x", 0)];
  assert.deepEqual(sourcesFor(stock, "h1", "molson-canadian").map(s => s.where), ["fridge"]);
  assert.deepEqual(sourcesFor(stock, "h1", "x"), []);
  assert.deepEqual(sourcesFor(stock, null, "molson-canadian"), [], "no household, no home stock");
});

test("making a cocktail takes the poured amount from picked bar bottles, and a beer per serving from the fridge", () => {
  const stock = [bottle("crown-royal-deluxe", 700), fridge("molson-canadian", 6)];
  const rows = [{ drinkId: "crown-royal-deluxe", oz: 1.5 }, { drinkId: "molson-canadian", qty: "1" }, { ing: ["lemon-juice"], oz: 1 }, { drinkId: "not-in-stock", oz: 1 }];
  const pours = makePours(rows, 2, stock, "h1", 30);
  assert.deepEqual(pours.map(p => [p.drinkId, p.ml, p.n]), [["crown-royal-deluxe", 90, 0], ["molson-canadian", 0, 2]]);
});

test("the wall of empties credits whoever poured, newest first", () => {
  const logs = [{ id: "a", uid: "me", at: 1, killed: ["campari"] }, { id: "b", uid: "friend", madeBy: "me", at: 3, killed: ["gin1", "vermouth1"] },
    { id: "c", uid: "friend", at: 2, killed: ["rum1"] }, { id: "d", uid: "me", at: 4 }];
  assert.deepEqual(emptiesOf(logs, "me").map(e => e.drinkId), ["gin1", "vermouth1", "campari"]);
  assert.deepEqual(emptiesOf(logs, "friend").map(e => e.drinkId), ["rum1"]);
});

test("running low: fridge at its warning, a bottle at ¼ or empty with no spare, an ingredient out", () => {
  const stock = [fridge("molson-canadian", 2, { low: 2 }), fridge("molson-canadian-67", 9, { low: 2 }), bottle("campari", 150),
    bottle("crown-royal-deluxe", 150, { spares: 1 }), ing("lime-juice", { out: true }), ing("lemon-juice")];
  assert.deepEqual(lowStock(stock, "h1").map(s => s.item).sort(), ["campari", "lime-juice", "molson-canadian"]);
});

import { coolersWith, coolerTotal, unloadMoves } from "../js/stock.js";

const cooler = (item, count, extra = {}) => ({ id: stockId("h1", "cooler", "drink", item), hh: "h1", where: "cooler", kind: "drink", item, count, ...extra });

test("a drink in your cooler comes first, then the fridge, then the bar", () => {
  const stock = [fridge("molson-canadian", 4), cooler("molson-canadian", 6)];
  assert.deepEqual(sourcesFor(stock, "h1", "molson-canadian").map(s => s.where), ["cooler", "fridge"]);
  assert.ok(onHand(cooler("molson-canadian", 1)) && !onHand(cooler("molson-canadian", 0)));
});

test("friends can find a drink in other households' coolers", () => {
  const stock = [cooler("molson-canadian", 6), { ...cooler("molson-canadian", 2), hh: "h2", id: stockId("h2", "cooler", "drink", "molson-canadian") },
    { ...cooler("molson-canadian", 0), hh: "h3", id: stockId("h3", "cooler", "drink", "molson-canadian") }];
  assert.deepEqual(coolersWith(stock, "molson-canadian", "h2").map(s => s.hh), ["h1"]);
  assert.deepEqual(coolersWith(stock, "molson-canadian").map(s => s.hh).sort(), ["h1", "h2"]);
});

test("putting the cooler away sends what's left back to the fridge and never counts as running low", () => {
  const stock = [cooler("molson-canadian", 5), cooler("molson-canadian-67", -1), fridge("molson-canadian", 1, { low: 2 })];
  assert.equal(coolerTotal(stock, "h1"), 5);
  assert.deepEqual(unloadMoves(stock, "h1").map(m => [m.fridgeId, m.n]),
    [["h1~fridge~drink~molson-canadian", 5], ["h1~fridge~drink~molson-canadian-67", 0]]);
  assert.deepEqual(lowStock(stock, "h1").map(s => s.where), ["fridge"]);
  assert.deepEqual(stockIn(stock, "h1", "cooler").map(s => s.item).sort(), ["molson-canadian", "molson-canadian-67"]);
});
