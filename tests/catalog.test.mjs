// Checks the built-in catalog is consistent, and that search and titles behave.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, STYLE_INDEX } from "../js/catalog/styles.js";
import { DRINKS, ORIGINS } from "../js/catalog/drinks.js";
import { COCKTAILS } from "../js/catalog/cocktails.js";
import { INGREDIENTS, INGREDIENT_INDEX } from "../js/catalog/ingredients.js";
import { drinkTitle, normalize, search, browse, ITEMS, itemById, ingredientsOf, drinksFor, cocktailsUsing, missingFor } from "../js/catalog.js";
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

test("every cocktail recipe is complete and points at a cocktail (or mocktail) style", () => {
  assert.equal(new Set(COCKTAILS.map(c => c.id)).size, COCKTAILS.length);
  for (const c of COCKTAILS) {
    const s = STYLE_INDEX.get(c.style);
    assert.ok(s && (s.category.id === "cocktail" || c.style === "mocktail"), `${c.id}: style ${c.style}`);
    assert.ok(c.ingredients.length >= 1 && c.steps.length >= 1 && c.glass && c.method && typeof c.garnish === "string", c.id);
    for (const i of c.ingredients) assert.ok(i.item && ((i.oz > 0 && !("qty" in i)) || (i.qty && !("oz" in i))), `${c.id}: ${JSON.stringify(i)}`);
  }
});

test("the cocktail list is full: 150+ recipes, the original 12 ids kept, Caesar variants", () => {
  assert.ok(COCKTAILS.length >= 150, `${COCKTAILS.length} recipes`);
  for (const id of ["caesar", "old-fashioned", "manhattan", "negroni", "whisky-sour", "margarita", "daiquiri", "mojito",
    "moscow-mule", "aperol-spritz", "espresso-martini", "hot-toddy"]) assert.ok(itemById("cocktail", id), id);
  assert.ok(COCKTAILS.filter(c => c.ingredients.some(x => x.ing.includes("clamato"))).length >= 6);
});

test("every recipe ingredient is a known ingredient, and every ingredient is used", () => {
  assert.equal(new Set(INGREDIENTS.map(g => g.id)).size, INGREDIENTS.length);
  const used = new Set();
  for (const c of COCKTAILS) for (const x of c.ingredients) for (const id of x.ing) {
    assert.ok(INGREDIENT_INDEX.has(id), `${c.id}: unknown ingredient ${id}`);
    used.add(id);
  }
  for (const g of INGREDIENTS) assert.ok(used.has(g.id), `${g.id} isn't used by any recipe`);
});

test("ingredients point at real categories, families, styles and drinks", () => {
  const families = new Set(CATEGORIES.flatMap(c => c.families.map(f => f.id)));
  for (const g of INGREDIENTS) {
    for (const id of g.cats || []) assert.ok(CATEGORIES.some(c => c.id === id), `${g.id}: category ${id}`);
    for (const id of g.families || []) assert.ok(families.has(id), `${g.id}: family ${id}`);
    for (const id of [...(g.styles || []), ...(g.not || [])]) assert.ok(STYLE_INDEX.has(id), `${g.id}: style ${id}`);
    for (const id of g.drinks || []) assert.ok(itemById("drink", id), `${g.id}: drink ${id}`);
  }
});

test("bottles count as the right ingredients", () => {
  const of = id => ingredientsOf(itemById("drink", id).data);
  assert.deepEqual(of("crown-royal-deluxe"), ["whisky", "rye", "canadian-whisky", "crown-royal"]);
  assert.ok(of("lot-no-40-canadian-rye").includes("rye"));
  assert.ok(!of("fireball-cinnamon-whisky").includes("whisky"), "flavoured whisky isn't plain whisky");
  assert.deepEqual(of("campari"), ["campari"]);
  assert.ok(drinksFor("sweet-vermouth").every(i => i.data.style === "vermouth"));
  assert.ok(cocktailsUsing("campari").some(i => i.id === "negroni"));
});

test("what a recipe still needs: choices, optional and pantry items", () => {
  const r = id => itemById("cocktail", id).data;
  assert.deepEqual(missingFor(r("manhattan"), ["rye", "sweet-vermouth"]).map(x => x.ing), [["angostura"]]);
  assert.equal(missingFor(r("manhattan"), ["rye", "sweet-vermouth", "angostura"]).length, 0);
  assert.equal(missingFor(r("old-fashioned"), ["bourbon", "simple-syrup", "angostura"]).length, 0, "bourbon covers rye or bourbon");
  assert.equal(missingFor(r("whisky-sour"), ["whisky", "lemon-juice", "simple-syrup"]).length, 0, "egg white is optional");
  assert.equal(missingFor(r("hot-toddy"), ["whisky", "honey", "lemon-juice"]).length, 0, "hot water is pantry");
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
  assert.deepEqual(search("jager").map(i => i.id), ["jagerbomb", "jagermeister", "jagermeister-cold-brew-coffee", "jagermeister-manifest"]);
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
  assert.ok(n("beer") >= 300 && n("whisky") >= 500 && n("spirits") >= 450, `beer ${n("beer")}, whisky ${n("whisky")}, spirits ${n("spirits")}`);
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

test("every category, family and style has a short description, and nothing else does", async () => {
  const { ABOUT_CATEGORY, ABOUT_FAMILY, ABOUT_STYLE } = await import("../js/catalog/about.js");
  const ok = (t, what) => assert.ok(typeof t === "string" && t.length >= 15 && t.length <= 200, `${what}: ${t && t.length} chars`);
  const fams = [], styles = [];
  for (const c of CATEGORIES) {
    ok(ABOUT_CATEGORY[c.id], c.id);
    for (const f of c.families) { fams.push(`${c.id}/${f.id}`); ok(ABOUT_FAMILY[`${c.id}/${f.id}`], `${c.id}/${f.id}`); for (const s of f.styles) { styles.push(s.id); ok(ABOUT_STYLE[s.id], s.id); } }
  }
  assert.deepEqual(Object.keys(ABOUT_CATEGORY).sort(), CATEGORIES.map(c => c.id).sort());
  assert.deepEqual(Object.keys(ABOUT_FAMILY).sort(), fams.sort());
  assert.deepEqual(Object.keys(ABOUT_STYLE).sort(), styles.sort());
});
