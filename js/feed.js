/* The feed: what everyone's pouring, worked out from what every phone already has (logs, ratings, cocktail variants
   and drinks members added), so it costs no extra reads and works offline.
   Pure functions (no screen or Firebase code), so they can be tested with node.

   Items, newest first ({ type, at, uid, ... }):
     session  one person's drinks at one place in one night: { uid, placeId, logs (newest first), start, at }
     review   a rating with a written review: { rating }
     variant  a new cocktail variant someone made: { variantId, base }
     house    a variant became its cocktail's House Pour: { variantId, base }
     added    a drink a member added to the list: { drinkId }
   Logs kept off the feed (offFeed) never show. The feed never shows amounts: how much is a personal stat. */
import { itemById, resolveId } from "./catalog.js";
import { resolvePlace, SAME_NIGHT_MS } from "./logs.js";
import { rankVariants, madeVariants, asItem } from "./variants.js";

export const FEED_DAYS = 7;
const DAY = 86400000;

const placeKey = (places, id) => id ? (resolvePlace(places, id) || { id }).id : "";

/* One person's logs grouped into nights: same place, each drink within 6 hours of the one before. */
export function sessions(logs, places = []) {
  const by = new Map();
  for (const l of logs.filter(l => !l.offFeed).sort((a, b) => a.at - b.at)) {
    if (!by.has(l.uid)) by.set(l.uid, []);
    by.get(l.uid).push(l);
  }
  const out = [];
  for (const [uid, list] of by) {
    let cur = null;
    for (const l of list) {
      const place = placeKey(places, l.placeId);
      if (cur && cur.placeId === place && l.at - cur.at < SAME_NIGHT_MS) { cur.logs.unshift(l); cur.at = l.at; continue; }
      cur = { type: "session", uid, placeId: place, logs: [l], start: l.at, at: l.at };
      out.push(cur);
    }
  }
  return out;
}

/* When each cocktail's House Pour changed hands, replaying the group's variant ratings in time order:
   [{ type: "house", variantId, base, at, uid (the variant's maker) }]. */
export function houseChanges(logs, ratings) {
  const out = [];
  const bases = new Set(ratings.filter(r => r.kind === "variant").map(r => (itemById("variant", r.drinkId) || {}).base).filter(Boolean));
  for (const base of bases) {
    const made = madeVariants(base, logs), ids = new Set(made.map(x => x.item.id));
    const rs = ratings.filter(r => r.kind === "variant" && ids.has(r.drinkId)).sort((a, b) => a.at - b.at);
    let holder = null;
    for (let k = 0; k < rs.length; k++) {
      const top = rankVariants(made, rs.slice(0, k + 1)).find(x => x.house);
      const id = top ? top.item.id : null;
      if (id && id !== holder) out.push({ type: "house", variantId: id, base, at: rs[k].at, uid: top.item.data.by });
      holder = id;
    }
  }
  return out;
}

/* Everything in the feed, newest first. `ratings` is everyone's ratings (ratings.allRatings); `drinks` the drinks
   members added (store.drinks). */
export function feedItems({ logs = [], ratings = [], drinks = [], places = [] }) {
  const items = [...sessions(logs, places)];
  for (const r of ratings) if (!r.fromLog && r.review) items.push({ type: "review", uid: r.uid, at: r.at, rating: r });
  const bases = new Set(logs.filter(l => l.variantId).map(l => (itemById("variant", l.variantId) || {}).base).filter(Boolean));
  for (const base of bases) for (const x of madeVariants(base, logs)) {
    items.push({ type: "variant", uid: x.item.data.by, at: x.item.data.at || 0, variantId: x.item.id, base });
  }
  items.push(...houseChanges(logs, ratings));
  for (const d of drinks) if (!d.mergedInto && d.by && d.at) items.push({ type: "added", uid: d.by, at: d.at, drinkId: d.id });
  return items.sort((a, b) => b.at - a.at);
}

/* ---------- Filters ---------- */
/* What a feed item is about, for the category filter: category ids ("beer", "cocktail"). */
function categoriesOf(item) {
  const cat = (kind, id) => { const i = kind === "variant" ? asItem(id) : itemById(kind, id); return i && i.category ? i.category.id : null; };
  if (item.type === "session") return item.logs.map(l => cat(l.kind, l.drinkId));
  if (item.type === "review") return [cat(item.rating.kind, item.rating.drinkId)];
  if (item.type === "variant" || item.type === "house") return ["cocktail"];
  if (item.type === "added") return [cat("drink", item.drinkId)];
  return [];
}

/* Filters: who (a uid, or "" for everyone), cat (a category id or ""), photos (only drinks with a photo), and the
   last `days` days. A session filtered by category or photos keeps only the drinks that match. */
export function filterFeed(items, { who = "", cat = "", photos = false, days = FEED_DAYS, now = Date.now() } = {}) {
  const from = now - days * DAY, out = [];
  for (const it of items) {
    if (it.at < from || (who && it.uid !== who)) continue;
    if (it.type === "session" && (cat || photos)) {
      const logs = it.logs.filter(l => (!photos || l.hasPhoto) && (!cat || categoriesOf({ type: "session", logs: [l] })[0] === cat));
      if (logs.length) out.push({ ...it, logs });
      continue;
    }
    if (photos) continue;
    if (cat && !categoriesOf(it).includes(cat)) continue;
    out.push(it);
  }
  return out;
}

/* Is there anything older than the window, for "Show more"? */
export const hasOlder = (items, days, now = Date.now()) => items.some(it => it.at < now - days * DAY);

/* ---------- Same here ---------- */
/* Log fields for having the same drink as a friend's log, now: the same drink (or the same cocktail variant, one
   serving). Amounts: the friend's size for a drink when it's a standard one, since how much is yours to change later.
   Returns fields for cloud.saveLog, or null when the drink is gone from the list. */
export function sameHere(log, { now = Date.now(), placeId = null } = {}) {
  const item = itemById(log.kind, log.drinkId);
  if (!item) return null;
  const base = { kind: log.kind, drinkId: item.id, title: log.title, style: item.style ? item.style.id : log.style,
    size: log.size, ml: log.ml, at: now, placeId };
  if (log.kind === "cocktail") {
    const v = log.variantId && itemById("variant", log.variantId);
    return { ...base, size: "one", abv: log.abv, ...(v ? { variantId: resolveId("variant", v.id) } : {}) };
  }
  return { ...base, title: item.title, abv: item.data.abv || 0 };
}
