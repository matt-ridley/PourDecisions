// The Tab: gifts, balances between two people, the group's open tabs and history.
import { test } from "node:test";
import assert from "node:assert/strict";
import { giverOf, giftsIn, pair, balancesFor, openTabs, historyOf } from "../js/tab.js";

const g = (id, from, to, at, extra = {}) => ({ id, uid: to, givenBy: from, at, ...extra });
const logs = [
  g("1", "me", "dave", 1), g("2", "me", "dave", 2), g("3", "dave", "me", 3),
  { id: "4", uid: "sam", madeBy: "me", at: 4 },             // a cocktail made for Sam counts as given
  g("5", "sam", "dave", 5), g("6", "me", "dave", 6, { disputed: true }), // disputed: off the Tab
  { id: "7", uid: "me", at: 7 },                               // your own drink: not on the Tab
];

test("who gave a drink: givenBy, or the maker of a cocktail made for someone", () => {
  assert.equal(giverOf(logs[0]), "me");
  assert.equal(giverOf(logs[3]), "me");
  assert.equal(giverOf(logs[6]), null);
  assert.equal(giftsIn(logs).length, 5);
});

test("each pair has its own balance, and disputed drinks don't count", () => {
  assert.deepEqual(pair(logs, "me", "dave"), { given: 2, received: 1, net: 1 });
  assert.deepEqual(pair(logs, "dave", "me"), { given: 1, received: 2, net: -1 });
  assert.deepEqual(balancesFor(logs, "me").map(b => [b.id, b.net]), [["dave", 1], ["sam", 1]]);
});

test("open tabs across the group are never combined or passed on", () => {
  assert.deepEqual(openTabs(logs), [{ creditor: "me", debtor: "dave", n: 1 }, { creditor: "me", debtor: "sam", n: 1 },
    { creditor: "sam", debtor: "dave", n: 1 }].sort((x, y) => y.n - x.n));
  assert.ok(!openTabs([g("a", "x", "y", 1), g("b", "y", "x", 2)]).length, "even pairs aren't listed");
});

test("history between two people, newest first, with disputed drinks kept", () => {
  assert.deepEqual(historyOf(logs, "me", "dave").map(l => l.id), ["6", "3", "2", "1"]);
});
