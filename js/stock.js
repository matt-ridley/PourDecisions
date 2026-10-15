/* The bar and the fridge: what each household has. Pure functions (no screen or Firebase code), so they can be tested
   with node.
   - households/{id}: { name, members: [uid], by, at }. One or more people who share a fridge and a bar. Everyone in
     the group can see every household; its members change it. Everything in it is shared.
   - stock/{hh~where~kind~item}: one document per thing, so two people changing stock at once never overwrite each other.
       where: "fridge" or "bar"; kind: "drink" (a drink in the list) or "ing" (a recipe ingredient, like lime juice)
       fridge drink: count (cans or bottles; Firestore increments, so changes made offline add up), low (warn at or below)
       bar drink:    size (bottle ml), left (ml in the open bottle), spares (sealed bottles of the same drink)
       ingredient:   out (true = ran out; kept on the list so it's easy to restock)
     by and at: who changed it last, and when. */
import { itemById, ingredientById, ingredientsOf } from "./catalog.js";
import { expandHave } from "./makeable.js";

export const RELOADS = [1, 6, 12, 15, 24, 30];
export const BOTTLE_SIZES = [200, 375, 750, 1000, 1140, 1750];
export const LEVELS = [[1, "Full"], [0.75, "¾"], [0.5, "½"], [0.25, "¼"], [0, "Empty"]];
// Cans and bottles go in the fridge; whisky, spirits and wine go in the bar.
const FRIDGE_CATS = ["beer", "cider-more", "na"];

export const stockId = (hh, where, kind, item) => `${hh}~${where}~${kind}~${item}`;

/* The household someone belongs to (the first, if a mistake ever put them in two). */
export const householdOf = (households, uid) => households.find(h => (h.members || []).includes(uid)) || null;

/* Where a new drink goes by default. */
export const defaultWhere = item => item && item.category && FRIDGE_CATS.includes(item.category.id) ? "fridge" : "bar";

/* A household's stock in one place, with each entry's catalogue item. Entries whose drink or ingredient is no longer
   in the list are left out. Fridge: most recently changed first. Bar: bottles A to Z, then ingredients A to Z. */
export function stockIn(stock, hh, where) {
  const rows = stock.filter(s => s.hh === hh && s.where === where).map(s => ({ ...s, thing: thingOf(s) })).filter(s => s.thing);
  if (where === "fridge") return rows.sort((a, b) => (b.at || 0) - (a.at || 0));
  return rows.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "drink" ? -1 : 1) || a.thing.title.localeCompare(b.thing.title));
}

/* The drink (catalogue item) or ingredient an entry is for, as { title, ... }. */
export function thingOf(s) {
  if (s.kind === "ing") { const g = ingredientById(s.item); return g ? { title: g.name, ing: g } : null; }
  const i = itemById("drink", s.item);
  return i ? { title: i.title, item: i } : null;
}

export const fridgeCount = s => Math.max(0, s.count || 0);
export const isLow = s => s.where === "fridge" && s.low != null && fridgeCount(s) <= s.low;

/* How full the open bottle is, to the nearest quarter (0 to 1). A sip left still shows as ¼, never Empty. */
export function level(s) {
  if (!s.size) return 0;
  const f = Math.min(1, Math.max(0, (s.left || 0) / s.size));
  return f <= 0 ? 0 : Math.max(0.25, Math.round(f * 4) / 4);
}
export const levelText = s => LEVELS.find(([f]) => f === level(s))[1];

/* Is it there to use? A fridge drink with any left, a bar bottle with something in it (or a spare), an ingredient not out. */
export function onHand(s) {
  if (s.kind === "ing") return !s.out;
  if (s.where === "fridge") return fridgeCount(s) > 0;
  return (s.left || 0) > 0 || (s.spares || 0) > 0;
}

/* Every recipe ingredient a household has, for What can I make. Bottles count as everything they count as
   (Crown Royal is Rye, Canadian whisky and Whisky); ingredients also cover what they cover (see makeable.js). */
export function haveFromStock(stock, hh, covers) {
  const ids = [];
  for (const s of stock) {
    if (s.hh !== hh || !onHand(s)) continue;
    if (s.kind === "ing") ids.push(s.item);
    else { const i = itemById("drink", s.item); if (i) ids.push(...ingredientsOf(i.data)); }
  }
  return expandHave(ids, covers);
}

/* Members who aren't in any household yet, so they can be added to one. */
export const homeless = (members, households) => members.filter(m => !householdOf(households, m.id));

/* ---------- Drinks taking stock out ---------- */

/* What pouring `ml` from a bar bottle does. The pour that empties the open bottle kills it (credit to whoever poured);
   if there's a spare, it's opened for the rest of the pour. Returns { killed, inc } to take ml off with an increment
   (safe when two phones pour at once), or { killed, set } when a spare is opened. An empty bottle with no spare gives
   null: nothing to pour from. */
export function pourFrom(s, ml) {
  const left = s.left || 0, spares = s.spares || 0;
  if (left <= 0) return spares ? { killed: false, set: { left: Math.max(0, s.size - ml), spares: spares - 1 } } : null;
  const killed = left - ml <= 0;
  if (killed && spares) return { killed, set: { left: Math.max(0, s.size + left - ml), spares: spares - 1 } };
  return { killed, inc: -ml };
}

/* Where a drink could come from at home: your household's fridge or bar entries for it that have some left. */
export const sourcesFor = (stock, hh, drinkId) => !hh ? [] : ["fridge", "bar"]
  .map(where => stock.find(s => s.id === stockId(hh, where, "drink", drinkId)))
  .filter(s => s && onHand(s));

/* What making a cocktail takes out: each picked bottle that's in your bar loses what was poured (all servings); a picked
   drink that's only in your fridge (the beer in a Boilermaker) loses one per serving. Rows: Make it's rows (drinkId, oz). */
export function makePours(rows, servings, stock, hh, mlPerOz) {
  const out = new Map();
  for (const r of rows) {
    if (!r.drinkId) continue;
    const [first] = sourcesFor(stock, hh, r.drinkId).sort((a, b) => (a.where === "bar" ? 0 : 1) - (b.where === "bar" ? 0 : 1));
    if (!first) continue;
    const p = out.get(first.id) || { entry: first, drinkId: r.drinkId, ml: 0, n: 0 };
    if (first.where === "bar") p.ml += (r.oz || 0) * mlPerOz * servings; else p.n = servings;
    out.set(first.id, p);
  }
  return [...out.values()].filter(p => p.n || p.ml > 0).map(p => ({ ...p, ml: Math.round(p.ml) }));
}

/* Killed the bottle: every bottle someone poured the last drop of, newest first. The credit goes to whoever poured
   (the maker of a drink made for someone else). */
export const emptiesOf = (logs, uid) => logs.filter(l => (l.madeBy || l.uid) === uid && Array.isArray(l.killed))
  .flatMap(l => l.killed.map(drinkId => ({ drinkId, at: l.at, logId: l.id }))).sort((a, b) => b.at - a.at);

/* What's running low in a household, for alerts: fridge drinks at or below their warning, bottles down to ¼ or empty
   with no spare, and ingredients marked out. */
export function lowStock(stock, hh) {
  return stock.filter(s => s.hh === hh).map(s => ({ ...s, thing: thingOf(s) })).filter(s => s.thing && (
    s.kind === "ing" ? s.out : s.where === "fridge" ? isLow(s) : !s.spares && level(s) <= 0.25));
}
