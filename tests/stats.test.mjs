// Variety stats: what counts, the score, the board, totals, and the private volume numbers.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setFixes, setVariants, itemById } from "../js/catalog.js";
import { DRINKS } from "../js/catalog/drinks.js";
import { COCKTAILS } from "../js/catalog/cocktails.js";
import { startRows, buildVariant } from "../js/variants.js";
import { POINTS, countsOf, varietyOf, scoreOf, board, totals, volumeOf, firstsInGroup, countryList, flagOf, tryNext } from "../js/stats.js";
import { allItems } from "../js/catalog.js";

afterEach(() => { setFixes([]); setVariants([]); });

const H = 3600000, D = 24 * H;
const now = new Date(2026, 9, 15, 20, 0).getTime(); // a Thursday evening
const log = (uid, drinkId, at = now, extra = {}) => ({ uid, kind: "drink", drinkId, at, ml: 355, abv: 5, ...extra });
const islay = DRINKS.find(d => d.style === "islay"), lager = DRINKS.find(d => d.style === "am-lager" && d.origin === "CA-ON");

test("what a log counts as: drink, style, family, category and country", () => {
  const c = countsOf(log("a", islay.id));
  assert.equal(c.drink, `drink:${islay.id}`); assert.equal(c.style, "islay"); assert.equal(c.category, "whisky");
  assert.ok(c.family.startsWith("whisky/")); assert.equal(c.country, "GB-SCT");
  assert.equal(countsOf(log("a", lager.id)).country, "CA", "Ontario counts as Canada");
  assert.equal(countsOf(log("a", "nope")), null);
  const cocktail = countsOf({ uid: "a", kind: "cocktail", drinkId: "negroni", at: now });
  assert.equal(cocktail.category, "cocktail"); assert.equal(cocktail.country, null);
});

test("the score only grows with something new: repeats score nothing", () => {
  const one = varietyOf([log("a", islay.id)]);
  assert.equal(one.score, POINTS.drink + POINTS.style + POINTS.family + POINTS.country + POINTS.category);
  assert.equal(varietyOf([log("a", islay.id), log("a", islay.id), log("a", islay.id)]).score, one.score);
  const two = varietyOf([log("a", islay.id), log("a", lager.id)]);
  assert.equal(two.score, 2 * one.score, "a different drink, style, family, country and category");
  assert.equal(scoreOf(two), two.score);
  assert.deepEqual([...two.byCategory.keys()].sort(), ["beer", "whisky"]);
});

test("a merged duplicate counts as the drink kept, and a cocktail variant as its cocktail", () => {
  setFixes([{ id: "coors-light", mergedInto: "molson-canadian" }]);
  assert.equal(varietyOf([log("a", "coors-light"), log("a", "molson-canadian")]).drinks.size, 1);
  const sour = COCKTAILS.find(c => c.id === "whisky-sour");
  const v = buildVariant(sour, startRows(sour).map(r => r.slot === 0 ? { ...r, drinkId: islay.id } : r));
  setVariants([{ ...v, by: "a", at: now }]);
  const s = varietyOf([{ uid: "a", kind: "cocktail", drinkId: "whisky-sour", variantId: v.id, at: now }, { uid: "a", kind: "cocktail", drinkId: "whisky-sour", at: now }]);
  assert.equal(s.drinks.size, 1);
});

test("drinks kept off the feed still count", () => {
  assert.equal(varietyOf([log("a", islay.id, now, { offFeed: true })]).drinks.size, 1);
});

test("the board: by score, then styles, then drinks; ties share a rank; volume never helps", () => {
  const logs = [log("a", islay.id), log("a", lager.id), ...Array.from({ length: 30 }, () => log("b", lager.id)), log("c", islay.id), log("d", lager.id)];
  const b = board(logs, ["a", "b", "c", "d", "e"]);
  assert.equal(b[0].uid, "a");
  assert.equal(b.find(r => r.uid === "b").score, b.find(r => r.uid === "d").score, "30 of the same lager = 1 lager");
  assert.equal(b.find(r => r.uid === "b").rank, b.find(r => r.uid === "d").rank);
  assert.equal(b[b.length - 1].uid, "e"); assert.equal(b[b.length - 1].score, 0);
});

test("totals: how much there is to try", () => {
  const t = totals();
  assert.ok(t.styles > 250); assert.equal(t.categories, 7);
  assert.ok(t.countries > 50 && t.countries < 90, `${t.countries} countries`);
  assert.equal([...t.byCategory.values()].reduce((a, b) => a + b, 0), t.styles);
});

test("private volume: this week from Monday, this month, this year, and the 8-week average", () => {
  const logs = [log("a", lager.id, now - 1 * H, { ml: 355, abv: 5 }), log("a", lager.id, now - 3 * D, { ml: 355, abv: 5 }), // Mon 12 Oct: this week
    log("a", lager.id, now - 5 * D), log("a", lager.id, now - 20 * D), log("a", lager.id, now - 200 * D), log("a", lager.id, now + H)];
  const v = volumeOf(logs, now);
  assert.equal(v.week.drinks, 2); assert.equal(v.week.std, 2.1, "1.04 + 1.04, rounded once");
  assert.equal(v.month.drinks, 3, "Oct 1 to now");
  assert.equal(v.year.drinks, 5, "not the future one");
  assert.equal(v.avg8.drinks, 0.3, "2 drinks in the 8 weeks before this one");
});

/* ---------- Passports and Try next ---------- */

test("who tried each style and country first in the group", () => {
  const f = firstsInGroup([log("b", islay.id, now - H), log("a", islay.id, now - 2 * H), log("b", lager.id, now - 3 * H)]);
  assert.deepEqual(f.styles.get("islay"), { uid: "a", at: now - 2 * H });
  assert.equal(f.countries.get("CA").uid, "b"); assert.equal(f.countries.get("GB-SCT").uid, "a");
});

test("the country list: every country once, A to Z, with how many drinks come from it; flags", () => {
  const list = countryList(allItems());
  assert.equal(list.length, totals().countries);
  assert.ok(list.find(c => c.code === "CA").drinks > 300, "provinces add up into Canada");
  assert.ok(!list.some(c => c.code === "CA-ON"));
  assert.deepEqual(list.map(c => c.name), [...list.map(c => c.name)].sort((a, b) => a.localeCompare(b)));
  assert.equal(flagOf("CA"), "🇨🇦"); assert.equal(flagOf("GB-NIR"), "🇬🇧"); assert.notEqual(flagOf("GB-SCT"), flagOf("GB-ENG"));
});

test("try next: untried styles, the group's favourites first, each with a drink to try", () => {
  const stout = DRINKS.find(d => d.style === "dry-irish-stout") || DRINKS.find(d => /stout/.test(d.style));
  const logs = [log("me", lager.id), log("b", islay.id), log("b", stout.id), log("c", stout.id)];
  const ratings = [{ uid: "b", kind: "drink", drinkId: islay.id, rating: 5 }, { uid: "b", kind: "drink", drinkId: stout.id, rating: 3 }];
  const t = tryNext(logs, ratings, "me", allItems());
  assert.deepEqual(t.slice(0, 2).map(x => [x.style, x.avg, x.triedBy]), [["islay", 5, 1], [stout.style, 3, 2]]);
  assert.equal(t[0].drink.id, islay.id, "the group's best-rated in that style");
  assert.ok(!t.some(x => x.style === lager.style), "not a style you've had");
  assert.equal(tryNext([], [], "me", allItems()).length, 0, "nothing to go on yet");
});
