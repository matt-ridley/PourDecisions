// Alerts: cheers and comments on your posts, replies, your variants made and rated, drinks made for you, House Pours.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { COCKTAILS } from "../js/catalog/cocktails.js";
import { setVariants } from "../js/catalog.js";
import { startRows, buildVariant } from "../js/variants.js";
import { alertsFor, unreadCount, ALERT_DAYS } from "../js/alerts.js";

afterEach(() => { setVariants([]); });

const H = 3600000, D = 24 * H, now = 1_800_000_000_000;
const sour = COCKTAILS.find(c => c.id === "whisky-sour");
const mine = buildVariant(sour, startRows(sour).map(r => r.slot === 0 ? { ...r, drinkId: "dillons-rye-whisky" } : r), { name: "Basement Sour" });
const theirs = buildVariant(sour, startRows(sour).map(r => r.slot === 1 ? { ...r, oz: 1 } : r));
const setup = () => setVariants([{ ...mine, by: "me", at: now - 9 * D }, { ...theirs, by: "dave", at: now - 9 * D }]);
const kinds = list => list.map(a => [a.kind, a.from.join()]);

test("cheers on your posts: one alert per post, everyone who cheered, newest first; yours and others' posts don't count", () => {
  const cheers = [{ post: "s~1", uid: "dave", to: "me", at: now - 3 * H }, { post: "s~1", uid: "sam", to: "me", at: now - H },
    { post: "s~1", uid: "me", to: "me", at: now }, { post: "s~2", uid: "sam", to: "dave", at: now }, { post: "v~x", uid: "dave", to: "me", at: now - 40 * D }];
  const a = alertsFor("me", { cheers, now });
  assert.deepEqual(kinds(a), [["cheer", "sam,dave"]]);
  assert.equal(a[0].at, now - H); assert.equal(a[0].post, "s~1");
});

test("comments on your posts, and replies on posts you commented on after you did", () => {
  const comments = [
    { post: "s~1", uid: "dave", to: "me", text: "Nice!", at: now - 2 * H },
    { post: "s~9", uid: "sam", to: "dave", text: "Before you", at: now - 5 * H },
    { post: "s~9", uid: "me", to: "dave", text: "Mine", at: now - 4 * H },
    { post: "s~9", uid: "sam", to: "dave", text: "Agreed", at: now - 3 * H },
    { post: "s~8", uid: "sam", to: "dave", text: "Not your thread", at: now - H },
  ];
  const a = alertsFor("me", { comments, now });
  assert.deepEqual(a.map(x => [x.kind, x.text]), [["comment", "Nice!"], ["reply", "Agreed"]]);
});

test("friends making your variant, and making a drink for you", () => {
  setup();
  const logs = [
    { id: "1", uid: "dave", kind: "cocktail", drinkId: "whisky-sour", variantId: mine.id, at: now - H },
    { id: "2", uid: "sam", madeBy: "dave", kind: "cocktail", drinkId: "whisky-sour", variantId: mine.id, at: now - 2 * H },
    { id: "3", uid: "me", kind: "cocktail", drinkId: "whisky-sour", variantId: mine.id, at: now },
    { id: "4", uid: "me", madeBy: "sam", kind: "cocktail", drinkId: "whisky-sour", variantId: theirs.id, at: now - 3 * H },
    { id: "5", uid: "dave", kind: "cocktail", drinkId: "whisky-sour", variantId: theirs.id, at: now },
    { id: "6", uid: "dave", kind: "cocktail", drinkId: "whisky-sour", variantId: mine.id, at: now - 4 * H, offFeed: true },
  ];
  assert.deepEqual(kinds(alertsFor("me", { logs, now })), [["made", "dave"], ["made", "dave"], ["madeFor", "sam"]]);
});

test("ratings of your variants, and House Pours won and lost", () => {
  setup();
  const logs = [{ id: "1", uid: "me", kind: "cocktail", drinkId: "whisky-sour", variantId: mine.id, at: now - 8 * D },
    { id: "2", uid: "dave", kind: "cocktail", drinkId: "whisky-sour", variantId: theirs.id, at: now - 8 * D }];
  const r = (uid, v, rating, at) => ({ uid, kind: "variant", drinkId: v.id, rating, at });
  const ratings = [r("dave", mine, 4, now - 6 * H), r("sam", mine, 4, now - 5 * H), r("me", theirs, 5, now - 4 * H), r("sam", theirs, 5, now - 3 * H)];
  const a = alertsFor("me", { logs, ratings, now });
  // Sam's rating is what crowned it, so the two share a time.
  assert.deepEqual(kinds(a), [["houseLost", "dave"], ["rated", "sam"], ["houseWon", ""], ["rated", "dave"]]);
  assert.equal(a.find(x => x.kind === "houseLost").variantId, theirs.id);
});

test("only the last 30 days, and unread means newer than when you last looked", () => {
  const cheers = [{ post: "s~1", uid: "dave", to: "me", at: now - 2 * H }, { post: "s~2", uid: "dave", to: "me", at: now - (ALERT_DAYS + 1) * D }];
  const a = alertsFor("me", { cheers, now });
  assert.equal(a.length, 1);
  assert.equal(unreadCount(a, 0), 1);
  assert.equal(unreadCount(a, now - 3 * H), 1);
  assert.equal(unreadCount(a, now - H), 0);
});

test("crowns: you took one, or someone took yours", () => {
  const crowns = [{ type: "crown", crown: "globetrotter", uid: "me", from: null, at: now - 3 * H, value: 3 },
    { type: "crown", crown: "globetrotter", uid: "dave", from: "me", at: now - H, value: 4 },
    { type: "crown", crown: "hop-head", uid: "sam", from: "dave", at: now, value: 3 }];
  assert.deepEqual(alertsFor("me", { crowns, now }).map(a => [a.kind, a.crown, a.from.join()]),
    [["crownLost", "globetrotter", "dave"], ["crownWon", "globetrotter", ""]]);
});

test("things running low at home are alerts, dated when they last changed, within the last 30 days", () => {
  const low = [{ id: "h~fridge~drink~a", at: now - H }, { id: "h~bar~ing~b", at: now - 40 * D }];
  const list = alertsFor("me", { low, now });
  assert.deepEqual(list.map(a => [a.kind, a.stock.id]), [["low", "h~fridge~drink~a"]]);
});

test("a friend giving you a drink is an alert; giving one yourself isn't", () => {
  const logs = [{ id: "g1", uid: "me", givenBy: "dave", at: now - H, kind: "drink", drinkId: "molson-canadian" },
    { id: "g2", uid: "dave", givenBy: "me", at: now - H, kind: "drink", drinkId: "molson-canadian" }];
  assert.deepEqual(kinds(alertsFor("me", { logs, now })), [["given", "dave"]]);
});

test("the giver hears when a drink they gave is disputed", () => {
  const logs = [{ id: "d1", uid: "dave", givenBy: "me", disputed: true, at: now - 2 * H, editedAt: now - H, kind: "drink", drinkId: "molson-canadian" }];
  const list = alertsFor("me", { logs, now });
  assert.deepEqual(list.map(a => [a.kind, a.from.join(), a.at]), [["disputed", "dave", now - H]]);
  assert.ok(!alertsFor("dave", { logs, now }).some(a => a.kind === "disputed"));
});
