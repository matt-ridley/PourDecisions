// Bar Menu / Order up: when a bar is open, what can be ordered, the queue and your orders.
import { test } from "node:test";
import assert from "node:assert/strict";
import { coverMap } from "../js/makeable.js";
import { stockId } from "../js/stock.js";
import { barIsOpen, orderable, queueOf, ordersBy, orderItem } from "../js/orders.js";

const covers = coverMap(), T = 1_800_000_000_000, H = 3600000;
const h = { id: "h1", menu: ["whisky-sour", "negroni"] };
const st = (where, kind, item, f) => ({ id: stockId("h1", where, kind, item), hh: "h1", where, kind, item, ...f });
const stock = [st("bar", "drink", "crown-royal-deluxe", { size: 750, left: 500 }), st("bar", "ing", "lemon-juice", {}), st("bar", "ing", "simple-syrup", {}),
  st("fridge", "drink", "molson-canadian", { count: 6 }), st("fridge", "drink", "molson-canadian-67", { count: 0 }), st("cooler", "drink", "molson-canadian", { count: 2 })];

test("a bar is open when its household opens it, or a hosted night there is on", () => {
  assert.ok(barIsOpen({ ...h, open: true }));
  assert.ok(!barIsOpen(h, [], [], T));
  const night = { id: "n", hh: "h1", start: T - H, guests: ["me"] };
  assert.ok(barIsOpen(h, [night], [], T));
  assert.ok(!barIsOpen(h, [{ ...night, end: T - 1 }], [], T));
});

test("what can be ordered: menu cocktails it can make now, then fridge and cooler drinks (each once, some left)", () => {
  assert.deepEqual(orderable(h, stock, covers).map(o => [o.kind, o.item.id]), [["cocktail", "whisky-sour"], ["drink", "molson-canadian"]]);
});

test("the queue is waiting orders, oldest first; your orders are the last 12 hours, newest first", () => {
  const orders = [{ id: "a", hh: "h1", by: "dave", state: "waiting", at: T - 2 * H }, { id: "b", hh: "h1", by: "me", state: "waiting", at: T - H },
    { id: "c", hh: "h1", by: "me", state: "served", at: T - 30 * 60000 }, { id: "d", hh: "h2", by: "me", state: "waiting", at: T },
    { id: "old", hh: "h1", by: "me", state: "waiting", at: T - 13 * H }];
  assert.deepEqual(queueOf(orders, "h1", T).map(o => o.id), ["a", "b"]);
  assert.deepEqual(ordersBy(orders, "me", T).map(o => o.id), ["d", "c", "b"]);
  assert.equal(orderItem({ kind: "cocktail", item: "manhattan" }).title, "Manhattan");
});
