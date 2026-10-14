// Ratings and reviews: one rating per person per drink, older log ratings carried over, group summaries.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setFixes } from "../js/catalog.js";
import { ratingId, allRatings, ratingOf, drinkSummary, topRated, toRate } from "../js/ratings.js";

afterEach(() => { setFixes([]); });

const H = 3600000, now = 1_800_000_000_000;
const rate = (uid, drinkId, rating, extra = {}) => ({ uid, kind: "drink", drinkId, rating, at: now - H, ...extra });
const log = (uid, drinkId, extra = {}) => ({ uid, kind: "drink", drinkId, at: now - H, ...extra });

test("one rating document per person per drink", () => {
  assert.equal(ratingId("u1", "drink", "bud-light"), "u1_drink_bud-light");
  assert.notEqual(ratingId("u1", "drink", "x"), ratingId("u1", "cocktail", "x"));
});

test("an older rated log counts as the rating until the drink is rated the new way", () => {
  const logs = [log("me", "bud-light", { rating: 2, tags: ["light"], at: now - 5 * H }), log("me", "bud-light", { rating: 3, at: now - 2 * H }),
    log("me", "bud-light", { at: now - H })];
  let list = allRatings([], logs);
  assert.equal(list.length, 1, "one rating, not one per log");
  assert.equal(ratingOf(list, "me", "drink", "bud-light").rating, 3, "the latest rated log");
  assert.ok(ratingOf(list, "me", "drink", "bud-light").fromLog);
  list = allRatings([rate("me", "bud-light", 1.5, { at: now - 10 * H, review: "Water." })], logs);
  const r = ratingOf(list, "me", "drink", "bud-light");
  assert.equal(r.rating, 1.5, "a real rating wins, even if older than the logs");
  assert.equal(r.review, "Water.");
  assert.ok(!r.fromLog);
});

test("logs without stars aren't ratings", () => {
  assert.deepEqual(allRatings([], [log("me", "bud-light", { tags: ["light"] })]), []);
  assert.equal(ratingOf(allRatings([], []), "me", "drink", "bud-light"), null);
});

test("a merged duplicate's ratings count for the drink kept, newest per person", () => {
  setFixes([{ id: "coors-light", mergedInto: "molson-canadian" }]);
  const list = allRatings([rate("me", "coors-light", 2, { at: now - 3 * H }), rate("me", "molson-canadian", 4)], []);
  assert.equal(list.length, 1);
  assert.equal(list[0].drinkId, "molson-canadian");
  assert.equal(list[0].rating, 4);
  assert.equal(ratingOf(list, "me", "drink", "coors-light").rating, 4, "looking up the duplicate finds the kept one");
});

test("the group on a drink: average, count, top flavours and reviews newest first", () => {
  const list = allRatings([
    rate("a", "guinness-draught", 4, { tags: ["roasty", "creamy"], review: "Classic.", at: now - 3 * H }),
    rate("b", "guinness-draught", 4.5, { tags: ["creamy"], review: "Silky.", at: now - H }),
    rate("c", "guinness-draught", 3, { tags: [] }),
    rate("a", "bud-light", 1),
  ], []);
  const s = drinkSummary(list, "drink", "guinness-draught");
  assert.equal(s.count, 3);
  assert.equal(s.avg, 3.8);
  assert.deepEqual(s.tags, [["creamy", 2], ["roasty", 1]]);
  assert.deepEqual(s.reviews.map(r => r.review), ["Silky.", "Classic."]);
  assert.deepEqual(drinkSummary(list, "drink", "corona-extra"), { count: 0, avg: null, tags: [], reviews: [] });
});

test("top rated: best average first, then most ratings, with an optional filter", () => {
  const list = allRatings([rate("a", "x", 5), rate("a", "y", 4), rate("b", "y", 5), rate("a", "z", 4), rate("b", "z", 5), rate("c", "z", 4.5)], []);
  assert.deepEqual(topRated(list).map(d => [d.drinkId, d.avg, d.count]), [["x", 5, 1], ["z", 4.5, 3], ["y", 4.5, 2]]);
  assert.deepEqual(topRated(list, (k, id) => id !== "x").map(d => d.drinkId), ["z", "y"]);
});

test("drinks to rate: logged in the last day, not rated, one per drink", () => {
  const logs = [log("me", "bud-light", { at: now - H }), log("me", "bud-light", { at: now - 2 * H }), log("me", "guinness-draught", { at: now - 3 * H }),
    log("me", "corona-extra", { at: now - 30 * H }), log("you", "stella-artois", { at: now - H })];
  const list = allRatings([rate("me", "guinness-draught", 4)], logs);
  assert.deepEqual(toRate(list, logs, "me", now).map(l => l.drinkId), ["bud-light"]);
});
