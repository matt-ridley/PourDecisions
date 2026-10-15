// The feed: nights grouped per person and place, reviews, new variants, House Pour changes, drinks added, filters.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { COCKTAILS } from "../js/catalog/cocktails.js";
import { setVariants, setFixes } from "../js/catalog.js";
import { startRows, buildVariant } from "../js/variants.js";
import { sessions, feedItems, filterFeed, hasOlder, houseChanges, sameHere, FEED_DAYS, postId, cheerId, cheersOn, commentsOn, cleanComment,
  firsts, recaps, outNow, topOfNight, countryOf, FIRSTS_AFTER } from "../js/feed.js";
import { DRINKS } from "../js/catalog/drinks.js";

afterEach(() => { setVariants([]); setFixes([]); });

const H = 3600000, D = 24 * H, now = 1_800_000_000_000;
const log = (uid, drinkId, at, extra = {}) => ({ id: `${uid}-${at}`, uid, kind: "drink", drinkId, title: drinkId, style: "x", size: "can", ml: 355, abv: 5, at, ...extra });
const sour = COCKTAILS.find(c => c.id === "whisky-sour");
const rowsWith = (edits = {}) => startRows(sour).map(x => ({ ...x, ...(edits[x.slot] || {}) }));

test("a night at one place is one card: same person, same place, each drink within 6 hours of the last", () => {
  const logs = [
    log("a", "bud-light", now - 10 * H, { placeId: "keg" }), log("a", "molson-canadian", now - 8 * H, { placeId: "keg" }),
    log("a", "guinness-draught", now - 3 * H, { placeId: "keg" }), // 5 h later: same night
    log("a", "bud-light", now - 2 * H, { placeId: "home" }),          // somewhere else
    log("b", "bud-light", now - 9 * H, { placeId: "keg" }),           // someone else
    log("a", "bud-light", now - 30 * H, { placeId: "keg" }),          // a day earlier
  ];
  const s = sessions(logs);
  assert.deepEqual(s.map(x => [x.uid, x.placeId, x.logs.length]).sort(), [["a", "home", 1], ["a", "keg", 1], ["a", "keg", 3], ["b", "keg", 1]].sort());
  const night = s.find(x => x.logs.length === 3);
  assert.deepEqual(night.logs.map(l => l.drinkId), ["guinness-draught", "molson-canadian", "bud-light"], "newest first");
  assert.equal(night.at, now - 3 * H); assert.equal(night.start, now - 10 * H);
});

test("a gap of 6 hours or more starts a new card, and a merged place counts as the one kept", () => {
  const places = [{ id: "keg" }, { id: "keg2", mergedInto: "keg" }];
  const s = sessions([log("a", "bud-light", now - 9 * H, { placeId: "keg" }), log("a", "bud-light", now - 8 * H, { placeId: "keg2" }),
    log("a", "bud-light", now - H, { placeId: "keg" })], places);
  assert.deepEqual(s.map(x => x.logs.length), [2, 1]);
});

test("drinks kept off the feed never show", () => {
  const s = sessions([log("a", "bud-light", now - H, { offFeed: true }), log("a", "molson-canadian", now)]);
  assert.equal(s.length, 1);
  assert.deepEqual(s[0].logs.map(l => l.drinkId), ["molson-canadian"]);
  assert.equal(sessions([log("a", "bud-light", now, { offFeed: true })]).length, 0);
});

test("the feed: nights, written reviews, new variants, House Pour changes and drinks added, newest first", () => {
  const a = buildVariant(sour, rowsWith({ 0: { drinkId: "dillons-rye-whisky" } }), { name: "Basement Sour" });
  setVariants([{ ...a, by: "m", at: now - 5 * H }]);
  const logs = [log("m", "whisky-sour", now - 5 * H, { kind: "cocktail", variantId: a.id }), log("x", "bud-light", now - 4 * H)];
  const ratings = [
    { uid: "x", kind: "variant", drinkId: a.id, rating: 4, review: "Lovely.", at: now - 3 * H, fromLog: false },
    { uid: "y", kind: "variant", drinkId: a.id, rating: 5, review: "", at: now - 2 * H, fromLog: false },
    { uid: "y", kind: "drink", drinkId: "bud-light", rating: 1, review: "old", at: now - H, fromLog: true },
  ];
  const drinks = [{ id: "d1", by: "x", at: now - H / 2, brand: "New" }, { id: "d2", by: "x", at: now, mergedInto: "d1" }];
  const items = feedItems({ logs, ratings, drinks });
  assert.deepEqual(items.map(i => [i.type, i.uid]), [["added", "x"], ["house", "m"], ["review", "x"], ["session", "x"], ["session", "m"], ["variant", "m"]]);
  assert.equal(items.find(i => i.type === "house").at, now - 2 * H, "crowned by the second rating");
});

