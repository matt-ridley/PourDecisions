// Catalogue moderation in the app: corrections laid over built-in drinks, merges, admins' styles, merged places.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setFixes, setMemberDrinks, setStyles, itemById, rawItem, resolveId, search, allItems, everyItem, countIn,
  styleOf, aboutStyle, ingredientsOf, browse } from "../js/catalog.js";
import { recentDrinks, drinkHistory, placesByUse, resolvePlace, findPlace } from "../js/logs.js";

afterEach(() => { setFixes([]); setMemberDrinks([]); setStyles([]); });

test("a correction is laid over the built-in drink, and removing it brings the original back", () => {
  assert.equal(itemById("drink", "molson-canadian").data.abv, 5);
  setFixes([{ id: "molson-canadian", abv: 5.2, approx: true, town: "Toronto" }]);
  const i = itemById("drink", "molson-canadian");
  assert.equal(i.data.abv, 5.2);
  assert.equal(i.data.town, "Toronto");
  assert.ok(i.fixed);
  assert.ok(search("molson toronto").some(x => x.id === "molson-canadian"), "search sees the fix");
  setFixes([]);
  assert.equal(itemById("drink", "molson-canadian").data.abv, 5);
});

test("a fix can change a drink's style and the ingredients it counts as", () => {
  setFixes([{ id: "molson-canadian", style: "am-light", ing: ["stout"] }]);
  const d = itemById("drink", "molson-canadian").data;
  assert.equal(styleOf(d.style).style.name, "Light Lager");
  assert.ok(ingredientsOf(d).includes("stout"));
  setFixes([{ id: "molson-canadian", style: "no-such-style" }]);
  assert.equal(itemById("drink", "molson-canadian").data.style, "am-lager", "a fix to a missing style is ignored");
});

test("a merged member drink is hidden and looks up as the drink kept", () => {
  setMemberDrinks([{ id: "Dup1234567890abcdefg", brand: "Molson", name: "Canadian Lager", style: "am-lager", abv: 5, by: "m", at: 1, mergedInto: "molson-canadian" }]);
  assert.equal(itemById("drink", "Dup1234567890abcdefg").id, "molson-canadian");
  assert.equal(rawItem("drink", "Dup1234567890abcdefg").title, "Molson Canadian Lager");
  assert.equal(resolveId("drink", "Dup1234567890abcdefg"), "molson-canadian");
  assert.ok(!allItems().some(i => i.id === "Dup1234567890abcdefg"));
  assert.ok(everyItem().some(i => i.id === "Dup1234567890abcdefg"));
  assert.ok(!search("canadian lager").some(i => i.id === "Dup1234567890abcdefg"));
  const before = countIn("beer");
  setMemberDrinks([]);
  assert.equal(countIn("beer"), before, "merged drinks don't count");
});

test("a built-in drink can be merged too, merges chain, and loops stop", () => {
  setFixes([{ id: "molson-canadian-67", mergedInto: "molson-canadian" }, { id: "molson-canadian", mergedInto: "budweiser" }]);
  assert.equal(itemById("drink", "molson-canadian-67").id, "budweiser");
  setFixes([{ id: "molson-canadian", mergedInto: "budweiser" }, { id: "budweiser", mergedInto: "molson-canadian" }]);
  assert.ok(["molson-canadian", "budweiser"].includes(itemById("drink", "molson-canadian").id), "a loop doesn't hang");
});

test("logs of a merged drink count as the drink kept", () => {
  setMemberDrinks([{ id: "Dup1234567890abcdefg", brand: "Molson", name: "Canadian Lager", style: "am-lager", abv: 5, by: "m", at: 1, mergedInto: "molson-canadian" }]);
  const logs = [
    { id: "1", uid: "me", kind: "drink", drinkId: "Dup1234567890abcdefg", at: 3, rating: 4 },
    { id: "2", uid: "me", kind: "drink", drinkId: "molson-canadian", at: 2, rating: 2 },
  ];
  assert.equal(recentDrinks(logs, "me").length, 1);
  assert.deepEqual(drinkHistory(logs, "me", "drink", "molson-canadian"), { count: 2, avg: 3, last: 3 });
});

test("admins' styles: renames, new styles with descriptions, and drinks in a new style", () => {
  setStyles([{ id: "helles", name: "Munich Helles", about: "Our description." }, { id: "cold-brew-ale", name: "Cold Brew Ale", family: "beer/specialty-beer", about: "With coffee." }]);
  assert.equal(styleOf("helles").style.name, "Munich Helles");
  assert.equal(aboutStyle("helles"), "Our description.");
  assert.equal(styleOf("cold-brew-ale").category.id, "beer");
  assert.equal(aboutStyle("cold-brew-ale"), "With coffee.");
  setMemberDrinks([{ id: "Cb1234567890abcdefgh", brand: "Beaus", name: "Cold Brew", style: "cold-brew-ale", abv: 5, by: "m", at: 1 }]);
  assert.ok(browse("beer").families.find(f => f.id === "specialty-beer").styles.find(s => s.id === "cold-brew-ale").items.length === 1);
  setStyles([]);
  assert.equal(styleOf("helles").style.name, "Helles");
  assert.equal(styleOf("cold-brew-ale"), null);
  assert.equal(itemById("drink", "Cb1234567890abcdefgh"), null, "a drink in a removed style is hidden");
});

test("merged places: left out of the picker, and their logs count for the place kept", () => {
  const places = [{ id: "a", name: "The Keg" }, { id: "b", name: "Keg", mergedInto: "a" }, { id: "c", name: "Cottage" }];
  const logs = [{ uid: "me", placeId: "b", at: 1 }, { uid: "me", placeId: "b", at: 2 }, { uid: "me", placeId: "c", at: 3 }];
  assert.deepEqual(placesByUse(places, logs, "me").map(p => p.id), ["a", "c"]);
  assert.equal(resolvePlace(places, "b").name, "The Keg");
  assert.equal(findPlace(places, "keg"), null, "a merged name isn't offered again");
});
