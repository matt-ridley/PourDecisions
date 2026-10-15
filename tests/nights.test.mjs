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
