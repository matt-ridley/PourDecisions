/* The feed: what everyone's pouring, worked out from what every phone already has (logs, ratings, cocktail variants
   and drinks members added), so it costs no extra reads and works offline.
   Pure functions (no screen or Firebase code), so they can be tested with node.

   Items, newest first ({ type, at, uid, ... }):
     session  one person's drinks at one place in one night: { uid, placeId, logs (newest first), start, at }
     review   a rating with a written review: { rating }
     variant  a new cocktail variant someone made: { variantId, base }
     house    a variant became its cocktail's House Pour: { variantId, base }
     added    a drink a member added to the list: { drinkId }
     first    a first or a milestone: { what: "style" | "country" | "drinks" | "styles", label, n?, logId }
     recap    a night at one place with two or more people, once it's over: { people, placeId, logs, start }
     crown    a crown changed hands: { crown, from, value } (see crowns.js; passed in as `crowns`)
     night    a hosted Drink Night that's over: { nightId, name, people, logs } (see nights.js; passed in as `nights`).
              Its drinks don't also make a same-place recap.
   Logs kept off the feed (offFeed) never show. The feed never shows amounts: how much is a personal stat. */
import { itemById, resolveId, originName } from "./catalog.js";
import { resolvePlace, SAME_NIGHT_MS } from "./logs.js";
import { rankVariants, madeVariants, asItem } from "./variants.js";
import { nightItems } from "./nights.js";

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

/* Crowns that stuck: a change of hands shows in the feed only if the crown stayed put for CROWN_SETTLE_MS, or it's
   the latest change for that crown. Early on crowns swap back and forth every few drinks; this keeps that out. */
export const CROWN_SETTLE_MS = 24 * 3600000;
export function settledCrowns(changes) {
  const byCrown = new Map();
  for (const c of [...changes].sort((a, b) => a.at - b.at)) {
    if (!byCrown.has(c.crown)) byCrown.set(c.crown, []);
    byCrown.get(c.crown).push(c);
  }
  const out = [];
  for (const list of byCrown.values()) list.forEach((c, n) => {
    const next = list[n + 1];
    if (!next || next.at - c.at >= CROWN_SETTLE_MS) out.push(c);
  });
  return out;
}

/* Everything in the feed, newest first. `ratings` is everyone's ratings (ratings.allRatings); `drinks` the drinks
   members added (store.drinks). */
export function feedItems({ logs = [], ratings = [], drinks = [], places = [], crowns = [], nights = [], now = Date.now() }) {
  const items = [...sessions(logs, places)];
  for (const r of ratings) if (!r.fromLog && r.review) items.push({ type: "review", uid: r.uid, at: r.at, rating: r });
  const bases = new Set(logs.filter(l => l.variantId).map(l => (itemById("variant", l.variantId) || {}).base).filter(Boolean));
  for (const base of bases) for (const x of madeVariants(base, logs)) {
    items.push({ type: "variant", uid: x.item.data.by, at: x.item.data.at || 0, variantId: x.item.id, base });
  }
  items.push(...houseChanges(logs, ratings));
  for (const d of drinks) if (!d.mergedInto && d.by && d.at) items.push({ type: "added", uid: d.by, at: d.at, drinkId: d.id });
  const hosted = nightItems(nights, logs, now), inNight = new Set(hosted.flatMap(n => n.logs.map(l => l.id)));
  items.push(...firsts(logs), ...recaps(logs, places, now).filter(r => !r.logs.some(l => inNight.has(l.id))), ...hosted, ...settledCrowns(crowns));
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
  if (item.type === "first") return [item.cat];
  if (item.type === "recap" || item.type === "night") return item.logs.map(l => cat(l.kind, l.drinkId));
  return [];
}

/* Filters: who (a uid, or "" for everyone), cat (a category id or ""), photos (only drinks with a photo), and the
   last `days` days. A session filtered by category or photos keeps only the drinks that match. */
