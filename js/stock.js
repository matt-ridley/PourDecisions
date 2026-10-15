/* The bar and the fridge: what each household has. Pure functions (no screen or Firebase code), so they can be tested
   with node.
   - households/{id}: { name, members: [uid], by, at }. One or more people who share a fridge and a bar. Everyone in
     the group can see every household; its members change it. Everything in it is shared.
   - stock/{hh~where~kind~item}: one document per thing, so two people changing stock at once never overwrite each other.
       where: "fridge", "bar" or "cooler"; kind: "drink" (a drink in the list) or "ing" (a recipe ingredient, like lime juice)
       fridge drink: count (cans or bottles; Firestore increments, so changes made offline add up), low (warn at or below)
       cooler drink: count, like the fridge. A household's cooler is loaded from its fridge for a night out, anyone in
                     the group can take a drink from it, and what's left goes back in the fridge afterwards.
       bar drink:    size (bottle ml), left (ml in the open bottle), spares (sealed bottles of the same drink)
       ingredient:   out (true = ran out; kept on the list so it's easy to restock)
     by and at: who changed it last, and when. */
import { itemById, ingredientById, ingredientsOf, missingFor } from "./catalog.js";
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
  if (where !== "bar") return rows.sort((a, b) => (b.at || 0) - (a.at || 0));
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
  if (s.where !== "bar") return fridgeCount(s) > 0;
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

/* Where a drink could come from at home: your household's cooler (when it's out), fridge or bar entries for it that
   have some left, in that order. */
export const sourcesFor = (stock, hh, drinkId) => !hh ? [] : ["cooler", "fridge", "bar"]
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
    s.kind === "ing" ? s.out : s.where === "fridge" ? isLow(s) : s.where === "bar" && !s.spares && level(s) <= 0.25));
}

/* ---------- Coolers ---------- */

/* Other households' coolers with this drink in them, for a friend to take one from. */
export const coolersWith = (stock, drinkId, exceptHh = null) => stock.filter(s => s.where === "cooler" && s.kind === "drink"
  && s.item === drinkId && s.hh !== exceptHh && fridgeCount(s) > 0);

/* How many drinks are in a household's cooler (0 = it's not out). */
export const coolerTotal = (stock, hh) => stock.filter(s => s.hh === hh && s.where === "cooler").reduce((n, s) => n + fridgeCount(s), 0);

/* Putting the cooler away: each drink left in it goes back in the fridge (n), and every cooler entry is cleared. */
export const unloadMoves = (stock, hh) => stock.filter(s => s.hh === hh && s.where === "cooler")
  .map(s => ({ cooler: s, fridgeId: stockId(hh, "fridge", s.kind, s.item), n: fridgeCount(s) }));

/* ---------- Planning a night: everyone's bars together ---------- */

/* The households of the people at a night (each once), with what each has. [{ hh, people: [uid], have: Set }] */
export function nightBars(stock, households, guests, covers) {
  const out = new Map();
  for (const g of guests) {
    const h = householdOf(households, g);
    if (!h) continue;
    if (!out.has(h.id)) out.set(h.id, { hh: h.id, name: h.name, people: [], have: haveFromStock(stock, h.id, covers) });
    out.get(h.id).people.push(g);
  }
  return [...out.values()];
}

/* Everything the bars together have. */
export const combinedHave = bars => new Set(bars.flatMap(b => [...b.have]));

/* What a recipe needs from someone else's bar: the lines the base bar (the host's) doesn't cover, each with the bars
   that do. Optional lines and kitchen basics are never needed. [{ line, from: [bar] }] */
export const borrowNeeds = (recipe, baseHave, bars) => recipe.ingredients
  .filter(x => !x.optional && !x.ing.every(id => (ingredientById(id) || {}).pantry) && !x.ing.some(id => baseHave.has(id)))
  .map(x => ({ line: x, from: bars.filter(b => x.ing.some(id => b.have.has(id))) }));

/* ---------- A bar's page ---------- */
/* The menu: the cocktails a household picked, each with what's missing right now (none = can make it). Cocktails no
   longer in the list are left out. [{ item, missing: [line] }] */
export const menuOf = (h, stock, covers) => {
  const have = haveFromStock(stock, h.id, covers);
  return (h.menu || []).map(id => itemById("cocktail", id)).filter(Boolean).map(item => ({ item, missing: missingFor(item.data, have) }));
};

/* A signature drink stored as "kind:id" (a drink or a cocktail), or null. */
export const signatureOf = h => { if (!h.signature) return null; const [kind, ...id] = h.signature.split(":"); return itemById(kind, id.join(":")); };

/* ---------- The LCBO run ---------- */
/* A household's shopping list, the same for everyone in it (it's worked out from the stock):
   - low:  fridge drinks at their warning, bottles at ¼ or empty with no spare, ingredients marked out
   - star: the one thing missing for a cocktail someone in the household starred (each ingredient once, listing the
           cocktails it would make and who starred them), unless it's already on the low list
   [{ key, type: "low" | "star", entry?, ing?: [ids], title, why }] */
export function runList(stock, h, members, covers) {
  const have = haveFromStock(stock, h.id, covers), out = [], seen = new Set();
  for (const s of lowStock(stock, h.id)) {
    const why = s.kind === "ing" ? "Out" : s.where === "fridge" ? `${fridgeCount(s)} left` : level(s) === 0 ? "Empty, no spare" : `Down to ${levelText(s)}, no spare`;
    out.push({ key: s.id, type: "low", entry: s, title: s.thing.title, why });
    if (s.kind === "ing") seen.add(s.item); else ingredientsOf(s.thing.item.data).forEach(id => seen.add(id));
  }
  const stars = new Map();
  for (const m of members.filter(m => (h.members || []).includes(m.id))) {
    for (const id of m.starred || []) {
      const item = itemById("cocktail", id);
      if (!item) continue;
      const miss = missingFor(item.data, have);
      if (miss.length !== 1 || miss[0].ing.some(i => seen.has(i))) continue;
      const key = miss[0].ing.join("|"), cur = stars.get(key) || { key: `star~${key}`, type: "star", ing: miss[0].ing, title: miss[0].item, cocktails: [], by: [] };
      if (!cur.cocktails.includes(item.title)) cur.cocktails.push(item.title);
      if (!cur.by.includes(m.displayName)) cur.by.push(m.displayName);
      stars.set(key, cur);
    }
  }
  for (const s of stars.values()) out.push({ ...s, why: `For ${s.cocktails.join(", ")} (⭐ ${s.by.join(", ")})` });
  return out;
}

/* The list as text, for the phone's share sheet. */
export const runText = (h, list) => [`🛒 LCBO run for ${h.name}`, ...list.map(r => `- ${r.title} (${r.why})`)].join("\n");
