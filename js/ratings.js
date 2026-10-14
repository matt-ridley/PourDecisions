/* Ratings and reviews: one rating per person per drink, kept apart from logs so a drink is rated once (and changed
   whenever), not every time it's poured. A rating has stars (0.5 to 5), optional flavour tags and an optional review.
   Pure functions (no screen or Firebase code), so they can be tested with node.

   Before 0.8.0 the stars and flavours were on each log. Until someone rates a drink the new way, their latest rated
   log of it counts as their rating, so nothing rated earlier is lost. */
import { resolveId } from "./catalog.js";

/* The rating document's id: one per person per drink. */
export const ratingId = (uid, kind, drinkId) => `${uid}_${kind}_${drinkId}`;

const key = (uid, kind, drinkId) => `${uid}|${kind}|${resolveId(kind, drinkId)}`;

/* Everyone's ratings: rating documents, plus older log ratings for drinks a person hasn't rated the new way.
   A merged duplicate counts as the drink kept; if someone rated both, their newest rating wins.
   Returns [{ uid, kind, drinkId (the drink kept), rating, tags, review, at, fromLog, docId (the rating document's id) }]. */
export function allRatings(ratings, logs) {
  const out = new Map();
  const add = (r, fromLog) => {
    const k = key(r.uid, r.kind, r.drinkId), old = out.get(k);
    if (old && !old.fromLog && fromLog) return; // a real rating beats any old log rating
    if (old && old.fromLog === fromLog && old.at >= r.at) return;
    out.set(k, { uid: r.uid, kind: r.kind, drinkId: resolveId(r.kind, r.drinkId), rating: r.rating, tags: r.tags || [],
      review: fromLog ? "" : r.review || "", at: r.at, fromLog, docId: fromLog ? null : r.id || null });
  };
  for (const r of ratings) if (r.rating) add(r, false);
  for (const l of logs) if (l.rating) add(l, true);
  return [...out.values()];
}

/* This person's rating of a drink, or null. */
export function ratingOf(list, uid, kind, drinkId) {
  const want = resolveId(kind, drinkId);
  return list.find(r => r.uid === uid && r.kind === kind && r.drinkId === want) || null;
}

const round1 = n => Math.round(n * 10) / 10;

/* The group on one drink: average stars, how many rated it, the most-picked flavours ([[tag, count]], top 5) and
   the reviews with text, newest first. */
export function drinkSummary(list, kind, drinkId) {
  const want = resolveId(kind, drinkId);
  const mine = list.filter(r => r.kind === kind && r.drinkId === want);
  const tags = new Map();
  for (const r of mine) for (const t of r.tags) tags.set(t, (tags.get(t) || 0) + 1);
  return {
    count: mine.length,
    avg: mine.length ? round1(mine.reduce((t, r) => t + r.rating, 0) / mine.length) : null,
    tags: [...tags].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5),
    reviews: mine.filter(r => r.review).sort((a, b) => b.at - a.at),
  };
}

/* The group's top-rated drinks: [{ kind, drinkId, avg, count }], best average first, then the most ratings.
   `keep(kind, drinkId)` can leave some out (a category filter, or drinks no longer in the list). */
export function topRated(list, keep = () => true) {
  const by = new Map();
  for (const r of list) {
    const k = `${r.kind}|${r.drinkId}`;
    if (!by.has(k)) by.set(k, { kind: r.kind, drinkId: r.drinkId, sum: 0, count: 0 });
    const d = by.get(k);
    d.sum += r.rating; d.count++;
  }
  return [...by.values()].filter(d => keep(d.kind, d.drinkId))
    .map(d => ({ kind: d.kind, drinkId: d.drinkId, avg: round1(d.sum / d.count), count: d.count }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count);
}

/* Drinks you logged in the last `hours` but haven't rated: your newest log of each, newest first. For "How was it?". */
export function toRate(list, logs, uid, now = Date.now(), hours = 24) {
  const seen = new Set(), out = [];
  for (const l of logs.filter(x => x.uid === uid && x.at <= now && now - x.at < hours * 3600000).sort((a, b) => b.at - a.at)) {
    // A cocktail variant is rated as the variant, not the cocktail it came from.
    const [kind, id] = l.variantId ? ["variant", l.variantId] : [l.kind, l.drinkId];
    const k = key(uid, kind, id);
    if (seen.has(k)) continue;
    seen.add(k);
    if (!ratingOf(list, uid, kind, id)) out.push(l);
  }
  return out;
}
