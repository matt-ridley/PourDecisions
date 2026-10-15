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