test("House Pour changes are replayed in time order", () => {
  const a = buildVariant(sour, rowsWith({ 0: { drinkId: "dillons-rye-whisky" } })), b = buildVariant(sour, rowsWith({ 1: { oz: 1 } }));
  setVariants([{ ...a, by: "m", at: now - 9 * H }, { ...b, by: "x", at: now - 9 * H }]);
  const logs = [log("m", "whisky-sour", now - 9 * H, { kind: "cocktail", variantId: a.id }), log("x", "whisky-sour", now - 9 * H, { kind: "cocktail", variantId: b.id })];
  const r = (uid, v, rating, at) => ({ uid, kind: "variant", drinkId: v.id, rating, at });
  const changes = houseChanges(logs, [r("1", a, 4, now - 8 * H), r("2", a, 4, now - 7 * H), r("1", b, 5, now - 6 * H), r("2", b, 5, now - 5 * H)]);
  assert.deepEqual(changes.map(c => [c.variantId, c.at, c.uid]), [[a.id, now - 7 * H, "m"], [b.id, now - 5 * H, "x"]]);
});

test("filters: one person, a category (a night keeps only matching drinks), photos only, and the last few days", () => {
  const logs = [log("a", "bud-light", now - H, { hasPhoto: true }), log("a", "whisky-sour", now - 2 * H, { kind: "cocktail" }),
    log("b", "bud-light", now - 2 * H), log("a", "bud-light", now - 9 * D)];
  const items = feedItems({ logs, drinks: [{ id: "d1", by: "b", at: now - H }] });
  assert.equal(filterFeed(items, { now }).length, 3, "the last 7 days");
  assert.equal(filterFeed(items, { now, days: 14 }).length, 4);
  assert.deepEqual(filterFeed(items, { now, who: "b" }).map(i => i.type), ["added", "session"]);
  const beer = filterFeed(items, { now, who: "a", cat: "beer" });
  assert.equal(beer.length, 1); assert.deepEqual(beer[0].logs.map(l => l.drinkId), ["bud-light"]);
  const pics = filterFeed(items, { now, photos: true });
  assert.equal(pics.length, 1); assert.equal(pics[0].logs.length, 1);
  assert.equal(filterFeed(items, { now, cat: "cocktail" })[0].logs[0].drinkId, "whisky-sour");
  assert.ok(hasOlder(items, FEED_DAYS, now)); assert.ok(!hasOlder(items, 14, now));
});

test("same here: the same drink, now, at your place; a cocktail keeps its variant", () => {
  const f = sameHere(log("a", "guinness-draught", now - H, { size: "pint", ml: 568, placeId: "keg", notes: "x", rating: 4 }), { now, placeId: "home" });
  assert.deepEqual(f, { kind: "drink", drinkId: "guinness-draught", title: "Guinness Draught", style: f.style, size: "pint", ml: 568, at: now, placeId: "home", abv: f.abv });
  assert.ok(f.abv > 0 && f.style);
  const a = buildVariant(sour, rowsWith({ 0: { drinkId: "dillons-rye-whisky" } }), { name: "Basement Sour" });
  setVariants([{ ...a, by: "m", at: now }]);
  const c = sameHere(log("m", "whisky-sour", now - H, { kind: "cocktail", variantId: a.id, title: "Basement Sour", size: "one", ml: 104, abv: 25, madeBy: "z" }), { now });
  assert.equal(c.variantId, a.id); assert.equal(c.title, "Basement Sour"); assert.ok(!("madeBy" in c)); assert.equal(c.abv, 25);
  assert.equal(sameHere(log("a", "not-a-drink", now)), null);
  setFixes([{ id: "coors-light", mergedInto: "molson-canadian" }]);
  assert.equal(sameHere(log("a", "coors-light", now)).drinkId, "molson-canadian", "a merged drink logs as the one kept");
});

/* ---------- Cheers and comments ---------- */

test("post ids: a night keeps its id as drinks join it; each kind of post has its own prefix", () => {
  const first = log("a", "bud-light", now - 3 * H, { placeId: "keg" });
  const one = sessions([first])[0], two = sessions([first, log("a", "bud-light", now - H, { placeId: "keg" })])[0];
  assert.equal(postId(one), `s~${first.id}`);
  assert.equal(postId(two), postId(one), "same night, same post");
  assert.equal(postId({ type: "review", rating: { docId: "u_drink_x" } }), "r~u_drink_x");
  assert.equal(postId({ type: "variant", variantId: "whisky-sour~abc" }), "v~whisky-sour~abc");
  assert.equal(postId({ type: "house", variantId: "whisky-sour~abc" }), "h~whisky-sour~abc");
  assert.equal(postId({ type: "added", drinkId: "d1" }), "a~d1");
  assert.equal(cheerId("v~x", "u1"), "v~x|u1");
});

