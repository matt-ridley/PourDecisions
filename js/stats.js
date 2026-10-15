/* Variety stats: how many different drinks, styles, families, countries and categories each person has tried, and a
   variety score for the group board. Worked out from the logs every phone already has.
   Pure functions (no screen or Firebase code), so they can be tested with node.

   The competition is variety, never volume: the score only grows by trying something new. How much someone drinks is
   a personal stat, shown only to them (volumeOf). Drinks kept off the feed still count. */
import { itemById } from "./catalog.js";
import { CATEGORIES } from "./catalog/styles.js";
import { ORIGINS } from "./catalog/drinks.js";
import { countryOf } from "./feed.js";
import { STANDARD_DRINK_ML } from "./units.js";

// Points for each new thing tried.
export const POINTS = { drink: 1, style: 3, family: 5, country: 5, category: 10 };

/* What a log counts as: the drink (a merged duplicate counts as the one kept; a cocktail variant as its cocktail), its
   style, family ("cat/fam", since family ids can repeat across categories), category and country. Null when the drink
   is gone from the list. */
export function countsOf(log) {
  const item = itemById(log.kind, log.drinkId);
  if (!item || !item.style) return null;
  return { drink: `${item.kind}:${item.id}`, style: item.style.id, family: `${item.category.id}/${item.family.id}`,
    category: item.category.id, country: item.kind === "drink" ? countryOf(item.data.origin) : null };
}

/* One person's variety: sets of what they've tried, styles per category, and their score. Pass only their logs.
   { drinks, styles, families, countries, categories (Sets), byCategory: Map(cat -> Set of styles), score, firstAt } */
export function varietyOf(logs) {
  const v = { drinks: new Set(), styles: new Set(), families: new Set(), countries: new Set(), categories: new Set(), byCategory: new Map() };
  for (const l of logs) {
    const c = countsOf(l);
    if (!c) continue;
    v.drinks.add(c.drink); v.styles.add(c.style); v.families.add(c.family); v.categories.add(c.category);
    if (c.country) v.countries.add(c.country);
    if (!v.byCategory.has(c.category)) v.byCategory.set(c.category, new Set());
    v.byCategory.get(c.category).add(c.style);
  }
  v.score = scoreOf(v);
  return v;
}

export const scoreOf = v => v.drinks.size * POINTS.drink + v.styles.size * POINTS.style + v.families.size * POINTS.family
  + v.countries.size * POINTS.country + v.categories.size * POINTS.category;

/* The group board: everyone in `uids` by variety score, then most styles, then most drinks.
   [{ uid, score, drinks, styles, families, countries, categories, rank }] (ties share a rank) */
export function board(logs, uids) {
  const rows = uids.map(uid => {
    const v = varietyOf(logs.filter(l => l.uid === uid));
    return { uid, score: v.score, drinks: v.drinks.size, styles: v.styles.size, families: v.families.size, countries: v.countries.size, categories: v.categories.size };
  }).sort((a, b) => b.score - a.score || b.styles - a.styles || b.drinks - a.drinks);
  rows.forEach((r, k) => { r.rank = k && r.score === rows[k - 1].score && r.styles === rows[k - 1].styles && r.drinks === rows[k - 1].drinks ? rows[k - 1].rank : k + 1; });
  return rows;
}

/* How much there is to try: styles, families and categories in the list, styles per category, and countries. */
export function totals() {
  const fams = CATEGORIES.flatMap(c => c.families);
  return {
    styles: fams.reduce((n, f) => n + f.styles.length, 0), families: fams.length, categories: CATEGORIES.length,
    countries: new Set(Object.keys(ORIGINS).map(countryOf)).size,
    byCategory: new Map(CATEGORIES.map(c => [c.id, c.families.reduce((n, f) => n + f.styles.length, 0)])),
  };
}

/* ---------- Personal: how much (only ever shown to the person themselves) ---------- */
const WEEK = 7 * 86400000;
const startOfWeek = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }; // Monday
const startOfMonth = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const startOfYear = t => new Date(new Date(t).getFullYear(), 0, 1).getTime();

// Standard drinks are added up exactly and rounded once, so ten 1.04s make 10.4, not 10.
const exactStd = ls => ls.reduce((t, l) => t + (l.ml > 0 && l.abv >= 0 ? l.ml * l.abv / 100 / STANDARD_DRINK_ML : 0), 0);
const r1 = n => Math.round(n * 10) / 10;

/* Drinks and standard drinks this week (from Monday), this month and this year, and the weekly average over the last 8
   full weeks. Pass only the person's own logs. { week, month, year, avg8: { drinks, std } } */
