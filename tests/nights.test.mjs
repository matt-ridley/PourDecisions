// Drink Nights: which drinks belong to a night, when it's over, the Nightcap and what shows as Tonight.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nightLogs, nightStatus, nightcap, tonight, myLiveNight, perPerson } from "../js/nights.js";

const H = 3600000, T = 1_800_000_000_000;
const night = (extra = {}) => ({ id: "n1", host: "me", guests: ["me", "dave"], start: T, ...extra });
const log = (id, uid, at) => ({ id, uid, at, kind: "drink", drinkId: "molson-canadian" });
const logs = [log("before", "me", T - H), log("a", "me", T + H), log("b", "dave", T + 2 * H), log("c", "sam", T + 2 * H),
  log("d", "me", T + 5 * H), log("next-day", "me", T + 20 * H)];

test("a night's drinks: guests only, from the start, until a 6 hour gap (or the end time)", () => {
  assert.deepEqual(nightLogs(night(), logs).map(l => l.id), ["a", "b", "d"]);
  assert.deepEqual(nightLogs(night({ end: T + 3 * H }), logs).map(l => l.id), ["a", "b"]);
  assert.deepEqual(nightLogs(night({ guests: ["me", "dave", "sam"] }), logs).map(l => l.id), ["a", "b", "c", "d"]);
});

test("upcoming, live and over; the Nightcap is the last drink once it's over", () => {
  assert.equal(nightStatus(night(), logs, T - H).state, "upcoming");
  assert.equal(nightStatus(night(), logs, T + 6 * H).state, "live");
  assert.equal(nightStatus(night(), logs, T + 12 * H).state, "over");
  assert.equal(nightStatus(night({ end: T + 3 * H }), logs, T + 4 * H).state, "over");
  assert.equal(nightStatus(night(), [], T + 7 * H).state, "over", "nothing logged for 6 hours after the start");
  assert.equal(nightcap(night(), logs, T + 6 * H), null, "not over yet");
  assert.equal(nightcap(night(), logs, T + 12 * H).id, "d");
});

test("Tonight: live nights and ones starting within 12 hours; your live night", () => {
  const ns = [night({ id: "live" }), night({ id: "soon", start: T + 10 * H, guests: ["dave"] }), night({ id: "later", start: T + 30 * H })];
  assert.deepEqual(tonight(ns, logs, T + H).map(n => n.id), ["live", "soon"]);
  assert.equal(myLiveNight(ns, logs, "me", T + H).id, "live");
  assert.equal(myLiveNight(ns, logs, "sam", T + H), null);
});

test("drinks per person, most first", () => {
  assert.deepEqual(perPerson(nightLogs(night(), logs)), [{ uid: "me", n: 2 }, { uid: "dave", n: 1 }]);
});

import { roundPicks } from "../js/nights.js";

test("round picks: tonight's drinks, most had first, cocktails left out", () => {
  const list = [log("1", "me", 1), { ...log("2", "dave", 2), drinkId: "guinness" }, { ...log("3", "dave", 3), drinkId: "guinness" },
    log("4", "me", 4), { ...log("5", "me", 5), kind: "cocktail", drinkId: "caesar" }, { ...log("6", "sam", 6), drinkId: "corona" }];
  assert.deepEqual(roundPicks(list).map(p => [p.drinkId, p.n]), [["molson-canadian", 2], ["guinness", 2], ["corona", 1]]);
});

import { bringFor } from "../js/nights.js";

test("the bring list groups by who's bringing, in the order they signed up", () => {
  const bring = [{ id: "a", night: "n1", by: "dave", text: "Ice", at: 2 }, { id: "b", night: "n1", by: "me", text: "Chips", at: 1 },
    { id: "c", night: "n1", by: "dave", text: "12 Molson", at: 3 }, { id: "d", night: "n2", by: "me", text: "Other", at: 0 }];
  assert.deepEqual(bringFor(bring, "n1").map(g => [g.by, g.items.map(i => i.id)]), [["me", ["b"]], ["dave", ["a", "c"]]]);
});

import { nightRecap, nightItems, mornings } from "../js/nights.js";

test("a night's recap: totals, top drink, killed, poured, taken out, most generous, first to tap out, Nightcap", () => {
  const n = night({ guests: ["me", "dave", "sam"] });
  const list = [log("1", "me", T + H), log("2", "dave", T + H + 1), { ...log("3", "dave", T + 2 * H), givenBy: "me", from: "hh~fridge~drink~molson-canadian" },
    { ...log("4", "sam", T + 3 * H), drinkId: "crown", ml: 44, from: "hh~bar~drink~crown", killed: ["crown"] },
    { ...log("5", "me", T + 4 * H), drinkId: "crown", ml: 59, from: "hh~bar~drink~crown" }, { ...log("6", "sam", T + 5 * H), givenBy: "dave", disputed: true }];
  const r = nightRecap(n, list, T + 12 * H);
  assert.equal(r.total, 6);
  assert.deepEqual(r.top, { kind: "drink", drinkId: "molson-canadian", n: 4 });
  assert.deepEqual(r.killed, [{ drinkId: "crown", by: "sam" }]);
  assert.deepEqual(r.poured, [{ stockId: "hh~bar~drink~crown", item: "crown", ml: 103 }]);
  assert.deepEqual(r.takenOut, [{ stockId: "hh~fridge~drink~molson-canadian", item: "molson-canadian", n: 1 }]);
  assert.deepEqual(r.generous, { uid: "me", n: 1 }, "disputed gifts don't count");
  assert.deepEqual(r.firstOut, { uid: "dave", at: T + 2 * H });
  assert.equal(r.nightcap.logId, "6");
});

test("over nights become feed items (drinks kept off the feed left out); live ones don't", () => {
  const list = [log("a", "me", T + H), { ...log("b", "dave", T + 2 * H), offFeed: true }];
  assert.deepEqual(nightItems([night()], list, T + 3 * H), []);
  const [it] = nightItems([night()], list, T + 12 * H);
  assert.deepEqual([it.type, it.nightId, it.people, it.logs.map(l => l.id), it.at], ["night", "n1", ["me"], ["a"], T + H]);
});

test("the morning after: your night until noon the next day, with standard drinks and gifts", () => {
  const start = new Date(2026, 9, 16, 20).getTime(); // Friday 8 PM
  const n = night({ start });
  const list = [{ ...log("1", "me", start + H), ml: 355 }, { ...log("2", "me", start + 5 * H), givenBy: "dave" }, { ...log("3", "dave", start + 5 * H), givenBy: "me" }];
  const std = () => 1.2;
  const sat9 = new Date(2026, 9, 17, 9).getTime(), sat13 = new Date(2026, 9, 17, 13).getTime();
  const [m] = mornings([n], list, "me", std, sat9);
  assert.deepEqual([m.logs.length, m.std, m.gave, m.got], [2, 2.4, 1, 1]);
  assert.equal(mornings([n], list, "me", std, sat13).length, 0, "gone at noon");
  assert.equal(mornings([n], list, "sam", std, sat9).length, 0, "only nights you drank at");
});