test("cheers and comments on a post, oldest first; comments are tidied and capped", () => {
  const cheers = [{ post: "p", uid: "b", at: 2 }, { post: "p", uid: "a", at: 1 }, { post: "q", uid: "c", at: 0 }];
  assert.deepEqual(cheersOn(cheers, "p"), ["a", "b"]);
  const comments = [{ id: "2", post: "p", at: 5 }, { id: "1", post: "p", at: 3 }, { id: "3", post: "q", at: 1 }];
  assert.deepEqual(commentsOn(comments, "p").map(c => c.id), ["1", "2"]);
  assert.equal(cleanComment("  Nice   one\t!  "), "Nice one !");
  assert.equal(cleanComment("a\n\n\n\nb"), "a\n\nb");
  assert.equal(cleanComment("x".repeat(400)).length, 300);
  assert.equal(cleanComment("   "), "");
});

/* ---------- Firsts, recaps and who's out ---------- */

// Real drinks for the firsts tests: n different lagers from Canada, then something new.
const lagers = DRINKS.filter(d => d.style === "am-lager" && d.origin && d.origin.startsWith("CA")).slice(0, 12);
const first = (uid, list, extra = {}) => list.map((d, k) => log(uid, d.id, now - (100 - k) * H, extra));

test("firsts start after the first few drinks: a new style or a new country gets a post", () => {
  const settle = first("a", lagers.slice(0, FIRSTS_AFTER));
  assert.deepEqual(firsts(settle).filter(f => f.what === "style" || f.what === "country"), [], "nothing while settling in");
  const scotch = DRINKS.find(d => d.style === "islay");
  const out = firsts([...settle, log("a", scotch.id, now)]);
  const mine = out.filter(f => f.logId === `a-${now}`).map(f => [f.what, f.label]);
  assert.deepEqual(mine, [["style", "Islay Single Malt"], ["country", "Scotland"]]);
  assert.equal(firsts([...settle, log("a", lagers[FIRSTS_AFTER].id, now)]).filter(f => f.at === now).length, 0, "another Canadian lager is nothing new");
});

test("milestones count variety: 10 different drinks, 10 different styles; repeats and volume don't count", () => {
  const ten = first("a", lagers.slice(0, 10));
  const m = firsts(ten).filter(f => f.what === "drinks");
  assert.deepEqual(m.map(f => [f.n, f.label]), [[10, "10 different drinks"]]);
  const same = Array.from({ length: 20 }, (_, k) => log("a", lagers[0].id, now - k * H));
  assert.deepEqual(firsts(same).filter(f => f.what === "drinks"), [], "20 of the same drink is 1 different drink");
  const styles = [...new Set(DRINKS.map(d => d.style))].slice(0, 10).map(st => DRINKS.find(d => d.style === st));
  assert.ok(firsts(first("b", styles)).some(f => f.what === "styles" && f.n === 10));
});

test("a first from a drink kept off the feed counts but doesn't post", () => {
  const settle = first("a", lagers.slice(0, FIRSTS_AFTER));
  const scotch = DRINKS.find(d => d.style === "islay");
  assert.deepEqual(firsts([...settle, log("a", scotch.id, now, { offFeed: true })]).filter(f => f.at === now), []);
  assert.equal(countryOf("CA-ON"), "CA"); assert.equal(countryOf("GB-SCT"), "GB-SCT"); assert.equal(countryOf(""), null);
});

test("night recaps: two or more people at one place, once the night is over", () => {
  const logs = [log("a", "bud-light", now - 10 * H, { placeId: "keg" }), log("b", "bud-light", now - 9 * H, { placeId: "keg" }),
    log("a", "guinness-draught", now - 8 * H, { placeId: "keg" }), log("c", "bud-light", now - 8 * H, { placeId: "home" }),
    log("b", "bud-light", now - 7.5 * H, { placeId: "keg", offFeed: true })];
  const r = recaps(logs, [], now);
  assert.equal(r.length, 1, "home had one person");
  assert.deepEqual(r[0].people, ["a", "b"]); assert.equal(r[0].logs.length, 3, "the drink kept off the feed is left out");
  assert.equal(r[0].start, now - 10 * H); assert.equal(r[0].at, now - 8 * H);
  assert.deepEqual(topOfNight(r[0]), { kind: "drink", drinkId: "bud-light", count: 2 });
  assert.equal(recaps(logs, [], now - 3 * H).length, 0, "not while the night is still going");
  assert.equal(postId(r[0]), `n~${logs[0].id}`);
  assert.equal(filterFeed([{ ...r[0] }], { now, who: "b" }).length, 1, "a recap shows when filtering by anyone who was there");
});

test("who's out: everyone else who logged in the last 2 hours, newest first, where they are", () => {
  const logs = [log("a", "bud-light", now - 30 * 60000, { placeId: "keg" }), log("a", "bud-light", now - 90 * 60000, { placeId: "home" }),
    log("b", "bud-light", now - 10 * 60000), log("c", "bud-light", now - 3 * H), log("me", "bud-light", now),
    log("d", "bud-light", now - 5 * 60000, { offFeed: true })];
  assert.deepEqual(outNow(logs, [], "me", now), [{ uid: "b", placeId: null, at: now - 10 * 60000 }, { uid: "a", placeId: "keg", at: now - 30 * 60000 }]);
});