export function volumeOf(logs, now = Date.now()) {
  const sum = from => {
    const ls = logs.filter(l => l.at >= from && l.at <= now);
    return { drinks: ls.length, std: r1(exactStd(ls)) };
  };
  const wk = startOfWeek(now), past = logs.filter(l => l.at >= wk - 8 * WEEK && l.at < wk);
  return { week: sum(wk), month: sum(startOfMonth(now)), year: sum(startOfYear(now)),
    avg8: { drinks: r1(past.length / 8), std: r1(exactStd(past) / 8) } };
}

/* ---------- Passports and Try next ---------- */

/* Who in the group tried each style and each country first: { styles: Map(id -> { uid, at }), countries: Map }. */
export function firstsInGroup(logs) {
  const styles = new Map(), countries = new Map();
  for (const l of [...logs].sort((a, b) => a.at - b.at)) {
    const c = countsOf(l);
    if (!c) continue;
    if (!styles.has(c.style)) styles.set(c.style, { uid: l.uid, at: l.at });
    if (c.country && !countries.has(c.country)) countries.set(c.country, { uid: l.uid, at: l.at });
  }
  return { styles, countries };
}

/* Every country in the list, A to Z, with how many drinks in the list come from it: [{ code, name, drinks }]. */
export function countryList(items) {
  const n = new Map();
  for (const i of items) if (i.kind === "drink" && i.data.origin) { const c = countryOf(i.data.origin); n.set(c, (n.get(c) || 0) + 1); }
  return [...new Set(Object.keys(ORIGINS).map(countryOf))].map(code => ({ code, name: ORIGINS[code] || code, drinks: n.get(code) || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* A flag for a country code: two letters become a flag; Scotland, England and Wales get theirs; else a plain one. */
const TAG = s => String.fromCodePoint(0x1F3F4, ...[...s].map(ch => 0xE0000 + ch.charCodeAt(0)), 0xE007F);
const SUB_FLAGS = { "GB-SCT": TAG("gbsct"), "GB-ENG": TAG("gbeng"), "GB-WLS": TAG("gbwls"), "GB-NIR": "🇬🇧" };
export const flagOf = code => SUB_FLAGS[code] || (/^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65)) : "🏳️");

/* Try next: styles you haven't tried, the group's favourites first (best average rating of drinks in that style),
   then the ones most people in the group have tried. Each comes with a drink to try: the group's best-rated in that
   style, or else the one most logged. `ratings` is everyone's ratings (ratings.allRatings); `items` the drink list.
   [{ style, avg, rated, triedBy, drink }] */
export function tryNext(logs, ratings, uid, items, n = 5) {
  const mine = new Set(), triedBy = new Map(), logged = new Map();
  for (const l of logs) {
    const c = countsOf(l);
    if (!c) continue;
    if (l.uid === uid) mine.add(c.style);
    if (!triedBy.has(c.style)) triedBy.set(c.style, new Set());
    triedBy.get(c.style).add(l.uid);
    logged.set(c.drink, (logged.get(c.drink) || 0) + 1);
  }
  const byDrink = new Map();
  for (const r of ratings) {
    if (r.kind === "variant") continue;
    const k = `${r.kind}:${r.drinkId}`, d = byDrink.get(k) || { sum: 0, n: 0 };
    d.sum += r.rating; d.n++; byDrink.set(k, d);
  }
  const styles = new Map();
  for (const i of items) {
    if (!i.style || mine.has(i.style.id)) continue;
    const k = `${i.kind}:${i.id}`, r = byDrink.get(k);
    const s = styles.get(i.style.id) || { style: i.style.id, sum: 0, rated: 0, best: null, bestAvg: -1, most: null, mostN: 0 };
    if (r) {
      s.sum += r.sum; s.rated += r.n;
      if (r.sum / r.n > s.bestAvg) { s.bestAvg = r.sum / r.n; s.best = i; }
    }
    if ((logged.get(k) || 0) > s.mostN) { s.mostN = logged.get(k); s.most = i; }
    styles.set(i.style.id, s);
  }
  return [...styles.values()]
    .map(s => ({ style: s.style, avg: s.rated ? Math.round(s.sum / s.rated * 10) / 10 : null, rated: s.rated,
      triedBy: (triedBy.get(s.style) || new Set()).size, drink: s.best || s.most }))
    .filter(s => s.drink && (s.rated || s.triedBy))
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0) || b.triedBy - a.triedBy || b.rated - a.rated)
    .slice(0, n);
}
