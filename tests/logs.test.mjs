// Logging a drink: sizes, cocktail strength, ratings, flavour tags, recent drinks and places.
import { test } from "node:test";
import assert from "node:assert/strict";
import { itemById, setMemberDrinks, search, allItems } from "../js/catalog.js";
import { sizesFor, defaultSize, sizeSet, recipeVolume, recipeAbv, itemAbv, logStd, cleanRating, tagsFor, TAGS, recentDrinks,
  drinkHistory, placesByUse, lastPlace, findPlace, SAME_NIGHT_MS } from "../js/logs.js";

const item = (kind, id) => itemById(kind, id);

test("each kind of drink gets sizes that fit it", () => {
  assert.equal(sizeSet(item("drink", "molson-canadian")), "BEER");
  assert.equal(defaultSize(item("drink", "molson-canadian")), "can");
  assert.equal(sizeSet(item("drink", "crown-royal-deluxe")), "SHOTS");
  assert.equal(defaultSize(item("drink", "crown-royal-deluxe")), "shot");
  assert.equal(sizeSet(item("drink", "la-marca-prosecco")), "FLUTE");
  assert.equal(sizeSet(item("drink", "grahams-six-grapes")), "SMALL");
  assert.equal(sizeSet(item("cocktail", "negroni")), "COCKTAIL");
  const beer = sizesFor(item("drink", "molson-canadian"));
  assert.deepEqual(beer.find(s => s.key === "bottle"), { key: "bottle", label: "Bottle", ml: 341 });
  for (const i of allItems()) for (const s of sizesFor(i)) assert.ok(s.ml >= 0 && s.label, `${i.id} ${s.key}`);
});

test("a cocktail's size and strength come from its recipe", () => {
  const negroni = item("cocktail", "negroni").data;
  assert.equal(recipeVolume(negroni), 89); // 3 oz
  assert.equal(recipeAbv(negroni), 26); // gin 40, Campari 25, vermouth 13: (40 + 25 + 13) / 3
  const [one, double] = sizesFor(item("cocktail", "negroni"));
  assert.equal(double.ml, one.ml * 2);
  assert.equal(recipeAbv(item("cocktail", "virgin-caesar").data), 0);
  assert.equal(itemAbv(item("drink", "molson-canadian")), 5);
});

test("standard drinks: a can of 5% beer is one", () => {
  assert.equal(logStd({ ml: 355, abv: 5 }), 1);
  assert.equal(logStd({ ml: 44, abv: 40 }), 1);
});

test("ratings are 0.5 to 5 in halves", () => {
  assert.equal(cleanRating(3.5), 3.5);
  assert.equal(cleanRating(4.26), 4.5);
  assert.equal(cleanRating(0), null);
  assert.equal(cleanRating(6), null);
  assert.equal(cleanRating(null), null);
});

test("flavour tags fit the drink, and their ids are unique", () => {
  assert.equal(new Set(TAGS.map(t => t.id)).size, TAGS.length);
  const ids = i => tagsFor(i).map(t => t.id);
  assert.ok(ids(item("drink", "laphroaig-10-year")).includes("peaty"));
  assert.ok(!ids(item("drink", "molson-canadian")).includes("peaty"));
  assert.ok(ids(item("cocktail", "negroni")).includes("bitter"));
  assert.ok(ids(item("cocktail", "virgin-mojito")).includes("real-thing"));
  for (const i of allItems()) assert.ok(tagsFor(i).length >= 5, `${i.id} has few tags`);
});

const H = 3600 * 1000, now = 100 * 24 * H;
const logs = [
  { id: "1", uid: "me", kind: "drink", drinkId: "molson-canadian", at: now - 1 * H, placeId: "keg" },
  { id: "2", uid: "me", kind: "drink", drinkId: "molson-canadian", at: now - 2 * H, placeId: "keg", rating: 3 },
  { id: "3", uid: "me", kind: "cocktail", drinkId: "caesar", at: now - 30 * H, placeId: "cottage", rating: 4 },
  { id: "4", uid: "pal", kind: "drink", drinkId: "guinness-draught", at: now - 3 * H, placeId: "pub" },
  { id: "5", uid: "pal", kind: "drink", drinkId: "guinness-draught", at: now - 4 * H, placeId: "pub" },
  { id: "6", uid: "pal", kind: "drink", drinkId: "guinness-draught", at: now - 5 * H, placeId: "pub" },
];

test("recent drinks: newest first, one per drink, only yours", () => {
  assert.deepEqual(recentDrinks(logs, "me").map(l => l.id), ["1", "3"]);
  assert.deepEqual(recentDrinks(logs, "pal").map(l => l.id), ["4"]);
});

test("drink history: count, average rating and last time", () => {
  assert.deepEqual(drinkHistory(logs, "me", "drink", "molson-canadian"), { count: 2, avg: 3, last: now - 1 * H });
  assert.deepEqual(drinkHistory(logs, "me", "drink", "guinness-draught"), { count: 0, avg: null, last: null });
});

test("places: yours first, then the group's favourites, then A to Z", () => {
  const places = [{ id: "pub", name: "The Pub" }, { id: "cottage", name: "Cottage" }, { id: "keg", name: "The Keg" }, { id: "zoo", name: "Abbey" }];
  assert.deepEqual(placesByUse(places, logs, "me").map(p => p.id), ["keg", "cottage", "pub", "zoo"]);
  assert.equal(findPlace(places, "  the   KEG ").id, "keg");
  assert.equal(findPlace(places, "Kegs"), null);
});

test("same night, same place: your last place is suggested within 6 hours", () => {
  assert.equal(lastPlace(logs, "me", now), "keg");
  assert.equal(lastPlace(logs, "me", now - 1 * H + SAME_NIGHT_MS + 1), null);
  assert.equal(lastPlace([], "me", now), null);
});

test("drinks members add show up in search and can be looked up", () => {
  setMemberDrinks([{ id: "Xy12AbCdEfGh", brand: "Backyard Brewing", name: "Patio Pils", style: "czech-pils", abv: 4.8, origin: "CA-ON", by: "me", at: 1 },
    { id: "bad", brand: "No Style", name: "", style: "not-a-style", abv: 5 }]);
  assert.equal(item("drink", "Xy12AbCdEfGh").title, "Backyard Brewing Patio Pils");
  assert.ok(item("drink", "Xy12AbCdEfGh").member);
  assert.equal(item("drink", "bad"), null, "a drink with an unknown style is skipped");
  assert.deepEqual(search("patio pils").map(i => i.id), ["Xy12AbCdEfGh"]);
  assert.equal(sizeSet(item("drink", "Xy12AbCdEfGh")), "BEER");
  setMemberDrinks([]);
  assert.equal(item("drink", "Xy12AbCdEfGh"), null);
});
