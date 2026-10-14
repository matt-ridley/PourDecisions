// Checks the built-in catalog is consistent, and that search and titles behave.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, STYLE_INDEX } from "../js/catalog/styles.js";
import { DRINKS, ORIGINS } from "../js/catalog/drinks.js";
import { COCKTAILS } from "../js/catalog/cocktails.js";
import { drinkTitle, normalize, search, browse, ITEMS, itemById } from "../js/catalog.js";
import { slug } from "../js/catalog/make.js";

test("style ids are unique across the whole tree", () => {
  const ids = CATEGORIES.flatMap(c => c.families.flatMap(f => f.styles.map(s => s.id)));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(STYLE_INDEX.size, ids.length);
});

test("beer and whisky come first", () => {
  assert.deepEqual(CATEGORIES.slice(0, 2).map(c => c.id), ["beer", "whisky"]);
});

test("every drink has a unique id, a real style, a sensible ABV and a known origin", () => {
  assert.equal(new Set(DRINKS.map(d => d.id)).size, DRINKS.length);
  for (const d of DRINKS) {
    assert.ok(STYLE_INDEX.has(d.style), `${d.id}: unknown style ${d.style}`);
    assert.ok(typeof d.abv === "number" && d.abv >= 0 && d.abv <= 80, `${d.id}: ABV ${d.abv}`);
    assert.ok(d.brand, `${d.id}: no brand`);
    if ("origin" in d) assert.ok(ORIGINS[d.origin], `${d.id}: unknown origin ${d.origin}`);
  }
});

test("every category has at least one sample", () => {
  for (const c of CATEGORIES) assert.ok(ITEMS.some(i => i.category.id === c.id), c.id);
});

test("every cocktail recipe is complete and points at a cocktail style", () => {
  assert.equal(new Set(COCKTAILS.map(c => c.id)).size, COCKTAILS.length);
  for (const c of COCKTAILS) {
    const s = STYLE_INDEX.get(c.style);
    assert.ok(s && s.category.id === "cocktail", `${c.id}: style ${c.style}`);
    assert.ok(c.ingredients.length >= 2 && c.steps.length >= 1 && c.glass && c.method, c.id);
    for (const i of c.ingredients) assert.ok(i.item && ((i.oz > 0 && !("qty" in i)) || (i.qty && !("oz" in i))), `${c.id}: ${JSON.stringify(i)}`);
  }
});

test("titles join brand, name and flavour without repeating the brand", () => {
  assert.equal(drinkTitle({ brand: "Crown Royal", name: "", variant: "Peach" }), "Crown Royal Peach");
  assert.equal(drinkTitle({ brand: "Molson", name: "Canadian" }), "Molson Canadian");
  assert.equal(drinkTitle({ brand: "Heineken", name: "Heineken 0.0" }), "Heineken 0.0");
  assert.equal(drinkTitle({ brand: "Bud Light", name: "", variant: "Lime" }), "Bud Light Lime");
});

test("normalize drops accents and punctuation", () => {
  assert.equal(normalize("Jägermeister"), "jagermeister");
  assert.equal(normalize("  Beau's Lug-Tread "), "beau s lug tread");
});

test("search matches every word, ignores accents and puts title starts first", () => {
  assert.deepEqual(search("jager").map(i => i.id), ["jagermeister"]);
  assert.ok(search("crown peach").some(i => i.id === "crown-royal-peach"));
  assert.ok(!search("crown peach").some(i => i.id === "crown-royal-deluxe"));
  assert.equal(search("molson")[0].id, "molson-canadian");
  assert.equal(search("lot")[0].id, "lot-no-40-canadian-rye"); // "Lot No. 40" starts with it
  // Styles and origins are searchable too.
  assert.ok(search("islay").some(i => i.id === "lagavulin-16-year"));
  assert.ok(search("ontario lager").some(i => i.id === "labatt-blue"));
  // Cocktails by ingredient.
  assert.ok(search("clamato").some(i => i.id === "caesar"));
});

test("search can be limited to one category", () => {
  const r = search("", { category: "whisky" });
  assert.ok(r.length > 0 && r.every(i => i.category.id === "whisky"));
  assert.ok(!search("dillon", { category: "whisky" }).some(i => i.id === "dillons-unfiltered-gin-22"));
});

test("browse lists every family and style of a category with its items", () => {
  const b = browse("whisky");
  const rye = b.families.find(f => f.id === "canadian").styles.find(s => s.id === "cdn-rye");
  for (const id of ["dillons-rye-whisky", "lot-no-40-canadian-rye"]) assert.ok(rye.items.some(i => i.id === id), id);
  assert.ok(rye.items.every(i => i.style.id === "cdn-rye"));
  assert.equal(browse("nope"), null);
  assert.equal(itemById("cocktail", "caesar").title, "Caesar");
});

test("drink ids are tidy slugs made from the title", () => {
  for (const d of DRINKS) assert.match(d.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, d.id);
  assert.equal(slug("Dillon's Unfiltered Gin 22"), "dillons-unfiltered-gin-22");
  assert.equal(slug("Kahlúa Coffee Liqueur"), "kahlua-coffee-liqueur");
});

test("the full list is deep where the group drinks most, Ontario first", () => {
  const n = id => DRINKS.filter(d => STYLE_INDEX.get(d.style).category.id === id).length;
  assert.ok(n("beer") >= 300 && n("whisky") >= 200, `beer ${n("beer")}, whisky ${n("whisky")}`);
  assert.ok(DRINKS.filter(d => d.origin === "CA-ON").length >= 250);
  // Within beer and wine, the Ontario entries come before the imports.
  for (const cat of ["beer", "wine"]) {
    const list = DRINKS.filter(d => STYLE_INDEX.get(d.style).category.id === cat);
    assert.equal(list[0].origin, "CA-ON", `${cat} starts with Ontario`);
  }
});

test("towns are searchable", () => {
  assert.ok(search("guelph").some(i => i.id === "sleeman-cream-ale"));
  assert.ok(search("county pinot").some(i => i.id === "norman-hardie-county-pinot-noir"));
});
