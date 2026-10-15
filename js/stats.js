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