export function filterFeed(items, { who = "", cat = "", photos = false, days = FEED_DAYS, now = Date.now() } = {}) {
  const from = now - days * DAY, out = [];
  for (const it of items) {
    if (it.at < from || (who && (it.type === "recap" || it.type === "night" ? !it.people.includes(who) : it.uid !== who))) continue;
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

/* ---------- Cheers and comments ---------- */
/* A feed item's post id, which cheers and comments point at: s~<a night's first log>, r~<rating>, v~<variant>,
   h~<variant crowned House Pour>, a~<drink added>. A night keeps its id as more drinks join it. */
export function postId(item) {
  switch (item.type) {
    case "session": return `s~${item.logs[item.logs.length - 1].id}`;
    case "review": return `r~${item.rating.docId || item.rating.id || `${item.rating.uid}_${item.rating.kind}_${item.rating.drinkId}`}`;
    case "variant": return `v~${item.variantId}`;
    case "house": return `h~${item.variantId}`;
    case "added": return `a~${item.drinkId}`;
    case "first": return `f~${item.logId}_${item.what}`;
    case "recap": return `n~${item.logs[item.logs.length - 1].id}`;
    case "crown": return `c~${item.crown}_${item.at}_${item.uid}`;
    case "night": return `d~${item.nightId}`;
    default: return "";
  }
}

/* A cheer's document id: one per person per post. */
export const cheerId = (post, uid) => `${post}|${uid}`;

/* Who cheered a post, oldest first: [uid]. */
export const cheersOn = (cheers, post) => cheers.filter(c => c.post === post).sort((a, b) => a.at - b.at).map(c => c.uid);

/* A post's comments, oldest first. */
export const commentsOn = (comments, post) => comments.filter(c => c.post === post).sort((a, b) => a.at - b.at);

export const MAX_COMMENT = 300;
export const cleanComment = s => String(s || "").trim().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").slice(0, MAX_COMMENT);

/* ---------- Firsts and milestones ---------- */
// Firsts start counting after someone's first few drinks, so a new member's first week isn't all "first lager".
export const FIRSTS_AFTER = 5;
// Milestones are about variety, never volume: different drinks and different styles tried.
export const DRINK_MILESTONES = [10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000];
export const STYLE_MILESTONES = [10, 25, 50, 75, 100, 150, 200];

/* Where a drink is from, as a country: Canadian provinces count as Canada; Scotland, England, Wales and Northern
   Ireland count as their own. */
export const countryOf = code => !code ? null : code.startsWith("CA-") ? "CA" : code;

/* Everyone's firsts and milestones, from their logs in time order: a first style or a first country (after their
   first FIRSTS_AFTER drinks), and 10, 25, 50... different drinks or styles tried. Drinks kept off the feed count
   toward them but don't post. [{ type: "first", uid, at, logId, what, label, n?, cat }] */
export function firsts(logs) {
  const out = [], by = new Map();
  for (const l of [...logs].sort((a, b) => a.at - b.at)) {
    const item = itemById(l.kind, l.drinkId);
    if (!item || !item.style) continue;
    if (!by.has(l.uid)) by.set(l.uid, { n: 0, drinks: new Set(), styles: new Set(), countries: new Set() });
    const me = by.get(l.uid), post = (what, label, n) => {
      if (!l.offFeed) out.push({ type: "first", uid: l.uid, at: l.at, logId: l.id, what, label, cat: item.category.id, ...(n ? { n } : {}) });
    };
    const settled = me.n >= FIRSTS_AFTER;
    me.n++;
    const key = `${l.kind}:${item.id}`, country = l.kind === "drink" ? countryOf(item.data.origin) : null;
    if (!me.styles.has(item.style.id)) {
      me.styles.add(item.style.id);
      if (STYLE_MILESTONES.includes(me.styles.size)) post("styles", `${me.styles.size} different styles`, me.styles.size);
      else if (settled) post("style", item.style.name);
    }
    if (country && !me.countries.has(country)) {
      me.countries.add(country);
      if (settled) post("country", originName(country) || country);
    }
    if (!me.drinks.has(key)) {
      me.drinks.add(key);
      if (DRINK_MILESTONES.includes(me.drinks.size)) post("drinks", `${me.drinks.size} different drinks`, me.drinks.size);
    }
  }
  return out;
}

/* ---------- Night recaps and who's out ---------- */
/* Nights at one place with two or more people, once they're over (6 hours after the last drink): who was there,
   every drink (newest first) and when it started. Drinks kept off the feed are left out.
   [{ type: "recap", uid (whoever logged first), people, placeId, logs, start, at (the last drink) }] */
export function recaps(logs, places = [], now = Date.now()) {
  const out = [], at = new Map();
  for (const l of logs.filter(l => !l.offFeed && l.placeId).sort((a, b) => a.at - b.at)) {
    const place = placeKey(places, l.placeId);
    const cur = at.get(place);
    if (cur && l.at - cur.at < SAME_NIGHT_MS) { cur.logs.unshift(l); cur.at = l.at; continue; }
    const night = { type: "recap", placeId: place, logs: [l], start: l.at, at: l.at };
    at.set(place, night);
    out.push(night);
  }
  return out.filter(n => now - n.at >= SAME_NIGHT_MS).map(n => {
    const people = [...new Set([...n.logs].reverse().map(l => l.uid))];
    return { ...n, uid: people[0], people };
  }).filter(n => n.people.length >= 2);
}

/* A recap's top drink: the one logged most that night (ties: the first one had). { kind, drinkId, count } or null. */
export function topOfNight(night) {
  const counts = new Map();
  for (const l of [...night.logs].reverse()) {
    const k = `${l.kind}|${resolveId(l.kind, l.drinkId)}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const [k, count] = [...counts].sort((a, b) => b[1] - a[1])[0] || [];
  if (!k || count < 2) return null;
  const [kind, drinkId] = k.split("|");
  return { kind, drinkId, count };
}

// "Out now" is anyone who logged something in the last 2 hours.
export const OUT_NOW_MS = 2 * 3600000;

/* Who's out right now: everyone else whose latest drink (not kept off the feed) was in the last 2 hours, and where.
   Newest first: [{ uid, placeId, at }] */
export function outNow(logs, places, me, now = Date.now()) {
  const latest = new Map();
  for (const l of logs) {
    if (l.offFeed || l.uid === me || l.at > now || now - l.at > OUT_NOW_MS) continue;
    if (!latest.has(l.uid) || latest.get(l.uid).at < l.at) latest.set(l.uid, l);
  }
  return [...latest.values()].sort((a, b) => b.at - a.at).map(l => ({ uid: l.uid, placeId: placeKey(places, l.placeId) || null, at: l.at }));
}
