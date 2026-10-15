// Crowns: one holder at a time, taken only by strictly passing the holder, never by volume.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DRINKS } from "../js/catalog/drinks.js";
import { CROWNS, crownHistory, crownsOf } from "../js/crowns.js";

const H = 3600000, now = 1_800_000_000_000;
let n = 0;
const log = (uid, drinkId, at, extra = {}) => ({ id: `l${n++}`, uid, kind: "drink", drinkId, at, ...extra });
const ipas = DRINKS.filter(d => /ipa/.test(d.style) && d.style !== "ipl").slice(0, 6);
const islays = DRINKS.filter(d => d.style === "islay").slice(0, 3);
const fromCountries = codes => codes.map(c => DRINKS.find(d => d.origin === c)).filter(Boolean);

test("ten crowns, each with a name, an icon and a minimum", () => {
  assert.equal(CROWNS.length, 10);
  for (const c of CROWNS) assert.ok(c.id && c.icon && c.name && c.about && c.min >= 1, c.id);
});

test("a crown needs the minimum, then moves only when someone strictly passes the holder", () => {
  const logs = [log("a", ipas[0].id, now), log("a", ipas[1].id, now + 1), log("b", ipas[0].id, now + 2), log("b", ipas[1].id, now + 3),
    log("a", ipas[2].id, now + 4), log("b", ipas[2].id, now + 5), log("b", ipas[3].id, now + 6)];
  const { holders, changes } = crownHistory(logs);
  const hop = changes.filter(c => c.crown === "hop-head");
  assert.deepEqual(hop.map(c => [c.uid, c.from, c.at]), [["a", null, now + 4], ["b", "a", now + 6]], "a at 3; b ties at 3 (no change), passes at 4");
  assert.deepEqual(holders.get("hop-head"), { uid: "b", value: 4, at: now + 6 });
});

test("volume never takes a crown: the same IPA ten times is one IPA", () => {
  const logs = [...ipas.slice(0, 3).map((d, k) => log("a", d.id, now + k)), ...Array.from({ length: 10 }, (_, k) => log("b", ipas[0].id, now + 10 + k))];
  assert.equal(crownHistory(logs).holders.get("hop-head").uid, "a");
});

test("peat freak, globetrotter and true north count the right things", () => {
  const abroad = fromCountries(["JP", "FR", "MX", "IE"]), canadian = DRINKS.filter(d => d.origin && d.origin.startsWith("CA")).slice(0, 5);
  const logs = [...islays.slice(0, 2).map((d, k) => log("a", d.id, now + k)), ...abroad.map((d, k) => log("b", d.id, now + 10 + k)),
    ...canadian.map((d, k) => log("c", d.id, now + 20 + k))];
  const { holders } = crownHistory(logs);
  assert.equal(holders.get("peat-freak").uid, "a");
  assert.equal(holders.get("globetrotter").uid, "b");
  assert.equal(holders.get("true-north").uid, "c");
  assert.equal(holders.get("explorer").uid, "b", "four countries and categories beat the rest");
  assert.deepEqual(crownsOf(holders, "a").map(c => c.id), ["peat-freak"]);
});

test("the mixologist is whoever made the most different cocktails, for anyone", () => {
  const logs = [log("a", "negroni", now, { kind: "cocktail", madeBy: "m" }), log("b", "manhattan", now + 1, { kind: "cocktail", madeBy: "m" }),
    log("x", "negroni", now + 2, { kind: "cocktail" })];
  const { holders } = crownHistory(logs);
  assert.deepEqual([holders.get("mixologist").uid, holders.get("mixologist").value], ["m", 2]);
});
