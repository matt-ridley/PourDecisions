/* Alerts: what happened to you while you were away. Cheers and comments on your posts, replies on posts you commented
   on, friends making your cocktail variants (or a drink for you), ratings of your variants, and House Pours won or lost.
   Worked out from what every phone already has, so they cost no extra reads.
   Pure functions (no screen or Firebase code), so they can be tested with node.

   An alert: { kind, at, from: [uid, ...] (newest first), post?, text?, variantId?, logId?, rating? }
     cheer    cheers on your post (one alert per post, everyone who cheered)
     comment  a comment on your post            reply  a comment on a post you commented on
     made     a friend made your variant        madeFor  a friend made a drink for you
     rated    a friend rated your variant       houseWon / houseLost  your variant won or lost the House Pour */
import { itemById, resolveId } from "./catalog.js";
import { houseChanges } from "./feed.js";

export const ALERT_DAYS = 30;
const DAY = 86400000;

export function alertsFor(me, { logs = [], cheers = [], comments = [], ratings = [], now = Date.now(), days = ALERT_DAYS } = {}) {
  const from = now - days * DAY, out = [];
  const recent = x => x.at >= from && x.at <= now + 600000;
  const mineVariant = id => { const v = id && itemById("variant", id); return v && v.data.by === me ? v : null; };

  // Cheers on your posts: one alert per post, newest cheer first.
  const byPost = new Map();
  for (const c of cheers.filter(c => c.to === me && c.uid !== me && recent(c)).sort((a, b) => b.at - a.at)) {
    if (!byPost.has(c.post)) byPost.set(c.post, { kind: "cheer", post: c.post, at: c.at, from: [] });
    byPost.get(c.post).from.push(c.uid);
  }
  out.push(...byPost.values());

  // Comments on your posts, and replies on posts you commented on (after you did).
  const myFirst = new Map();
  for (const c of comments) if (c.uid === me && (!myFirst.has(c.post) || myFirst.get(c.post) > c.at)) myFirst.set(c.post, c.at);
  for (const c of comments) {
    if (c.uid === me || !recent(c)) continue;
    if (c.to === me) out.push({ kind: "comment", post: c.post, at: c.at, from: [c.uid], text: c.text });
    else if (myFirst.has(c.post) && c.at > myFirst.get(c.post)) out.push({ kind: "reply", post: c.post, at: c.at, from: [c.uid], text: c.text });
  }

  // Your variants made by friends, and drinks friends made for you.
  for (const l of logs) {
    if (!recent(l) || l.offFeed) continue;
    const maker = l.madeBy || l.uid;
    if (l.uid === me && l.madeBy && l.madeBy !== me) out.push({ kind: "madeFor", at: l.at, from: [l.madeBy], logId: l.id });
    else if (maker !== me && mineVariant(l.variantId)) out.push({ kind: "made", at: l.at, from: [maker], logId: l.id, variantId: resolveId("variant", l.variantId) });
  }

  // Ratings of your variants.
  for (const r of ratings) {
    if (r.kind !== "variant" || r.uid === me || !recent(r) || !mineVariant(r.drinkId)) continue;
    out.push({ kind: "rated", at: r.at, from: [r.uid], variantId: r.drinkId, rating: r.rating });
  }

  // House Pours: won when your variant takes the crown, lost when someone else's takes it from yours.
  const changes = houseChanges(logs, ratings), last = new Map();
  for (const h of changes.sort((a, b) => a.at - b.at)) {
    const prev = last.get(h.base);
    if (recent(h)) {
      if (h.uid === me && (!prev || prev.uid !== me)) out.push({ kind: "houseWon", at: h.at, from: [], variantId: h.variantId });
      if (prev && prev.uid === me && h.uid !== me) out.push({ kind: "houseLost", at: h.at, from: [h.uid], variantId: h.variantId });
    }
    last.set(h.base, h);
  }
  return out.sort((a, b) => b.at - a.at);
}

/* How many alerts are new since you last looked (seenAt: epoch ms, or 0 for never). */
export const unreadCount = (alerts, seenAt = 0) => alerts.filter(a => a.at > (seenAt || 0)).length;

