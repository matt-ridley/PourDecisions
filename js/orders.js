/* Bar Menu / Order up: guests order from a bar's menu on their phones, the household sees the queue and taps Served.
   Pure functions (no screen or Firebase code), so they can be tested with node.
   - orders/{id}: { hh, by (who ordered), kind ("cocktail" | "drink"), item (its id), note?, state ("waiting" | "served" |
     "cancelled"), at, servedBy?, logId? }
   - A bar takes orders while it's open: its household opened it (households.open), or a hosted night there is on.
   - Served drinks go on the Tab like any drink made or given for someone. */
import { itemById } from "./catalog.js";
import { menuOf, stockIn, fridgeCount } from "./stock.js";
import { nightStatus } from "./nights.js";

export const ORDER_HOURS = 12; // orders older than this drop off the queue and your list

/* Is the bar taking orders? */
export const barIsOpen = (h, nights = [], logs = [], now = Date.now()) => !!h.open
  || nights.some(n => n.hh === h.id && nightStatus(n, logs, now).state === "live");

/* What can be ordered right now: menu cocktails the bar can make, then drinks in its fridge and cooler.
   [{ kind, item }] */
export function orderable(h, stock, covers) {
  const cocktails = menuOf(h, stock, covers).filter(m => !m.missing.length).map(m => ({ kind: "cocktail", item: m.item }));
  const seen = new Set(), drinks = [];
  for (const s of [...stockIn(stock, h.id, "fridge"), ...stockIn(stock, h.id, "cooler")]) {
    if (s.kind !== "drink" || fridgeCount(s) <= 0 || seen.has(s.item)) continue;
    seen.add(s.item); drinks.push({ kind: "drink", item: s.thing.item });
  }
  return [...cocktails, ...drinks.sort((a, b) => a.item.title.localeCompare(b.item.title))];
}

const recent = (o, now) => now - o.at < ORDER_HOURS * 3600000;

/* A bar's queue: orders still waiting, oldest first. */
export const queueOf = (orders, hh, now = Date.now()) => orders.filter(o => o.hh === hh && o.state === "waiting" && recent(o, now))
  .sort((a, b) => a.at - b.at);

/* Your orders from the last 12 hours, newest first. */
export const ordersBy = (orders, me, now = Date.now()) => orders.filter(o => o.by === me && recent(o, now)).sort((a, b) => b.at - a.at);

/* What an order is for (the catalogue item), or null if it's gone from the list. */
export const orderItem = o => itemById(o.kind, o.item);
